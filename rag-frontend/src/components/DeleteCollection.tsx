import { Box, Button, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { deleteCollection } from "@api/collections";
import type { CollectionDetail } from "@appTypes/Collection";
import ConfirmationMessage from "./ConfirmationMessage";

type DeleteCollectionProps =
  {
    collection: CollectionDetail
    onDelete: (statut: boolean) => void
  }

function DeleteCollection({ collection, onDelete }: DeleteCollectionProps) {
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
            onDelete(true);
          } else throw new Error("Erreur lors de la suppression de la collection");
        })
        .catch((error) => {
          setMessage("Erreur lors de la suppression de la collection");
          setColor("error");
          setOpenSnackbar(true);
          onDelete(false);
          console.error(error)
        })
        .finally(() => setIsLoading(false));
    }
  }

  return (
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
  )
}

export default DeleteCollection;