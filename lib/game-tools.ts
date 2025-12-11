import { DataStreamWriter, tool, streamText, smoothStream } from 'ai';
import { z } from 'zod';
import { createVertex } from '@ai-sdk/google-vertex';
import { applyDiffToContent, DiffTextToObject, parseDiffContent, parseHtmlContent } from './game-utils';
import {
  dreamcoreCreate,
  dreamcoreUpdate,
  dreamcoreBugfix,
  dreamcoreCodeRules,
  dreamcoreGameDesign
} from './dreamcore-prompts';

const vertex = createVertex({
  baseURL: "https://aiplatform.googleapis.com/v1/projects/dreamcore-472900/locations/global/publishers/google",
  location: "global",
  project: "dreamcore-472900",
  googleAuthOptions: {
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
  },
});

// Use DreamCore's actual prompts - properly combined like in DreamCore
const updatePrompt = (language: 'ja' | 'en' = 'en') => dreamcoreUpdate + '\n\n' + dreamcoreCodeRules;
const createPrompt = (language: 'ja' | 'en' = 'en') => dreamcoreCreate + '\n\n' + dreamcoreCodeRules + '\n\n' + dreamcoreGameDesign;
const bugfixPrompt = (language: 'ja' | 'en' = 'en') => dreamcoreBugfix + '\n\n' + dreamcoreCodeRules + '\n\n' + dreamcoreGameDesign;

interface ToolProps {
  dataStream: DataStreamWriter;
  messages: any[];
  currentHtml?: string;
  language?: 'ja' | 'en';
}

export const manageHtml = ({ dataStream, messages, currentHtml, language = 'en' }: ToolProps) =>
  tool({
    description:
      'Creates or updates an HTML document. If currentHtml is provided, it updates the document, otherwise creates a new one.',
    parameters: z.object({
      title: z.string().describe("The title of the game in the creator's preferred language"),
      gameType: z
        .enum(['action', 'puzzle', 'strategy', 'rpg', 'simulation'])
        .optional()
        .describe('Game type (only used for new documents)'),
    }),
    execute: async ({ title, gameType }: { title: string; gameType?: string }) => {
      console.log('manageHtml:title', title);
      console.log('manageHtml:currentHtml exists', !!currentHtml);

      // If currentHtml exists, update; otherwise create new
      if (currentHtml) {
        return updateExistingDocument({
          dataStream,
          messages,
          currentHtml,
          title,
          language,
        });
      }

      // Create new document
      return createNewDocument({
        dataStream,
        messages,
        title,
        gameType,
        language,
      });
    },
  });

async function updateExistingDocument({
  dataStream,
  messages,
  currentHtml,
  title,
  language = 'en',
}: {
  dataStream: DataStreamWriter;
  messages: any[];
  currentHtml: string;
  title: string;
  language?: 'ja' | 'en';
}) {
  // Only pass user messages to Gemini, not Claude's responses
  const userMessages = messages.filter(m => m.role === 'user');

  const input = [
    ...userMessages,
    {
      role: 'user',
      content: `
      title: ${title}
      prevHTML: ${currentHtml}
      `,
    },
  ] as any[];

  console.log('updateExistingDocument: calling Gemini');
  console.log('updateExistingDocument: user messages count:', userMessages.length);

  let diffContent = '';
  const { textStream } = await streamText({
    model: vertex('gemini-3-pro-preview') as any,
    system: updatePrompt(language),
    messages: input,
    experimental_transform: smoothStream({ chunking: 'word' }),
    maxSteps: 5,
    experimental_continueSteps: true,
  });

  dataStream.writeData({
    type: 'tool-name',
    content: 'manage-html',
  });

  dataStream.writeData({
    type: 'title',
    content: title,
  });

  dataStream.writeData({
    type: 'clear',
    content: '',
  });

  for await (const chunk of textStream) {
    const processedChunk = chunk.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"');
    diffContent += processedChunk;
    dataStream.writeData({
      type: 'html-delta',
      content: processedChunk,
    });
  }

  console.log('updateExistingDocument: diff received, length:', diffContent.length);

  try {
    const parsedDiff = parseDiffContent(diffContent);
    const diffObject = DiffTextToObject(parsedDiff);
    const updatedContent = applyDiffToContent(currentHtml, diffObject);

    dataStream.writeData({ type: 'html', content: updatedContent });
    dataStream.writeData({ type: 'finish', content: '' });

    return {
      title,
      content: updatedContent,
      diffContent,
    };
  } catch (error) {
    console.error('Error applying diff:', error);
    // If diff fails, return original
    dataStream.writeData({ type: 'html', content: currentHtml });
    dataStream.writeData({ type: 'finish', content: '' });
    return {
      title,
      content: currentHtml,
      error: 'Failed to apply diff',
    };
  }
}

