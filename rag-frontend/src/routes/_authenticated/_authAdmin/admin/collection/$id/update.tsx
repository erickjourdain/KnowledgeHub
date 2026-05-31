import { useCallback, useEffect, useState } from 'react';
import { createFileRoute, useLoaderData, useRouter } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { 
  Box, 
  Button, 
  Divider, 
  FormControl, 
  FormLabel, 
  Grid, 
  TextField, 
  Typography 
} from '@mui/material'
import type { CollectionCreate, CollectionUpdate } from '@appTypes/Collection';
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
  });
  const queryClient = useQueryClient();
  const router = useRouter();
  const [openSnackbar, setOpenSnackbar] = useState<boolean>(false);

  const { isError, isPending, isSuccess, mutate } = useMutation({
    mutationFn: (data: CollectionUpdate) => {
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
      <Typography variant='h6'>
        Mise à jour de la collection
      </Typography>
      <Divider sx={{ mb: 2 }} />
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
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
          disabled={isPending}
        >
          {!isPending ? "Mettre à jour la collection" : "Mise à jour en cours..."}
        </Button>
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
