import React, { useState } from 'react';
import { useSetAtom } from 'jotai';
import { useChat } from '@mui/x-chat-headless';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import RenameIcon from '@mui/icons-material/DriveFileRenameOutline';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useLoaderData } from '@tanstack/react-router';
import { conversationAtom } from '@store/conversationStore';
import { delConversation } from '@api/conversation';
import ConfirmationDialog from '@components/ConfirmationDialog';
import ConfirmationMessage from './ConfirmationMessage';

type CustomActionsProps = React.HTMLAttributes<HTMLDivElement>;

const ConversationHeaderAction = React.forwardRef<HTMLDivElement, CustomActionsProps>(function CustomActions(
  props,
  ref,
) {
  const { slug: _slug } = useParams({
    from: '/_authenticated/collection/$slug/chat'
  });
  const collection = useLoaderData({
    from: '/_authenticated/collection/$slug'
  });
  const id = String(collection.id);
  const queryClient = useQueryClient();
  const { conversations, activeConversationId } = useChat();
  const setConversationState = useSetAtom(conversationAtom);
  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const conversationTitle = activeConversation?.title;
  const conversationId = activeConversation?.id;

  const [openConfirmDelete, setOpenConfirmDelete] = useState<boolean>(false);
  const [deleteSuccess, setDeleteSuccess] = useState<boolean>(false);

  const handleDelete = async (value: boolean | undefined) => {
    if (!conversationId || conversationId === "new" || !value) {
      setOpenConfirmDelete(false);
      return;
    }
    try {
      await delConversation(conversationId);
      queryClient.resetQueries({
        queryKey: ['conversations', { collection: id }]
      });
      setDeleteSuccess(true);
    } catch (error) {
      console.error("Erreur lors de la suppression de la conversation", error);
    } finally {
      setOpenConfirmDelete(false);
      setConversationState(prev => ({ ...prev, needToUpdate: true }));
    }
  }

  const handleRename = () => {
    setConversationState(prev => ({ ...prev, updateTitle: true }));
  }

  if (conversationId === "new") return null;

  return (
    <div ref={ref} {...props}>
      <IconButton 
        onClick={handleRename}
        size="small" 
        aria-label={`Renommer "${conversationTitle}"`}
      >
        <RenameIcon fontSize="small" />
      </IconButton>
      <IconButton
        onClick={() => setOpenConfirmDelete(true)}
        size="small"
        aria-label={`Supprimer "${conversationTitle}"`}
      >
        <DeleteIcon fontSize="small" />
      </IconButton>
      <ConfirmationDialog
        id="conversation-delete-confirmation"
        title="Supprimer la conversation"
        message={`Confirmez-vous la suppression définitive de la conversation "${conversationTitle}" ?`}
        open={openConfirmDelete}
        onClose={handleDelete}
      />
      <ConfirmationMessage
        open={deleteSuccess}
        message="Conversation supprimée avec succès"
        color="success"
        onClose={() => setDeleteSuccess(false)}
      />
    </div>
  );
});

export default ConversationHeaderAction;