'use client';

import { useState, useRef, useEffect } from 'react';
import { Message } from '@/lib/types';
import GamePreview from './GamePreview';
import { useChat } from 'ai/react';

interface GameModeProps {
  systemPrompt: string;
  onClose: () => void;
}

export default function GameMode({ systemPrompt, onClose }: GameModeProps) {
  const [currentHtml, setCurrentHtml] = useState('');
  const [gameTitle, setGameTitle] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/game',
    body: {
      systemPrompt,
      currentHtml,
    },
    onToolCall: ({ toolCall }) => {
      console.log('Tool called:', toolCall);

      // Handle tool results
      if (toolCall.toolName === 'createHtml' ||
          toolCall.toolName === 'updateHtml' ||
          toolCall.toolName === 'bugfixHtml' ||
          toolCall.toolName === 'manageHtml') {

        const args = toolCall.args as any;

        if (args.html) {
          setCurrentHtml(args.html);
          setGameTitle(args.title || 'Game');
        }
      }
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          ゲーム生成モード
        </h1>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          閉じる
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col border-r border-gray-700">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-800">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 mt-8">
                <p className="mb-2">AIにゲーム作成を依頼してください</p>
                <p className="text-sm">例: 「シンプルなブロック崩しゲームを作って」</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`mb-4 ${
                    message.role === 'user' ? 'text-right' : 'text-left'
                  }`}
                >
                  <div
                    className={`inline-block max-w-3xl px-4 py-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-white'
                    }`}
                  >
                    <div className="text-xs font-semibold mb-1 opacity-75">
                      {message.role === 'user' ? 'あなた' : 'AI'}
                    </div>
                    <div className="whitespace-pre-wrap">{message.content}</div>

                    {/* Show tool calls */}
                    {message.toolInvocations && message.toolInvocations.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-600 text-xs opacity-75">
                        {message.toolInvocations.map((tool: any, toolIndex: number) => (
                          <div key={toolIndex}>
                            🔧 {tool.toolName}
                            {tool.state === 'result' && tool.result.success && (
                              <span className="ml-2 text-green-400">✓ 成功</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="text-left mb-4">
                <div className="inline-block px-4 py-3 rounded-lg bg-gray-700">
                  <div className="text-gray-400">考え中...</div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="bg-gray-800 border-t border-gray-700 p-4">
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                placeholder="ゲームの指示を入力..."
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                送信
              </button>
            </form>
          </div>
        </div>

        {/* Game Preview Area */}
        <div className="flex-1 flex flex-col">
          <GamePreview html={currentHtml} title={gameTitle} />
        </div>
      </div>
    </div>
  );
}
