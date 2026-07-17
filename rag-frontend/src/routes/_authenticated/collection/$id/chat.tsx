import { useCallback, useEffect, useState, useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useAtom, useSetAtom } from 'jotai';
import { observe } from 'jotai-effect';
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
  fetchMessage,
  fetchLlmModels,
  fetchDefaultLlmModel,
  type LlmModel
} from '@api/chat';
import { Box, MenuItem, Select, CircularProgress, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { jobQueryAtom } from '@store/jobQueryStore';
import { conversationAtom } from '@store/conversationStore';
import { createAvatar, createAvatarDataUrl, createEmptyConversation } from '@utils/chat';
import { useAuth } from '../../../../providers/authProvider';
import type { RagQuery } from '@appTypes/Query';
import type { Message } from '@appTypes/Message';
import SourceDocumentCard from '@components/SourceDocumentCard';
import ConversationHeaderAction from '@components/ConversationHeaderAction';
import ConversationHeaderTitle from '@components/ConversationHeaderTitle';
import UpdatingData from '@components/UpdatingData';
type ModelPagination = {
  page: number;
  pageSize: number;
  search: string | null;
}

const preprocessMarkdown = (text: string): string => {
  if (!text) return '';
  return text.replace(/\|\s*\r?\n\s*\r?\n\s*\|/g, '|\n|');
};

export const Route = createFileRoute('/_authenticated/collection/$id/chat')({
  component: RouteComponent
});

function RouteComponent() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { id } = Route.useParams();
  const setJobId = useSetAtom(jobQueryAtom);

  const [models, setModelsList] = useState<LlmModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');

  useEffect(() => {
    fetchLlmModels()
      .then((data) => {
        setModelsList(data.filter((m) => !m.embed));
      })
      .catch((err) => console.error("Erreur lors de la récupération des modèles", err));

    fetchDefaultLlmModel()
      .then((res) => {
        setSelectedModel(res.default_model);
      })
      .catch((err) => console.error("Erreur lors de la récupération du modèle par défaut", err));
  }, []);

  const ComposerToolbar = useMemo(() => {
    return (props: any) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SmartToyIcon sx={{ color: 'primary.light', fontSize: '1.2rem' }} />
          <Select
            value={selectedModel || ""}
            onChange={(e) => setSelectedModel(e.target.value)}
            size="small"
            variant="standard"
            disableUnderline
            sx={{
              color: 'text.primary',
              fontSize: '0.85rem',
              fontWeight: 500,
              '& .MuiSelect-select': {
                py: 0.5,
                px: 1.5,
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                '&:focus': {
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  borderRadius: '8px',
                }
              },
              '& .MuiSvgIcon-root': {
                color: 'text.secondary',
              }
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                  '& .MuiMenuItem-root': {
                    fontSize: '0.85rem',
                    py: 1,
                    px: 1.5,
                    color: 'text.primary',
                    '&:hover': {
                      backgroundColor: 'rgba(99, 102, 241, 0.08)',
                    },
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(99, 102, 241, 0.16)',
                      color: 'primary.light',
                      fontWeight: 600,
                      '&:hover': {
                        backgroundColor: 'rgba(99, 102, 241, 0.2)',
                      }
                    }
                  }
                }
              }
            }}
          >
            {models.length === 0 ? (
              <MenuItem value="" disabled>
                Chargement des modèles...
              </MenuItem>
            ) : (
              models.map((m) => (
                <MenuItem key={m.name} value={m.name || ""}>
                  {m.name} {m.parameter_size ? `(${m.parameter_size})` : ''}
                </MenuItem>
              ))
            )}
            {models.find((m) => m.name === selectedModel) === undefined && selectedModel && (
              <MenuItem value={selectedModel}>
                {selectedModel}
              </MenuItem>
            )}
          </Select>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {props.children}
        </Box>
      </Box>
    );
  }, [models, selectedModel]);
  const [conversationState, setConversationState] =
    useAtom(conversationAtom);
  const meChatUser = useMemo<ChatUser>(() => createAvatar(auth.user, '#1976d2'), [auth.user]);
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
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>('new');
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
            sourceId: source.id.toString(),
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
    queryClient.fetchQuery({
      queryKey: ['conversations', { collection: id }],
      queryFn: () => fetchConversations(parseInt(id))
    }).then(response => {
      const conversations: ChatConversation[] = [createEmptyConversation()];
      response.data.forEach(conversation => {
        conversations.push({
          id: conversation.uuid,
          title: conversation.title,
          lastMessageAt: conversation.created_at,
          avatarUrl: conversation.creator?.icon || createAvatarDataUrl(
            conversation.creator?.username[0].toUpperCase() || 'M',
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
      } else {
        setActiveConversationId('new');
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
              author: createAvatar(newMessage.sender, '#1976d2')
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
      const lastMessage = message.parts[message.parts.length - 1];
      if (lastMessage.type !== 'text') return new ReadableStream();
      const query: RagQuery = {
        query: lastMessage.text,
        collection_id: parseInt(id),
        model: selectedModel || undefined
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
                  type: 'data-search-progress',
                  data: {
                    text: jobInfo.message || 'aucune information'
                  }
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
          conversationHeaderActions: ConversationHeaderAction,
          composerToolbar: ComposerToolbar
        }}
        partRenderers={{
          'source-document': ({ part }) => <SourceDocumentCard part={part as any} />,
          'data-search-progress': ({ part }: { part: any }) => (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
              <CircularProgress size={16} sx={{ color: 'primary.light' }} />
              <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                {part.data?.text}
              </Typography>
            </Box>
          )
        }}
        slotProps={{
          messageContent: {
            partProps: {
              text: {
                renderText: (text) => (
                  <Markdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({ node, ...props }) => (
                        <TableContainer 
                          component={Box} 
                          sx={{ 
                            my: 2, 
                            border: '1px solid rgba(255, 255, 255, 0.1)', 
                            borderRadius: '8px',
                            overflow: 'hidden',
                            backgroundColor: 'rgba(0, 0, 0, 0.2)' 
                          }}
                        >
                          <Table size="small" {...props} />
                        </TableContainer>
                      ),
                      thead: ({ node, ...props }) => <TableHead {...props} />,
                      tbody: ({ node, ...props }) => <TableBody {...props} />,
                      tr: ({ node, ...props }) => <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }} {...props} />,
                      th: ({ node, align, ...props }) => (
                        <TableCell 
                          align={(align === 'char' ? 'left' : align) as any} 
                          sx={{ 
                            fontWeight: '600', 
                            color: 'primary.light', 
                            backgroundColor: 'rgba(255, 255, 255, 0.04)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                            py: 1 
                          }} 
                          {...props} 
                        />
                      ),
                      td: ({ node, align, ...props }) => (
                        <TableCell 
                          align={(align === 'char' ? 'left' : align) as any} 
                          sx={{ 
                            color: 'rgba(255, 255, 255, 0.8)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            py: 0.75 
                          }} 
                          {...props} 
                        />
                      ),
                    }}
                  >
                    {preprocessMarkdown(text)}
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
        sx={{
          height: 'calc(100vh - 160px)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'rgba(15, 23, 42, 0.3)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',

          '& .MuiChatBox-root': {
            backgroundColor: 'transparent',
          },
          '& .MuiChatBox-layout': {
            backgroundColor: 'transparent',
          },
          // Unifier le fond du volet de conversation (fil des messages)
          '& .MuiChatBox-threadPane': {
            backgroundColor: 'rgba(15, 23, 42, 0.25)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.06)',
          },
          // Unifier le fond de la liste des conversations (sidebar gauche du chat)
          '& .MuiChatBox-conversationsPane': {
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
          },
          // L'en-tête de la conversation
          '& .MuiChatConversation-header': {
            backgroundColor: 'rgba(15, 23, 42, 0.45) !important',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          },
          // Styliser les éléments sélectionnés dans la liste de conversations
          '& .MuiChatConversationList-itemSelected': {
            backgroundColor: 'rgba(99, 102, 241, 0.08) !important',
            color: '#818cf8',
            '&:hover': {
              backgroundColor: 'rgba(99, 102, 241, 0.12) !important',
            }
          },
          '& .MuiChatConversationList-item': {
            borderRadius: '8px',
            mx: 1,
            my: 0.5,
            width: 'calc(100% - 16px)',
            transition: 'all 0.2s',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
            }
          },
          '& .MuiChatMessageList-root': {
            backgroundColor: 'transparent',
            p: 2,
          },
          '& .MuiChatMessage-roleUser .MuiChatMessage-bubble': {
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            color: '#ffffff',
            borderRadius: '16px 16px 4px 16px',
            border: 'none',
            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.25)',
            p: 1.75,
            '& p': {
              color: '#ffffff',
            }
          },
          '& .MuiChatMessage-roleAssistant .MuiChatMessage-bubble': {
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(99, 102, 241, 0.15)',
            borderRadius: '16px 16px 16px 4px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            p: 1.75,
            '& p': {
              color: 'text.primary',
            }
          },
          '& .MuiChatComposer-root': {
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '24px',
            p: 1,
            mx: 'auto',
            mb: 2,
            mt: 1,
            width: '95%',
            maxWidth: '800px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:focus-within': {
              borderColor: 'rgba(99, 102, 241, 0.5)',
              boxShadow: '0 10px 30px rgba(99, 102, 241, 0.15)',
            }
          },
          '& .MuiChatComposer-input': {
            fontSize: '0.925rem',
            color: 'text.primary',
          },
          '& .MuiChatComposerSendButton-root': {
            backgroundColor: 'primary.main',
            color: '#ffffff',
            borderRadius: '50%',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            '&:hover': {
              backgroundColor: 'primary.dark',
              transform: 'scale(1.05)',
            },
            '&:disabled': {
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: 'rgba(255, 255, 255, 0.2)',
            }
          },
          '& .MuiChatComposer-container': {
            border: 'none',
          }
        }}
        localeText={frenchLocale}
      />
      <UpdatingData
        open={loading}
        message="Chargement des conversations..."
      />
    </>
  )
}