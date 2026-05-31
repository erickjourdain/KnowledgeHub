import { useCallback, useState } from 'react';
import { 
  createFileRoute, 
  useLoaderData, 
  useNavigate, 
  useRouter 
} from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { 
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider, 
  Grid, 
  IconButton,
  Typography 
} from '@mui/material';
import DeleteIcon from "@mui/icons-material/Delete";
import { DataGrid, type GridColDef, type GridPaginationModel, type GridRenderCellParams } from '@mui/x-data-grid';
import ConfirmationDialog from '@components/ConfirmationDialog';
import ConfirmationMessage from '@components/ConfirmationMessage';
import { deleteDocument, fetchCollectionDocument } from '@api/collections';
import type { Document } from "@appTypes/Document";

type RouteSearch = {
  page?: number;
  pageSize?: number;
}

export const Route = createFileRoute(
  '/_authenticated/_authAdmin/admin/collection/$id/documents',
)({
  validateSearch: (search: RouteSearch) => {
    return {
      page: search.page ? Number(search.page) : 1,
      pageSize: search.pageSize ? Number(search.pageSize) : 25
    }
  },
  loaderDeps: ({ search: { page, pageSize } }) => ({ page, pageSize }),
  loader: async ({params, deps: {page, pageSize}, context: {queryClient}}) => {
    return await queryClient.ensureQueryData({
      queryKey: ['collections', params.id, 'documents', page, pageSize ],
      queryFn: () => fetchCollectionDocument(params.id, page, pageSize)
    });
  },
  component: RouteComponent,
})

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function RouteComponent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: Route.fullPath });
  const collection = useLoaderData({ 
    from: '/_authenticated/_authAdmin/admin/collection/$id'
  });
  const { data, count } = useLoaderData({ 
    from: '/_authenticated/_authAdmin/admin/collection/$id/documents'}
  );
  const [paginationModel, setPaginationModel] = useState({
    page: 1,
    pageSize: 25
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [openSnackbar, setOpenSnackbar] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [color, setColor] = useState<"success" | "error">("success");

  const handleConfirmationDeleteDocument = useCallback((confirmed?: boolean) => {
    setOpenDialog(false);
    if (confirmed && documentToDelete) {
      deleteDocument(String(collection.id), String(documentToDelete.id))
        .then((response) => {
          if (response.status) {
            setMessage("Document supprimé avec succès");
            setColor("success");
            setOpenSnackbar(true);
            queryClient.resetQueries({ 
              queryKey: ['collections', String(collection.id), 'documents', paginationModel.page, paginationModel.pageSize]
            });
            router.invalidate();
          } else throw new Error("Erreur lors de la suppression du document");
        })
        .catch((error) => {
          setMessage("Erreur lors de la suppression du document");
          setColor("error");
          setOpenSnackbar(true);
          console.error(error)
        })
        .finally(() => setDocumentToDelete(null));
    }
  }, [documentToDelete]);

  const handlePaginationChange = (model: GridPaginationModel) => {
    setPaginationModel(model);
    navigate({
      search: () => ({ page: model.page, pageSize: model.pageSize })
    })
  }

  const columns: GridColDef[] = [
    { field: 'title', headerName: 'Fichier', flex: 0.5 },
    { 
      field: 'created_at', 
      headerName: 'Date insertion', 
      valueGetter: (val) => dayjs(val).format('DD/MM/YYYY à HH:mm'),
      flex: 0.3 
    },
    { 
      field: 'id', 
      headerName: 'Supprimer',
      align: 'center',
      renderCell: (params: GridRenderCellParams<any, number>) => (
        <IconButton 
          aria-label="delete" 
          color="warning" 
          onClick={() => {
            setDocumentToDelete(data.find(d => d.id === params.value) || null);
            setOpenDialog(true);
          }}
        >
          <DeleteIcon />
        </IconButton>
      ),
      flex: 0.2
    }
  ]

  if (data.length === 0) return (
    <Typography variant="caption">
      Aucun document indexé
    </Typography>
  )

  return (
    <Grid size={8} pt={2}>
      <Typography variant='h6'>
        Documents indexés
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Box display='flex' flexDirection='column'>
        <DataGrid
          columns={columns}
          rows={data}
          rowCount={count}
          paginationModel={paginationModel}
          paginationMode='server'
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPaginationModelChange={handlePaginationChange}
        />
      </Box>
      <ConfirmationDialog
        id="confirmation-delete-document"
        title="Supprimer le document"
        message={`Êtes-vous sûr de vouloir supprimer le document "${documentToDelete?.title}" ?`}
        open={openDialog}
        onClose={handleConfirmationDeleteDocument}
      />
      <ConfirmationMessage
        open={openSnackbar}
        message={message}
        color={color}
        onClose={() => setOpenSnackbar(false)}
      />
      <Dialog 
        maxWidth='xs'
        fullWidth
        open={isUpdating}
        onClose={(_event, reason) => {
          if (reason !== 'backdropClick' && reason !== 'escapeKeyDown')
            setIsUpdating(false);
        }}
      >
      <DialogTitle>Mise à jour</DialogTitle>
        <DialogContent>
          Merci de patientier durant la mise à jour des données
        </DialogContent>
      </Dialog>
    </Grid>
  )
}
