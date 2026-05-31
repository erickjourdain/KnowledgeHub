import { useState } from 'react';
import { createFileRoute, useLoaderData, useNavigate } from '@tanstack/react-router';
import { Box, Button, Divider, Grid, TextField, Typography } from '@mui/material';
import ConfirmationMessage from '@components/ConfirmationMessage';
import { deleteCollection } from '@api/collections';

export const Route = createFileRoute(
  '/_authenticated/_authAdmin/admin/collection/$id/delete',
)({
  component: RouteComponent,
})

function RouteComponent() {
  const collection = useLoaderData({ 
    from: '/_authenticated/_authAdmin/admin/collection/$id'
  });
  const navigate = useNavigate();
  const [collectionName, setCollectionName] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [openSnackbar, setOpenSnackbar] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [color, setColor] = useState<"success" | "error">("success");

    const handleDelete = () => {
    if (collection.name === collectionName) {
      setIsLoading(true)
      deleteCollection(String(collection.id))
        .then((response) => {
          if (response.message) {
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
  
  return (
    <Grid size={8} pt={2}>
      <Typography variant='h6'>
        Suppression de la collection
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Box>
        <Typography variant='h6' color='warning'>
          Attention: Zone de danger
        </Typography>
        <Typography variant='body2'>
          Si vous souhaitez supprimer la collection et tous les documents indéxés dans celle-ci, entrer le nom de la collection pour confirmer.
        </Typography>
        <TextField
          type='text'
          placeholder='confirmer le nom de la collection'
          autoFocus
          fullWidth
          sx={{ mt: 2, mb: 2 }}
          onChange={(e) => setCollectionName(e.target.value.trim())}
        />
        <Button
          color='warning'
          variant='contained'
          disabled={isLoading}
          onClick={handleDelete}
        >
          confirmer
        </Button>
        <ConfirmationMessage
          open={openSnackbar}
          message={message}
          color={color}
          onClose={() => setOpenSnackbar(false)}
        />
      </Box>
    </Grid>
  )
}