async function createNewDocument({
  dataStream,
  messages,
  title,
  gameType,
  language = 'en',
}: {
  dataStream: DataStreamWriter;
  messages: any[];
  title: string;
  gameType?: string;
  language?: 'ja' | 'en';
}) {
  // Only pass user messages to Gemini, not Claude's responses
  const userMessages = messages.filter(m => m.role === 'user');

  const input = [
    ...userMessages,
    {
      role: 'user',
      content: `
    title: ${title}
    gameType: ${gameType ?? 'none'}
    `,
    },
  ] as any[];

  console.log('createNewDocument: calling Gemini');
  console.log('createNewDocument: user messages count:', userMessages.length);

  let draftContent = '';

  try {
    const { textStream } = await streamText({
      model: vertex('gemini-3-pro-preview') as any,
      system: createPrompt(language),
      messages: input,
      maxSteps: 5,
      experimental_continueSteps: true,
      experimental_transform: smoothStream({ chunking: 'word' }),
    });

    console.log('createNewDocument: Gemini stream started');

  dataStream.writeData({
    type: 'title',
    content: title,
  });

  if (gameType) {
    dataStream.writeData({
      type: 'gameType',
      content: gameType,
    });
  }

  dataStream.writeData({
    type: 'clear',
    content: '',
  });

  for await (const chunk of textStream) {
    const processedChunk = chunk.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"');
    draftContent += processedChunk;

    dataStream.writeData({
      type: 'html-delta',
      content: processedChunk,
    });
  }

  console.log('createNewDocument: Stream completed, total length:', draftContent.length);

  // Remove code block markers
  const parsedContent = parseHtmlContent(draftContent);

  console.log('createNewDocument: HTML parsed, length:', parsedContent.length);
  console.log('createNewDocument: Raw content preview:', draftContent.substring(0, 500));
  console.log('createNewDocument: Parsed content preview:', parsedContent.substring(0, 500));
  console.log('createNewDocument: Has DOCTYPE:', parsedContent.includes('<!DOCTYPE html>'));
  console.log('createNewDocument: Has closing html tag:', parsedContent.includes('</html>'));
  console.log('createNewDocument: Has script tag:', parsedContent.includes('<script>'));
  console.log('createNewDocument: sending html event');

    dataStream.writeData({ type: 'html', content: parsedContent });
    dataStream.writeData({ type: 'finish', content: '' });

    return {
      title,
      content: parsedContent,
    };
  } catch (error) {
    console.error('createNewDocument: Error calling Gemini:', error);
    dataStream.writeData({ type: 'finish', content: '' });
    throw error;
  }
}

export const bugfixHtml = ({ dataStream, messages, currentHtml, language = 'en' }: ToolProps) =>
  tool({
    description:
      "Bugfix an existing HTML document. Generate a brand-new fixed HTML using the current code as reference. ONLY use this tool when the user's message contains 'FIXBUG' or 'バグ修正' - never use for regular game updates or modifications.",
    parameters: z.object({
      title: z.string().describe("the title of the game in the creator's preferred language"),
    }),
    execute: async ({ title }: { title: string }) => {
      if (!currentHtml) {
        throw new Error('No existing HTML to fix');
      }

      // Only pass user messages to Gemini, not Claude's responses
      const userMessages = messages.filter(m => m.role === 'user');

      const input = [
        ...userMessages,
        {
          role: 'user',
          content: `
        title: ${title}
        prevHTML: ${currentHtml}
        `,
        },
      ] as any[];

      console.log('bugfixHtml: calling Gemini');
      console.log('bugfixHtml: user messages count:', userMessages.length);

      let draftContent = '';
      const { textStream } = await streamText({
        model: vertex('gemini-3-pro-preview') as any,
        system: bugfixPrompt(language),
        messages: input,
        temperature: 1,
        maxSteps: 5,
        experimental_continueSteps: true,
        experimental_transform: smoothStream({ chunking: 'word' }),
      });

      dataStream.writeData({
        type: 'tool-name',
        content: 'bugfix-html',
      });
      dataStream.writeData({
        type: 'title',
        content: title,
      });
      dataStream.writeData({
        type: 'clear',
        content: '',
      });

      for await (const chunk of textStream) {
        const processedChunk = chunk.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"');
        draftContent += processedChunk;
        dataStream.writeData({
          type: 'html-delta',
          content: processedChunk,
        });
      }

      const parsedContent = parseHtmlContent(draftContent);

      dataStream.writeData({ type: 'html', content: parsedContent });
      dataStream.writeData({ type: 'finish', content: '' });

      return {
        title,
        content: parsedContent,
      };
    },
  });
