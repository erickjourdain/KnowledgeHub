import { useCallback, useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useAtom, useSetAtom } from 'jotai';
import { observe } from 'jotai-effect';
import { v4 as uuidv4 } from 'uuid';
import Markdown from "react-markdown";
import remarkGfm from 'remark-gfm';
import { ChatBox } from '@mui/x-chat';
import type { 
  ChatMessage, 
  ChatAdapter, 
  ChatConversation, 
  ChatUser,
  ChatMessagePart
} from '@mui/x-chat/headless';
import { 
  fetchConversations, 
  fetchConversationMessages,
  queryRag, 
  fetchMessage
} from '@api/chat';
import { jobQueryAtom } from '@store/jobQueryStore';
import { conversationAtom } from '@store/conversationStore';
import { createAvatar, createAvatarDataUrl, createEmptyConversation } from '@utils/chat';
import type { AuthState } from '@appTypes/AuthState';
import type { RagQuery } from '@appTypes/Query';
import type { Message } from '@appTypes/Message';
import ConversationHeaderAction from '@components/ConversationHeaderAction';
import ConversationHeaderTitle from '@components/ConversationHeaderTitle';
import UpdatingData from '@components/UpdatingData';

type ModelPagination = {
  page: number;
  pageSize: number;
  search: string | null;
}

export const Route = createFileRoute('/_authenticated/collection/$id/chat')({
  component: RouteComponent
});

