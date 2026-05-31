import React, { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from '@tanstack/react-router';
import { useChat } from "@mui/x-chat/headless";
import { IconButton, Input, InputAdornment } from "@mui/material";
import DoneIcon from '@mui/icons-material/Done';
import UpdatingData from "@components/UpdatingData";
import { conversationAtom } from "@store/conversationStore";
import { updateConversation } from "@api/conversation";

type CustomTitleProps = React.HTMLAttributes<HTMLDivElement>;

const ConversationHeaderTitle = React.forwardRef<HTMLDivElement, CustomTitleProps>(function CustomTitle(
  props,
  ref,
) {
  const { id } = useParams({
    from: '/_authenticated/collection/$id/chat'
  });
  const queryClient = useQueryClient();
  const { conversations, activeConversationId } = useChat();
  const [conversationState, setConversationState] = 
    useAtom(conversationAtom);
  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const [newTitle, setNewTitle] = useState<string | undefined>();
  const [error, setError] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);

  useEffect(() => {
    setConversationState(prev => ({ ...prev, updateTitle: false }));
    if (activeConversation) {
      setNewTitle(activeConversation.title);
    }
  }, [activeConversationId, activeConversation]);

  const handleTitleChange = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!activeConversation || activeConversation.id === 'new') return;
    if (newTitle === undefined || newTitle.trim() === '') return;
    if (newTitle.trim().length < 5 || newTitle.trim().length > 50) return;
    try {
      setUpdating(true);
      setConversationState(prev => ({ ...prev, currentConversation: activeConversation.id }));
      await updateConversation(activeConversation.id, newTitle);
      queryClient.resetQueries({
        queryKey: ['conversations', { collection: id }]
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour du titre de la conversation", error);
    } finally {
      setConversationState(prev => ({ ...prev, updateTitle: false }));
      setConversationState(prev => ({ ...prev, needToUpdate: true }));
      setUpdating(false);
    }
  }

  const handleOnBlur = () =>{
    setNewTitle(activeConversation?.title);
    setConversationState(prev => ({ ...prev, updateTitle: false }))
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewTitle(event.target.value);
    setError(event.target.value.trim() === '' || 
      event.target.value.length < 5 || event.target.value.length > 50);
  }

  if (conversationState.updateTitle) {
    return (
      <div ref={ref} {...props}>
        <Input
          id="conversation-title"
          type="text"
          value={newTitle}
          onChange={handleChange}
          onBlur={handleOnBlur}
          error={error}
          endAdornment={
            <InputAdornment position="end">
              { !error && 
                <IconButton
                  aria-label="Valider le nouveau titre de la conversation"
                  onMouseDown={handleTitleChange}
                >
                  <DoneIcon />
                </IconButton>
            }
            </InputAdornment>
          }
        />
      </div>
    )
  }

  return (
    <div ref={ref} {...props}>
      {newTitle}
      <UpdatingData open={updating} message="Mise à jour données en cours..." />
    </div>
  );
});

export default ConversationHeaderTitle;