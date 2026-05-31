import { useCallback } from "react";
import { 
  ChatComposer, 
  ChatComposerSendButton, 
  ChatComposerTextArea, 
  ChatComposerToolbar, 
  ChatConversation, 
  ChatMessage, 
  ChatMessageAvatar, 
  ChatMessageContent, 
  ChatMessageGroup, 
  ChatMessageInlineMeta, 
  ChatMessageList 
} from '@mui/x-chat';
import { useMessageIds } from '@mui/x-chat/headless';

function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      style={{ width: '1em', height: '1em' }}
    >
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

function ChatComponent() {
  const messageIds = useMessageIds();

  const renderItem = useCallback(
    (params: { id: string }) => (
      <ChatMessageGroup key={params.id} messageId={params.id}>
        <ChatMessage messageId={params.id}>
          <ChatMessageAvatar />
          <ChatMessageContent afterContent={<ChatMessageInlineMeta />} />
        </ChatMessage>
      </ChatMessageGroup>
    ),
    [],
  );

  return (
    <ChatConversation>
      <ChatMessageList renderItem={renderItem} items={messageIds} />
      <ChatComposer>
        <ChatComposerTextArea placeholder="Type a message..." />
        <ChatComposerToolbar>
          <ChatComposerSendButton aria-label="Send message">
            <SendIcon />
          </ChatComposerSendButton>
        </ChatComposerToolbar>
      </ChatComposer>
    </ChatConversation>
  );
}

export default ChatComponent;