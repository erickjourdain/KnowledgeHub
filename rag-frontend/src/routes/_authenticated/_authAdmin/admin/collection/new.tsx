import { Box, Button, Container, FormControl, FormLabel, Paper, TextField, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import type { CollectionCreate } from '@appTypes/Collection';
import { createCollection } from '@api/collections';

export const Route = createFileRoute('/_authenticated/_authAdmin/admin/collection/new')({
  component: AdminCollectionComponent,
})

function AdminCollectionComponent() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm<CollectionCreate>();

  const onSubmit: SubmitHandler<CollectionCreate> = useCallback((data) => {
    setIsLoading(true);
    if (data.description?.trim().length === 0) data.description = undefined;
    createCollection(data)
      .then(data => {
        console.log("collection créée avec succès", data);
        queryClient.resetQueries({ 
          queryKey: ['collections', 1, null]
        });
        navigate({ to: "/", search: { page: 1, search: null } });
      })
      .catch((error) => {
        console.error(error);
        setError("root", {
          message: "Erreur lors de l'enregistrement de la collection"
        })
      })
      .finally(() => setIsLoading(false))
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
    <Container sx={{ width: '100%' }}>
      <Typography variant="h5">
        Créer une nouvelle collection
      </Typography>
      <Paper sx={{ p: 2, m: "auto", mt: 2, maxWidth: "500px" }}>
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
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isLoading}
          >
            {!isLoading ? "Créer la collection" : "Création en cours..."}
          </Button>
        </Box>
      </Paper>
    </Container>
  )
}
