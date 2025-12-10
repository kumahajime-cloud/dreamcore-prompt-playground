import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { applyDiffToContent, DiffTextToObject, parseDiffContent, isDiffContent } from '@/lib/game-utils';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages, systemPrompt, currentHtml } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
    system: systemPrompt,
    messages,
    tools: {
      createHtml: tool({
        description: 'Create a new HTML game from scratch. Use this when the user requests a completely new game.',
        parameters: z.object({
          title: z.string().describe('Game title in English'),
          html: z.string().describe('Complete HTML document with game code'),
        }),
        // @ts-ignore
        execute: async ({ title, html }: { title: string; html: string }) => {
          console.log('Creating game:', title);
          return {
            success: true,
            title,
            html,
            action: 'create',
          };
        },
      }),

      updateHtml: tool({
        description: 'Update an existing HTML game using unified diff format. The AI must output ONLY diff format, not full code.',
        parameters: z.object({
          title: z.string().describe('Game title in English'),
          diff: z.string().describe('Unified diff format changes'),
        }),
        // @ts-ignore
        execute: async ({ title, diff }: { title: string; diff: string }) => {
          console.log('Updating game:', title);

          if (!currentHtml) {
            return {
              success: false,
              error: 'No existing HTML to update',
              action: 'update',
            };
          }

          try {
            // Parse diff content
            const parsedDiff = parseDiffContent(diff);
            const diffObject = DiffTextToObject(parsedDiff);

            // Apply diff to current HTML
            const updatedHtml = applyDiffToContent(currentHtml, diffObject);

            return {
              success: true,
              title,
              html: updatedHtml,
              action: 'update',
            };
          } catch (error) {
            console.error('Error applying diff:', error);
            return {
              success: false,
              error: 'Failed to apply diff',
              action: 'update',
            };
          }
        },
      }),

      bugfixHtml: tool({
        description: 'Fix bugs by regenerating the complete HTML game. Use when FIXBUG or バグ修正 is mentioned.',
        parameters: z.object({
          title: z.string().describe('Game title in English'),
          html: z.string().describe('Complete fixed HTML document'),
        }),
        // @ts-ignore
        execute: async ({ title, html }: { title: string; html: string }) => {
          console.log('Fixing game:', title);
          return {
            success: true,
            title,
            html,
            action: 'bugfix',
          };
        },
      }),

      manageHtml: tool({
        description: 'Automatically create or update HTML game based on context. Use this for general game creation and updates.',
        parameters: z.object({
          title: z.string().describe('Game title in English'),
          content: z.string().describe('Either complete HTML or unified diff format'),
        }),
        // @ts-ignore
        execute: async ({ title, content }: { title: string; content: string }) => {
          console.log('Managing game:', title);

          // Determine if content is diff or full HTML
          if (currentHtml && isDiffContent(content)) {
            // Update existing game with diff
            try {
              const parsedDiff = parseDiffContent(content);
              const diffObject = DiffTextToObject(parsedDiff);
              const updatedHtml = applyDiffToContent(currentHtml, diffObject);

              return {
                success: true,
                title,
                html: updatedHtml,
                action: 'update',
              };
            } catch (error) {
              console.error('Error applying diff:', error);
              return {
                success: false,
                error: 'Failed to apply diff',
                action: 'update',
              };
            }
          } else {
            // Create new game
            return {
              success: true,
              title,
              html: content,
              action: 'create',
            };
          }
        },
      }),
    },
    // @ts-ignore
    maxSteps: 5,
  });

  return result.toTextStreamResponse();
}
