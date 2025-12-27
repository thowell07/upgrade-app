export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  id: string;
}

export interface DesignStyle {
  id: string;
  name: string;
  prompt: string;
  thumbnail: string;
}

export interface RoomView {
  id: string;
  original: string; // Base64
  generated: string | null; // Base64
  isLoading: boolean;
}

export enum AppState {
  UPLOAD = 'UPLOAD',
  EDIT = 'EDIT',
}

export type LoadingState = 'idle' | 'generating_image' | 'chatting';