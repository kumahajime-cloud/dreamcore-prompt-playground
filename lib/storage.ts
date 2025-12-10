import { Conversation, CustomPrompt } from './types';

const STORAGE_KEYS = {
  CONVERSATIONS: 'prompt-playground-conversations',
  CUSTOM_PROMPTS: 'prompt-playground-custom-prompts',
  CURRENT_CONVERSATION: 'prompt-playground-current-conversation',
};

// 会話履歴の管理
export const conversationStorage = {
  getAll: (): Conversation[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
    return data ? JSON.parse(data) : [];
  },

  save: (conversation: Conversation) => {
    if (typeof window === 'undefined') return;
    const conversations = conversationStorage.getAll();
    const index = conversations.findIndex((c) => c.id === conversation.id);

    if (index >= 0) {
      conversations[index] = conversation;
    } else {
      conversations.push(conversation);
    }

    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
  },

  delete: (id: string) => {
    if (typeof window === 'undefined') return;
    const conversations = conversationStorage.getAll().filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
  },

  getCurrent: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.CURRENT_CONVERSATION);
  },

  setCurrent: (id: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.CURRENT_CONVERSATION, id);
  },

  exportConversation: (conversation: Conversation): string => {
    return JSON.stringify(conversation, null, 2);
  },

  exportAsText: (conversation: Conversation): string => {
    let text = `タイトル: ${conversation.title}\n`;
    text += `作成日時: ${new Date(conversation.createdAt).toLocaleString('ja-JP')}\n`;
    text += `システムプロンプト:\n${conversation.systemPrompt}\n\n`;
    text += '--- 会話 ---\n\n';

    conversation.messages.forEach((msg) => {
      const role = msg.role === 'user' ? 'あなた' : 'AI';
      text += `${role}:\n${msg.content}\n\n`;
    });

    return text;
  },
};

// カスタムプロンプトの管理
export const promptStorage = {
  getAll: (): CustomPrompt[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_PROMPTS);
    return data ? JSON.parse(data) : [];
  },

  save: (prompt: CustomPrompt) => {
    if (typeof window === 'undefined') return;
    const prompts = promptStorage.getAll();
    const index = prompts.findIndex((p) => p.id === prompt.id);

    if (index >= 0) {
      prompts[index] = prompt;
    } else {
      prompts.push(prompt);
    }

    localStorage.setItem(STORAGE_KEYS.CUSTOM_PROMPTS, JSON.stringify(prompts));
  },

  delete: (id: string) => {
    if (typeof window === 'undefined') return;
    const prompts = promptStorage.getAll().filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.CUSTOM_PROMPTS, JSON.stringify(prompts));
  },

  export: (prompts: CustomPrompt[]): string => {
    return JSON.stringify(prompts, null, 2);
  },

  import: (json: string): CustomPrompt[] => {
    try {
      const data = JSON.parse(json);
      if (Array.isArray(data)) {
        return data;
      }
      throw new Error('Invalid format');
    } catch (error) {
      console.error('Import error:', error);
      return [];
    }
  },
};

// ユーティリティ
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
