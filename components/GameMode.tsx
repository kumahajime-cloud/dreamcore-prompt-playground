'use client';

import { useState, useRef, useEffect } from 'react';
import { Message } from '@/lib/types';
import GamePreview from './GamePreview';
import {
  dreamcoreRegular,
  dreamcoreGameDesign,
  dreamcoreCodeRules,
  dreamcoreCreate,
  dreamcoreUpdate,
  dreamcoreBugfix,
} from '@/lib/dreamcore-prompts';

const PRESET_PROMPTS = {
  dreamcore_regular: {
    name: 'DreamCore: Regular',
    prompt: dreamcoreRegular,
  },
  dreamcore_game_design: {
    name: 'DreamCore: Game Design',
    prompt: dreamcoreGameDesign,
  },
  dreamcore_code_rules: {
    name: 'DreamCore: Code Rules',
    prompt: dreamcoreCodeRules,
  },
  dreamcore_create: {
    name: 'DreamCore: Create Game',
    prompt: dreamcoreCreate,
  },
  dreamcore_update: {
    name: 'DreamCore: Update Game',
    prompt: dreamcoreUpdate,
  },
  dreamcore_bugfix: {
    name: 'DreamCore: Bug Fix',
    prompt: dreamcoreBugfix,
  },
};

interface GameModeProps {
  systemPrompt: string;
  onClose: () => void;
}

export default function GameMode({ systemPrompt: initialSystemPrompt, onClose }: GameModeProps) {
  const [systemPrompt, setSystemPrompt] = useState(initialSystemPrompt);
  const [selectedPreset, setSelectedPreset] = useState('dreamcore_create');
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [currentHtml, setCurrentHtml] = useState('');
  const [gameTitle, setGameTitle] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt,
          messages: [...messages, userMessage],
          currentHtml,
        }),
      });

      if (!response.ok) throw new Error('API request failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('0:')) {
              try {
                const jsonStr = line.substring(2);
                const data = JSON.parse(jsonStr);

                // Handle custom data events
                if (data.type === 'title' && data.content) {
                  setGameTitle(data.content);
                } else if (data.type === 'html' && data.content) {
                  setCurrentHtml(data.content);
                }
                // Handle text content
                else if (data.content && typeof data.content === 'string') {
                  assistantContent += data.content;
                }
              } catch (e) {
                console.error('Parse error:', e);
              }
            }
          }
        }
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantContent || 'ゲームを生成しました。',
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'エラーが発生しました。',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handlePresetChange = (presetKey: string) => {
    setSelectedPreset(presetKey);
    const preset = PRESET_PROMPTS[presetKey as keyof typeof PRESET_PROMPTS];
    setSystemPrompt(preset.prompt);
  };

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          ゲーム生成モード
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPromptEditor(!showPromptEditor)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {showPromptEditor ? 'プロンプト非表示' : 'プロンプト編集'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            閉じる
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Prompt Editor (Collapsible) */}
        {showPromptEditor && (
          <div className="w-80 flex flex-col bg-gray-50 dark:bg-gray-900 border-r border-gray-700 p-4 overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              システムプロンプト
            </h2>

            {/* Preset Selection */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                プリセット
              </label>
              <select
                value={selectedPreset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-900 dark:text-white"
              >
                {Object.entries(PRESET_PROMPTS).map(([key, preset]) => (
                  <option key={key} value={key}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Prompt Text Area */}
            <div className="flex-1 flex flex-col">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                プロンプト編集
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm resize-none text-gray-900 dark:text-white"
                placeholder="システムプロンプトを入力..."
              />
            </div>
          </div>
        )}

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
                onChange={(e) => setInput(e.target.value)}
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
