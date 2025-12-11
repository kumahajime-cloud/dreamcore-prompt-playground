import { createAnthropic } from '@ai-sdk/anthropic';
import { createDataStreamResponse, streamText, smoothStream } from 'ai';
import { manageHtml, bugfixHtml } from '@/lib/game-tools';
import { dreamcoreRegular } from '@/lib/dreamcore-prompts';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const maxDuration = 60;

// Helper function to detect bugfix requests
function isBugfixRequest(userMessage: string): boolean {
  const lowerMessage = userMessage.toLowerCase().trim();
  return (
    lowerMessage === 'fixbug' ||
    lowerMessage === 'バグ修正' ||
    lowerMessage.includes('fixbug') ||
    lowerMessage.includes('バグ修正')
  );
}

export async function POST(req: Request) {
  const { messages, systemPrompt, currentHtml } = await req.json();

  // Get the latest user message
  const latestMessage = messages[messages.length - 1];
  const isBugfix = latestMessage?.role === 'user' ? isBugfixRequest(latestMessage.content) : false;

  console.log('Game API: isBugfix =', isBugfix);
  console.log('Game API: currentHtml exists =', !!currentHtml);

  return createDataStreamResponse({
    execute: async (dataStream) => {
      // Determine which tools to make available
      const activeTools = isBugfix ? ['manageHtml', 'bugfixHtml'] : ['manageHtml'];

      console.log('Game API: activeTools =', activeTools);

      const result = streamText({
        model: anthropic('claude-sonnet-4-5-20250929'),
        system: systemPrompt || dreamcoreRegular,
        messages,
        maxSteps: 2,
        experimental_continueSteps: true,
        experimental_activeTools: activeTools,
        experimental_transform: smoothStream({ chunking: 'word' }),
        tools: {
          manageHtml: manageHtml({
            dataStream,
            messages,
            currentHtml,
            language: 'ja',
          }),
          bugfixHtml: bugfixHtml({
            dataStream,
            messages,
            currentHtml,
            language: 'ja',
          }),
        },
      });

      result.consumeStream();

      result.mergeIntoDataStream(dataStream, {
        sendReasoning: true,
        sendUsage: true,
      });
    },
    onError: (error) => {
      console.error('Game API error:', error);
      return 'An error occurred while generating the game.';
    },
  });
}
