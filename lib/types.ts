export interface AirdropDetails {
  title: string;
  snapshot: string;
  eligibility: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
