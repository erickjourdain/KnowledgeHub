import { useState } from 'react';
import { createFileRoute, useLoaderData, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Box, Button, Grid, TextField, Typography, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Paper } from '@mui/material';
import ConfirmationMessage from '@components/ConfirmationMessage';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AdminPageHeader from '@components/AdminPageHeader';
import DeleteIcon from '@mui/icons-material/Delete';
import { deleteCollection } from '@api/collections';
import { useAtomValue } from 'jotai';
import { jobIngestionIdsAtom } from '@store/jobIngestionStore';
import { jobReindexIdsAtom } from '@store/jobReindexStore';

export const Route = createFileRoute(
  '/_authenticated/_authAdmin/admin/collection/$slug/delete',
)({
  component: RouteComponent,
})

function RouteComponent() {
  const collection = useLoaderData({
    from: '/_authenticated/_authAdmin/admin/collection/$slug'
  });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [collectionName, setCollectionName] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [openSnackbar, setOpenSnackbar] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [color, setColor] = useState<"success" | "error">("success");

  const ingestionIds = useAtomValue(jobIngestionIdsAtom);
  const reindexIds = useAtomValue(jobReindexIdsAtom);
  const isOperationInProgress = ingestionIds.length > 0 || reindexIds.length > 0;

  const handleDelete = () => {
    if (collection.name === collectionName) {
      setIsLoading(true)
      deleteCollection(String(collection.id))
        .then((response) => {
          if (response.message) {
            queryClient.resetQueries({ queryKey: ['collections'] });
            setMessage("Collection supprimée avec succès");
            setColor("success");
            setOpenSnackbar(true);
            navigate({ to: '/', search: { page: 1, search: null } });
          } else {
            setMessage("Erreur lors de la suppression de la collection");
            setColor("error");
            setOpenSnackbar(true);
          }
        })
        .catch((error) => {
          setMessage("Erreur lors de la suppression de la collection");
          setColor("error");
          setOpenSnackbar(true);
          console.error(error)
        })
        .finally(() => setIsLoading(false));
    }
  }

  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  return <Grid size={8} pt={2}>
    <AdminPageHeader 
      title="Supprimer la collection" 
      icon={<DeleteIcon />} 
    />
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        mb: 3,
        borderRadius: 2,
        backgroundColor: 'action.hover',
        borderColor: 'warning.main',
        display: 'flex',
        gap: 2
      }}
    >
      <InfoOutlinedIcon color="warning" sx={{ fontSize: 28 }} />
      <Box>
        <Typography variant='subtitle1' fontWeight='bold' mb={0.5}>
          Attention : suppression définitive
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          Cette action supprimera la collection ainsi que tous les documents indexés. Cette opération est irréversible.
        </Typography>
      </Box>
    </Paper>
    {isOperationInProgress && (
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2,
          backgroundColor: 'rgba(211, 47, 47, 0.08)',
          borderColor: 'error.main',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5
        }}
      >
        <InfoOutlinedIcon color="error" />
        <Typography variant="body2" color="error.main" fontWeight="medium">
          Impossible de supprimer la collection : une opération d'indexation ou de réindexation est actuellement en cours.
        </Typography>
      </Paper>
    )}
    <Box>
      <Typography variant='body2' color='warning' mb={1}>
        Veuillez entrer le nom exact de la collection pour confirmer la suppression.
      </Typography>
      <TextField
        type='text'
        placeholder='confirmer le nom de la collection'
        autoFocus
        fullWidth
        disabled={isOperationInProgress}
        sx={{ mt: 2, mb: 2 }}
        onChange={(e) => setCollectionName(e.target.value.trim())}
      />
      <Button
        color='error'
        variant='contained'
        startIcon={<DeleteIcon />}
        disabled={isLoading || collectionName !== collection.name || isOperationInProgress}
        onClick={() => setIsDialogOpen(true)}
        sx={{
          px: 3,
          py: 1,
          borderRadius: 2,
          boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 6px 20px 0 rgba(0,0,0,0.15)',
          },
          transition: 'all 0.2s ease-in-out'
        }}
      >
        Confirmer la suppression
      </Button>
      <ConfirmationMessage
        open={openSnackbar}
        message={message}
        color={color}
        onClose={() => setOpenSnackbar(false)}
      />
    </Box>
    {/* Confirmation Dialog */}
    <Dialog
      open={isDialogOpen}
      onClose={() => setIsDialogOpen(false)}
      aria-labelledby="confirm-delete-title"
      aria-describedby="confirm-delete-description"
      slotProps={{
        paper: {
          sx: { borderRadius: 2, p: 1 }
        }
      }}
    >
      <DialogTitle id="confirm-delete-title" fontWeight="bold">
        Confirmer la suppression ?
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="confirm-delete-description">
          Voulez-vous vraiment supprimer la collection <b>{collection.name}</b> ? Cette action est irréversible et supprimera toutes les données associées.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setIsDialogOpen(false)} color="inherit">Annuler</Button>
        <Button onClick={handleDelete} color="warning" variant="contained" autoFocus>
          Supprimer
        </Button>
      </DialogActions>
    </Dialog>
  </Grid>
}
