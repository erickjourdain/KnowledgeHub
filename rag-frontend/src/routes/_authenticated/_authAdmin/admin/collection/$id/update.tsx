import { useCallback, useEffect, useState } from 'react';
import { createFileRoute, useLoaderData, useRouter } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, type SubmitHandler } from 'react-hook-form';
import {
  Box,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  FormLabel,
  Grid,
  Paper,
  TextField,
  Typography
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SettingsIcon from '@mui/icons-material/Settings';
import type { CollectionCreate, CollectionUpdate, Collection } from '@appTypes/Collection';
import { updateCollection } from '@api/collections';
import ConfirmationMessage from '@components/ConfirmationMessage';

export const Route = createFileRoute(
  '/_authenticated/_authAdmin/admin/collection/$id/update',
)({
  component: RouteComponent,
});

function RouteComponent() {
  const collection = useLoaderData({
    from: '/_authenticated/_authAdmin/admin/collection/$id'
  }) as Collection | undefined;
  if (!collection) {
    return <Typography variant='h6'>Collection introuvable</Typography>;
  }
  const queryClient = useQueryClient();
  const router = useRouter();
  const [openSnackbar, setOpenSnackbar] = useState<boolean>(false);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  const { isError, isPending, isSuccess, mutate } = useMutation({
    mutationFn: (data: CollectionUpdate) => {
      // collection is guaranteed to exist due to the guard above
      return updateCollection(data, String(collection.id));
    }
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm<CollectionCreate>({
    defaultValues: {
      name: collection.name,
      description: collection.description,
      modele: collection.modele
    }
  });

  useEffect(() => {
    if (isError) {
      setError("root", {
        message: "Erreur lors de la mise à jour de la collection"
      });
      setOpenSnackbar(true);
    }
  }, [isError]);

  useEffect(() => {
    if (isSuccess) {
      setOpenSnackbar(true);
      queryClient.resetQueries({ queryKey: ['collections'] });
      queryClient.resetQueries({ queryKey: ['collections', String(collection.id)] });
      router.invalidate();
    }
  }, [isSuccess]);

  const onSubmit: SubmitHandler<CollectionCreate> = useCallback((data) => {
    mutate({
      name: data.name,
      description: data.description
    });
    setIsDialogOpen(false);
  }, []);

  const collectionNameErrorMessage = (): React.ReactNode | null => {
    if (errors.name) {
      let message = "";
      switch (errors.name.type) {
        case "required":
          message = "Le nom de la collection est obligatoire";
          break;
        case "minLength":
          message = "Le nom de la collection doit contenir au moins 5 caractères";
          break;
        case "maxLength":
          message = "Le nom de la collection ne peut contenir plus de 25 cractères";
          break;
        case "pattern":
          message = "Le nom de la colection ne peut contenir de blanc ou caractères spéciaux";
          break;
        default:
          message = "Le nom de la collection n'est pas correct";
          break;
      }
      return (
        <Typography color="error" variant="caption">
          {message}
        </Typography>
      )
    }
    return null
  }

  const descriptionErrorMessage = (): React.ReactNode | null => {
    if (errors.description) {
      let message = "";
      switch (errors.description.type) {
        case "minLength":
          message = "Le nom de la description doit contenir au moins 25 caractères";
          break;
        case "maxLength":
          message = "Le nom de la description ne peut contenir plus de 128 cractères";
          break;
      }
      return (
        <Typography color="error" variant="caption">
          {message}
        </Typography>
      )
    }
    return null
  }

  return (
    <Grid size={8} pt={2}>
      <Typography variant='h6' display="flex" alignItems="center" gap={1}>
        <SettingsIcon color="primary" /> Mise à jour de la collection
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          backgroundColor: 'action.hover',
          borderColor: 'info.main',
          display: 'flex',
          gap: 2
        }}
      >
        <InfoOutlinedIcon color="info" sx={{ fontSize: 28 }} />
        <Box>
          <Typography variant='subtitle1' fontWeight='bold' mb={0.5}>
            Qu’est‑ce que ça fait ?
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Modifier les métadonnées de la collection (nom, description, modèle). Vous pouvez également mettre à jour les paramètres d’ingestion.
          </Typography>
        </Box>
      </Paper>
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        sx={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          gap: 2,
        }}
      >
        <FormControl>
          <FormLabel htmlFor="colletion_name">Nom</FormLabel>
          <TextField
            type="text"
            autoFocus
            required
            fullWidth
            variant="outlined"
            size="small"
            placeholder="Entrer le nom de la collection"
            color={errors.name ? "error" : "primary"}
            helperText={errors.name ? collectionNameErrorMessage() : ""}
            {
            ...register("name", {
              required: "Le nom de la collection est obligatoire.",
              minLength: 5,
              maxLength: 25,
              pattern: /^[a-zA-Z0-9_-]+$/
            })
            }
          />
        </FormControl>
        <FormControl>
          <FormLabel htmlFor="description">Description</FormLabel>
          <TextField
            type="text"
            autoFocus
            fullWidth
            size="small"
            multiline
            rows={2}
            variant="outlined"
            placeholder="Description du contenu de la collection"
            color={errors.description ? "error" : "primary"}
            helperText={errors.description ? descriptionErrorMessage() : ""}
            {
            ...register("description", {
              minLength: 25,
              maxLength: 128
            })
            }
          />
        </FormControl>
        {errors.root && (
          <Typography variant="inherit" color="error">
            {errors.root?.message}
          </Typography>
        )}
        <FormControl>
          <FormLabel htmlFor="model">Modèle</FormLabel>
          <TextField
            type="text"
            autoFocus
            fullWidth
            size="small"
            variant="outlined"
            disabled
            {...register("modele")}
          />
        </FormControl>
        <Button
          color="primary"
          variant="contained"
          startIcon={<SettingsIcon />}
          sx={{
            px: 3,
            py: 1,
            borderRadius: 2,
            boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: '0 6px 20px 0 rgba(0,0,0,0.15)'
            },
            transition: 'all 0.2s ease-in-out',
            mt: 3,
            mb: 2,
            width: 'auto',
            alignSelf: 'flex-start'
          }}
          disabled={isPending}
          onClick={() => setIsDialogOpen(true)}
        >
          {!isPending ? "Mettre à jour" : "Mise à jour en cours..."}
        </Button>
        <Dialog
          open={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          aria-labelledby="confirm-update-title"
          aria-describedby="confirm-update-description"
          slotProps={{
            paper: {
              sx: { borderRadius: 2, p: 1 }
            }
          }}
        >
          <DialogTitle id="confirm-update-title" fontWeight="bold">
            Confirmer la mise à jour ?
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="confirm-update-description">
              Êtes‑vous sûr de vouloir appliquer les modifications à la collection <b>{collection?.name}</b> ?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsDialogOpen(false)} color="inherit">Annuler</Button>
            <Button onClick={handleSubmit(onSubmit)} color="primary" variant="contained" autoFocus>
              Confirmer
            </Button>
          </DialogActions>
        </Dialog>
        <ConfirmationMessage
          open={openSnackbar}
          message={isSuccess ? "Collection mise à jour avec succès" : "Erreur lors de la mise à jour de la collection"}
          color={isSuccess ? "success" : "error"}
          onClose={() => setOpenSnackbar(false)}
        />
      </Box>
    </Grid>
  )
}
