export type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export const sanitizeInput = (text: string): string => {
  return text.trim().replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
};