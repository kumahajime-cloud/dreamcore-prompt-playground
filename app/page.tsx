'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const PRESET_PROMPTS = {
  default: {
    name: 'デフォルト',
    prompt: 'あなたは親切で協力的なアシスタントです。ユーザーの質問に丁寧に答えてください。',
  },
  game_master: {
    name: 'ゲームマスター',
    prompt: 'あなたは創造的なゲームマスターです。プレイヤーを魅力的なストーリーに引き込み、選択肢を提示して物語を進行させてください。',
  },
  rpg_npc: {
    name: 'RPG NPC',
    prompt: 'あなたはRPGゲームのキャラクターです。設定された性格とバックストーリーに基づいて、プレイヤーと自然な会話をしてください。',
  },
  puzzle_creator: {
    name: 'パズル作成者',
    prompt: 'あなたは謎解きやパズルを作成する専門家です。ユーザーに挑戦的で楽しい問題を提供してください。',
  },
  debug_helper: {
    name: 'デバッグヘルパー',
    prompt: 'あなたはデバッグの専門家です。コードの問題を分析し、解決策を提案してください。',
  },
};

export default function Home() {
  const [systemPrompt, setSystemPrompt] = useState(PRESET_PROMPTS.default.prompt);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('default');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemPrompt,
          messages: [...messages, userMessage],
        }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.content,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'エラーが発生しました。もう一度お試しください。',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([]);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* 左パネル: システムプロンプト編集 */}
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          システムプロンプト
        </h2>

        {/* プリセット選択 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            プリセット
          </label>
          <select
            value={selectedPreset}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            {Object.entries(PRESET_PROMPTS).map(([key, preset]) => (
              <option key={key} value={key}>
                {preset.name}
              </option>
            ))}
          </select>
        </div>

        {/* プロンプト編集エリア */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            プロンプトを編集
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="w-full h-64 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
            placeholder="システムプロンプトを入力..."
          />
        </div>

        <div className="space-y-2">
          <button
            onClick={handleReset}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            会話をリセット
          </button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-md">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
            使い方
          </h3>
          <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
            <li>• プリセットからテンプレートを選択</li>
            <li>• システムプロンプトを自由に編集</li>
            <li>• 右側のチャットでAIの動作を確認</li>
            <li>• 会話をリセットして新しいテストを開始</li>
          </ul>
        </div>
      </div>

      {/* 右パネル: チャット */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
        <div className="border-b border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            チャット
          </h2>
        </div>

        {/* メッセージ表示エリア */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
              メッセージを送信して会話を始めましょう
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-3xl px-4 py-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
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
          {loading && (
            <div className="flex justify-start">
              <div className="max-w-3xl px-4 py-3 rounded-lg bg-gray-200 dark:bg-gray-700">
                <div className="text-gray-600 dark:text-gray-400">
                  考え中...
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 入力エリア */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="メッセージを入力..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              送信
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
