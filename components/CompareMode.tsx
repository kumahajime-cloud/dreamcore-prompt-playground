'use client';

import { useState, useRef, useEffect } from 'react';
import { Message } from '@/lib/types';

interface CompareModeProps {
  onClose: () => void;
}

export default function CompareMode({ onClose }: CompareModeProps) {
  const [promptA, setPromptA] = useState('あなたは親切で協力的なアシスタントです。ユーザーの質問に丁寧に答えてください。');
  const [promptB, setPromptB] = useState('あなたは簡潔で効率的なアシスタントです。短く要点を押さえた回答をしてください。');
  const [messagesA, setMessagesA] = useState<Message[]>([]);
  const [messagesB, setMessagesB] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRefA = useRef<HTMLDivElement>(null);
  const messagesEndRefB = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRefA.current?.scrollIntoView({ behavior: 'smooth' });
    messagesEndRefB.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messagesA, messagesB]);

  const handleSendBoth = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input, timestamp: Date.now() };
    setMessagesA((prev) => [...prev, userMessage]);
    setMessagesB((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // 両方のプロンプトに同時にリクエスト
      const [responseA, responseB] = await Promise.all([
        fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemPrompt: promptA,
            messages: [...messagesA, userMessage],
          }),
        }),
        fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemPrompt: promptB,
            messages: [...messagesB, userMessage],
          }),
        }),
      ]);

      if (responseA.ok && responseB.ok) {
        const dataA = await responseA.json();
        const dataB = await responseB.json();

        const assistantMessageA: Message = {
          role: 'assistant',
          content: dataA.content,
          timestamp: Date.now(),
        };
        const assistantMessageB: Message = {
          role: 'assistant',
          content: dataB.content,
          timestamp: Date.now(),
        };

        setMessagesA((prev) => [...prev, assistantMessageA]);
        setMessagesB((prev) => [...prev, assistantMessageB]);
      } else {
        throw new Error('API request failed');
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'エラーが発生しました。',
        timestamp: Date.now(),
      };
      setMessagesA((prev) => [...prev, errorMessage]);
      setMessagesB((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessagesA([]);
    setMessagesB([]);
  };

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      {/* ヘッダー */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          プロンプト比較モード
        </h1>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            リセット
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            閉じる
          </button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex overflow-hidden">
        {/* プロンプトA */}
        <div className="flex-1 flex flex-col border-r border-gray-700">
          <div className="bg-blue-900 p-4">
            <h2 className="text-lg font-semibold text-white mb-2">プロンプト A</h2>
            <textarea
              value={promptA}
              onChange={(e) => setPromptA(e.target.value)}
              className="w-full h-32 px-3 py-2 bg-gray-800 text-white rounded-md resize-none text-sm"
              placeholder="プロンプトA..."
            />
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-gray-800">
            {messagesA.length === 0 ? (
              <div className="text-center text-gray-400 mt-8">
                メッセージを送信して比較開始
              </div>
            ) : (
              messagesA.map((message, index) => (
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
                      {message.role === 'user' ? 'あなた' : 'AI A'}
                    </div>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="text-left mb-4">
                <div className="inline-block px-4 py-3 rounded-lg bg-gray-700">
                  <div className="text-gray-400">考え中...</div>
                </div>
              </div>
            )}
            <div ref={messagesEndRefA} />
          </div>
        </div>

        {/* プロンプトB */}
        <div className="flex-1 flex flex-col">
          <div className="bg-purple-900 p-4">
            <h2 className="text-lg font-semibold text-white mb-2">プロンプト B</h2>
            <textarea
              value={promptB}
              onChange={(e) => setPromptB(e.target.value)}
              className="w-full h-32 px-3 py-2 bg-gray-800 text-white rounded-md resize-none text-sm"
              placeholder="プロンプトB..."
            />
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-gray-800">
            {messagesB.length === 0 ? (
              <div className="text-center text-gray-400 mt-8">
                メッセージを送信して比較開始
              </div>
            ) : (
              messagesB.map((message, index) => (
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
                      {message.role === 'user' ? 'あなた' : 'AI B'}
                    </div>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="text-left mb-4">
                <div className="inline-block px-4 py-3 rounded-lg bg-gray-700">
                  <div className="text-gray-400">考え中...</div>
                </div>
              </div>
            )}
            <div ref={messagesEndRefB} />
          </div>
        </div>
      </div>

      {/* 入力エリア */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="max-w-4xl mx-auto flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendBoth();
              }
            }}
            placeholder="両方のプロンプトに送信するメッセージ..."
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            onClick={handleSendBoth}
            disabled={loading || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            両方に送信
          </button>
        </div>
      </div>
    </div>
  );
}
