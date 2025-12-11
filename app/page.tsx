'use client';

import { useState, useRef, useEffect } from 'react';
import { Message, Conversation, CustomPrompt } from '@/lib/types';
import { conversationStorage, promptStorage, generateId } from '@/lib/storage';
import CompareMode from '@/components/CompareMode';
import GameMode from '@/components/GameMode';
import GamePreview from '@/components/GamePreview';
import {
  dreamcoreRegular,
  dreamcoreGameDesign,
  dreamcoreCodeRules,
  dreamcoreCreate,
  dreamcoreUpdate,
  dreamcoreBugfix,
  dreamcoreUnified,
} from '@/lib/dreamcore-prompts';

const PRESET_PROMPTS = {
  dreamcore_unified: {
    name: 'DreamCore: 統合ゲーム作成',
    prompt: dreamcoreUnified,
  },
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

export default function Home() {
  const [systemPrompt, setSystemPrompt] = useState(PRESET_PROMPTS.dreamcore_unified.prompt);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('dreamcore_unified');
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showPromptManager, setShowPromptManager] = useState(false);
  const [showConversationList, setShowConversationList] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [showCompareMode, setShowCompareMode] = useState(false);
  const [showGameMode, setShowGameMode] = useState(false);
  const [currentHtml, setCurrentHtml] = useState('');
  const [gameTitle, setGameTitle] = useState('');
  const [showGamePreview, setShowGamePreview] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 初期化
  useEffect(() => {
    const loadedPrompts = promptStorage.getAll();
    const loadedConversations = conversationStorage.getAll();
    setCustomPrompts(loadedPrompts);
    setConversations(loadedConversations);

    // 新しい会話を開始
    const newConv = createNewConversation();
    setCurrentConversationId(newConv.id);
  }, []);

  // 会話の自動保存
  useEffect(() => {
    if (currentConversationId && messages.length > 0) {
      const conversation = conversations.find((c) => c.id === currentConversationId);
      if (conversation) {
        const updated: Conversation = {
          ...conversation,
          messages,
          systemPrompt,
          updatedAt: Date.now(),
        };
        conversationStorage.save(updated);
        setConversations((prev) =>
          prev.map((c) => (c.id === currentConversationId ? updated : c))
        );
      }
    }
  }, [messages, systemPrompt]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const createNewConversation = (): Conversation => {
    const newConv: Conversation = {
      id: generateId(),
      title: '新しい会話',
      messages: [],
      systemPrompt: systemPrompt,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    conversationStorage.save(newConv);
    setConversations((prev) => [newConv, ...prev]);
    return newConv;
  };

  const handlePresetChange = (presetKey: string) => {
    setSelectedPreset(presetKey);
    if (presetKey.startsWith('custom-')) {
      const promptId = presetKey.replace('custom-', '');
      const customPrompt = customPrompts.find((p) => p.id === promptId);
      if (customPrompt) {
        setSystemPrompt(customPrompt.prompt);
      }
    } else {
      const preset = PRESET_PROMPTS[presetKey as keyof typeof PRESET_PROMPTS];
      setSystemPrompt(preset.prompt);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

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
            // Handle text chunks (0: prefix)
            if (line.startsWith('0:')) {
              try {
                const text = JSON.parse(line.substring(2));
                if (typeof text === 'string') {
                  assistantContent += text;
                }
              } catch (e) {
                console.error('Parse error for text:', e);
              }
            }

            // Handle data chunks (2: prefix) - custom data events
            else if (line.startsWith('2:')) {
              try {
                const dataArray = JSON.parse(line.substring(2));
                if (Array.isArray(dataArray)) {
                  for (const data of dataArray) {
                    if (data.type === 'title' && data.content) {
                      setGameTitle(data.content);
                      setShowGamePreview(true);
                    } else if (data.type === 'html' && data.content) {
                      setCurrentHtml(data.content);
                      setShowGamePreview(true);
                    }
                  }
                }
              } catch (e) {
                console.error('Parse error for data:', e);
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
      setLoading(false);
    }
  };

  const handleNewConversation = () => {
    const newConv = createNewConversation();
    setCurrentConversationId(newConv.id);
    setMessages([]);
    setSystemPrompt(PRESET_PROMPTS.dreamcore_unified.prompt);
    setSelectedPreset('dreamcore_unified');
  };

  const handleLoadConversation = (conv: Conversation) => {
    setCurrentConversationId(conv.id);
    setMessages(conv.messages);
    setSystemPrompt(conv.systemPrompt);
    setShowConversationList(false);
  };

  const handleDeleteConversation = (id: string) => {
    conversationStorage.delete(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (currentConversationId === id) {
      handleNewConversation();
    }
  };

  const handleSavePrompt = () => {
    if (!newPromptName.trim()) return;

    const newPrompt: CustomPrompt = {
      id: generateId(),
      name: newPromptName,
      prompt: systemPrompt,
      createdAt: Date.now(),
    };

    promptStorage.save(newPrompt);
    setCustomPrompts((prev) => [...prev, newPrompt]);
    setNewPromptName('');
    alert('プロンプトを保存しました');
  };

  const handleDeletePrompt = (id: string) => {
    promptStorage.delete(id);
    setCustomPrompts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleExportConversation = () => {
    if (!currentConversationId) return;
    const conv = conversations.find((c) => c.id === currentConversationId);
    if (!conv) return;

    const text = conversationStorage.exportAsText(conv);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPrompts = () => {
    const json = promptStorage.export(customPrompts);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompts-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportPrompts = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const json = event.target?.result as string;
      const imported = promptStorage.import(json);
      imported.forEach((prompt) => promptStorage.save(prompt));
      setCustomPrompts(promptStorage.getAll());
      alert(`${imported.length}件のプロンプトをインポートしました`);
    };
    reader.readAsText(file);
  };

  if (showCompareMode) {
    return <CompareMode onClose={() => setShowCompareMode(false)} />;
  }

  if (showGameMode) {
    return <GameMode systemPrompt={systemPrompt} onClose={() => setShowGameMode(false)} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* 左パネル: システムプロンプト編集 */}
      <div className={`${showGamePreview ? 'w-1/4' : 'w-1/3'} border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 overflow-y-auto`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            システムプロンプト
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowGameMode(true)}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              ゲーム
            </button>
            <button
              onClick={() => setShowCompareMode(true)}
              className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              比較
            </button>
            <button
              onClick={() => setShowPromptManager(!showPromptManager)}
              className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              管理
            </button>
          </div>
        </div>

        {/* プロンプト管理パネル */}
        {showPromptManager && (
          <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
            <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">
              プロンプト管理
            </h3>
            <div className="space-y-2 mb-4">
              <input
                type="text"
                value={newPromptName}
                onChange={(e) => setNewPromptName(e.target.value)}
                placeholder="プロンプト名"
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-600 dark:text-white text-sm"
              />
              <button
                onClick={handleSavePrompt}
                className="w-full px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
              >
                現在のプロンプトを保存
              </button>
            </div>
            <div className="space-y-2 mb-4">
              <button
                onClick={handleExportPrompts}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                プロンプトをエクスポート
              </button>
              <label className="block">
                <span className="w-full px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm cursor-pointer block text-center">
                  プロンプトをインポート
                </span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportPrompts}
                  className="hidden"
                />
              </label>
            </div>
            {customPrompts.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">
                  保存済みプロンプト
                </p>
                <div className="space-y-1">
                  {customPrompts.map((prompt) => (
                    <div
                      key={prompt.id}
                      className="flex justify-between items-center p-2 bg-white dark:bg-gray-600 rounded text-sm"
                    >
                      <span className="text-gray-900 dark:text-white">{prompt.name}</span>
                      <button
                        onClick={() => handleDeletePrompt(prompt.id)}
                        className="text-red-600 hover:text-red-800 text-xs"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
            {customPrompts.map((prompt) => (
              <option key={prompt.id} value={`custom-${prompt.id}`}>
                {prompt.name} (カスタム)
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
            onClick={handleNewConversation}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            新しい会話を開始
          </button>
          <button
            onClick={handleExportConversation}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            会話をエクスポート
          </button>
        </div>
      </div>

      {/* 中央パネル: チャット */}
      <div className={`${showGamePreview ? 'w-1/3' : 'flex-1'} flex flex-col bg-white dark:bg-gray-800`}>
        <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">チャット</h2>
          <button
            onClick={() => setShowConversationList(!showConversationList)}
            className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            会話履歴
          </button>
        </div>

        {/* 会話履歴パネル */}
        {showConversationList && (
          <div className="border-b border-gray-200 dark:border-gray-700 p-4 max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-700">
            <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">会話履歴</h3>
            {conversations.length === 0 ? (
              <p className="text-sm text-gray-500">会話履歴がありません</p>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="flex justify-between items-center p-2 bg-white dark:bg-gray-600 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-500"
                    onClick={() => handleLoadConversation(conv)}
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-gray-900 dark:text-white">
                        {conv.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(conv.updatedAt).toLocaleString('ja-JP')}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(conv.id);
                      }}
                      className="text-red-600 hover:text-red-800 text-xs ml-2"
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
                <div className="text-gray-600 dark:text-gray-400">考え中...</div>
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

      {/* 右パネル: ゲームプレビュー */}
      {showGamePreview && (
        <div className="flex-1 flex flex-col border-l border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center bg-white dark:bg-gray-800">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              ゲームプレビュー
            </h2>
            <button
              onClick={() => setShowGamePreview(false)}
              className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              閉じる
            </button>
          </div>
          <GamePreview html={currentHtml} title={gameTitle} />
        </div>
      )}
    </div>
  );
}
