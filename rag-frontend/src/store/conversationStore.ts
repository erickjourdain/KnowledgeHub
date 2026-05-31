import { atom } from 'jotai';

type ConversationState = {
  needToUpdate: boolean;
  currentConversation: string | null;
  updateTitle: boolean;
}

const conversationAtom = atom<ConversationState>({
  needToUpdate: false,
  currentConversation: null,
  updateTitle: false
});

export { conversationAtom };