function RouteComponent() {
  const { auth }: { auth: AuthState } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const {id} = Route.useParams();
  const setJobId = useSetAtom(jobQueryAtom);
  const [conversationState, setConversationState] = 
    useAtom(conversationAtom);
  const [meChatUser] = useState<ChatUser>(createAvatar(auth.user, '#1976d2'));
  const [assistantChatUser] = useState<ChatUser>(createAvatar('assistant'));
  const [modelPagination, _setModelPagination] = useState<ModelPagination>({
    page: 1,
    pageSize: 20,
    search: null
  });
  const [conversations, setConversations] = useState<ChatConversation[]>([
    createEmptyConversation()
  ]);
  const [_nbConversations, setNbConversations] = useState<number>(0);
  const [activeConversationId, setActiveConversationId] = useState<string|undefined>('new');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const frenchLocale = {
    composerInputPlaceholder: 'Posez moi une question...',
    composerSendButtonLabel: 'Envoyer',
    composerAttachButtonLabel: 'Joindre un fichier',
    scrollToBottomLabel: 'Aller en bas',
    threadNoMessagesLabel: 'Aucun message',
    genericErrorLabel: 'Une erreur est survenue',
    loadingLabel: 'Chargement...',
    retryButtonLabel: 'R\u00e9essayer',
    unreadMarkerLabel: 'Nouveaux messages',
    typingIndicatorLabel: (users: ChatUser[]) => {
      const names = users.map((u) => u.displayName ?? u.id).join(', ');
      if (users.length === 1) return `${names} \u00e9crit...`;
      return `${names} \u00e9crivent...`;
    },
    messageTimestampLabel: (dateTime: string) => {
      const d = new Date(dateTime);
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    },
  };

  const defineMessageParts = useCallback((message: Message) => {
    const messageParts: ChatMessagePart[] = [];
    messageParts.push(
      { type: 'text', text: message.answer || 'aucune réponse' }
    );
    if (message.sources) {
      message.sources.forEach(source => {
        messageParts.push(
          {
            type: 'source-document',
            sourceId: uuidv4(),
            title: source.fichier,
            text: `${source.chapitre} - ${source.section}`
          }
        )
      })
    }
    return messageParts;
  }, []);

  useEffect(() => {
    queryClient.resetQueries({
      queryKey: ['conversations', { collection: id }]
    });
    setConversationState(prev => ({ ...prev, needToUpdate: true }));

    return () => {
      queryClient.resetQueries({
        queryKey: ['conversations', { collection: id }]
      });
      setConversationState({ 
        needToUpdate: false,
        currentConversation: null,
        updateTitle: false
      });
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    queryClient.ensureQueryData({
      queryKey: ['conversations', { collection: id }],
      queryFn: () => fetchConversations(parseInt(id))
    }).then(response => {
      const conversations: ChatConversation[] = [createEmptyConversation()];
      response.data.forEach(conversation => {
        conversations.push({
          id: conversation.uuid,
          title: conversation.title,
          lastMessageAt: conversation.created_at,
          avatarUrl: createAvatarDataUrl(
            auth.user?.username[0].toUpperCase() || 'M', 
            '#1976d2'
          )
        })
      })
      setConversations(conversations);
      setNbConversations(response.count);
      if (response.count) {
        setActiveConversationId(conversationState.currentConversation || 
          response.data[0].uuid);
        setConversationState(prev => ({ ...prev, currentConversation: null }));
      }
    }).catch(error => {
      console.error(error);
    }).finally(() => {
      setLoading(false);
      setConversationState(prev => ({ ...prev, needToUpdate: false }));
    });
  }, [modelPagination, conversationState.needToUpdate]);

  useEffect(() => {
    if (activeConversationId && activeConversationId !== 'new') {
      fetchConversationMessages(activeConversationId, 1, 20)
      .then((response) => {
        const conversationMessages: ChatMessage[] = [];
        response.data.forEach(newMessage => {
          conversationMessages.push({
            id: `user-${newMessage.uuid}`,
            conversationId: activeConversationId,
            role: 'user',
            parts: [
              { type: 'text', text: newMessage.questions }
            ],
            createdAt: dayjs(newMessage.created_at).toISOString(),
            status: 'read',
            author: meChatUser
          });
          conversationMessages.push({
            id: `assitant-${newMessage.uuid}`,
            conversationId: activeConversationId,
            role: 'assistant',
            parts: defineMessageParts(newMessage),
            status: 'read',
            author: assistantChatUser
          });
        })
        setMessages(conversationMessages);
      })
    } else setMessages([]);
  }, [activeConversationId]);

  const adapter: ChatAdapter = {
    async sendMessage({ message }) {
      const lastMessage = message.parts[message.parts.length -1];
      if (lastMessage.type !== 'text') return new ReadableStream();
      const query: RagQuery = {
        query: lastMessage.text,
        collection_id: parseInt(id)
      }
      if (activeConversationId !== 'new') 
        query.conversation_uuid = activeConversationId
      const job = await queryRag(query);
      const info = 'en attente de traitement';
      setJobId({
        job_id: job.job_id,
        type: 'query',
        status: job.status,
        step: null,
        message: info,
        progress: 0
      });
      return new ReadableStream({
        start(controller) {
          controller.enqueue({ type: 'start', messageId: job.job_id, author: assistantChatUser });
          controller.enqueue({ type: 'finish', messageId: job.job_id });
          controller.close();
        },
      });
    },

    subscribe({ onEvent }) {
      const unobserve = observe((get, set) => {
        const jobInfo = get(jobQueryAtom);
        if (jobInfo) {
          if (jobInfo.progress === 100) {
            const uuid = jobInfo.message?.split(':')[1].trim();
            fetchMessage(uuid || '')
              .then(message => {
                if (activeConversationId === 'new') {
                  queryClient.resetQueries({
                    queryKey: ['conversations', { collection: id }]
                  });
                  setConversationState(prev => ({ ...prev, needToUpdate: true }));
                } else { 
                  onEvent({
                    type: 'message-added',
                    message: {
                      id: jobInfo.job_id,
                      role: 'assistant',
                      status: jobInfo.status === 'failed' ? 'error' : 'sent',
                      parts: defineMessageParts(message),
                      author: assistantChatUser,
                      createdAt: dayjs(message.created_at).format(),
                      conversationId: activeConversationId
                    }
                  });
                }
              })
              .catch(() => console.error("Erreur lors de la récupération du message"))
              .finally(() => set(jobQueryAtom, null));
          } else {
            onEvent({
              type: 'message-added',
              message: {
                id: jobInfo.job_id,
                role: 'assistant',
                status: 'streaming',
                parts: [{
                  type: 'text',
                  text: jobInfo.message || 'aucune information'
                }],
                author: assistantChatUser,
                conversationId: activeConversationId
              }  
            })
          };
        }
      });
      return () => unobserve();
    },
  };

  return (
    <>
      <ChatBox
        adapter={adapter}
        currentUser={meChatUser}
        features={{ attachments: false }}
        messages={messages}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onConversationsChange={setConversations}
        onActiveConversationChange={setActiveConversationId}
        slots={{ 
          conversationTitle: ConversationHeaderTitle,
          conversationHeaderActions: ConversationHeaderAction 
        }}
        slotProps={{
          messageContent: {
            partProps: {
              text: {
                renderText: (text) => (
                  <Markdown remarkPlugins={[remarkGfm]}>
                    {text}
                  </Markdown>
                )
              },
            },
          },
          dateDivider: {
            formatDate: (date: Date) =>
              date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })
          },
        }}
        sx={{ height: '800px' }}
        localeText={frenchLocale}
      />
      <UpdatingData
        open={loading}
        message="Chargement des conversations..."
      />
    </>
  )
}