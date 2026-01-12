import { Context, SessionFlavor } from 'grammy';
import { ConversationFlavor } from '@grammyjs/conversations';

export interface SessionData {
  userId: string | null;
  currentScene: string | null;
}

export type MyContext = Context & SessionFlavor<SessionData> & ConversationFlavor;
