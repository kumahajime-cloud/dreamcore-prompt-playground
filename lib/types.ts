export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  systemPrompt: string;
  createdAt: number;
  updatedAt: number;
}

export interface CustomPrompt {
  id: string;
  name: string;
  prompt: string;
  createdAt: number;
}
