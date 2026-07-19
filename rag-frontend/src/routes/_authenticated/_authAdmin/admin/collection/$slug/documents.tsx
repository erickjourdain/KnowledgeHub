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
  Grid,
  IconButton,
  Paper,
  Typography
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import DeleteIcon from "@mui/icons-material/Delete";
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { DataGrid, type GridColDef, type GridPaginationModel, type GridRenderCellParams } from '@mui/x-data-grid';
import ConfirmationDialog from '@components/ConfirmationDialog';
import ConfirmationMessage from '@components/ConfirmationMessage';
import AdminPageHeader from '@components/AdminPageHeader';
import { deleteDocument, fetchCollectionDocument } from '@api/collections';
import type { Document } from "@appTypes/Document";
import { useAtomValue } from 'jotai';
import { jobIngestionIdsAtom } from '@store/jobIngestionStore';
import { jobReindexIdsAtom } from '@store/jobReindexStore';

type RouteSearch = {
  page?: number;
  pageSize?: number;
}

export const Route = createFileRoute(
  '/_authenticated/_authAdmin/admin/collection/$slug/documents',
)({
  validateSearch: (search: RouteSearch) => {
    return {
      page: search.page ? Number(search.page) : 1,
      pageSize: search.pageSize ? Number(search.pageSize) : 25
    }
  },
  loaderDeps: ({ search: { page, pageSize } }) => ({ page, pageSize }),
  loader: async ({ params, deps: { page, pageSize }, context: { queryClient } }) => {
    return await queryClient.ensureQueryData({
      queryKey: ['collections', params.slug, 'documents', page, pageSize],
      queryFn: () => fetchCollectionDocument(params.slug, page, pageSize)
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
    from: '/_authenticated/_authAdmin/admin/collection/$slug'
  });
  const { data, count } = useLoaderData({
    from: '/_authenticated/_authAdmin/admin/collection/$slug/documents'
  });
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

  const ingestionIds = useAtomValue(jobIngestionIdsAtom);
  const reindexIds = useAtomValue(jobReindexIdsAtom);
  const isOperationInProgress = ingestionIds.length > 0 || reindexIds.length > 0;

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
              queryKey: ['collections', collection.slug]
            });
            queryClient.resetQueries({
              queryKey: ['collections', { slug: collection.slug }]
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
          disabled={isOperationInProgress}
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

  return (
    <Grid size={8} pt={2}>
      <AdminPageHeader 
        title="Documents indexés" 
        icon={<DescriptionIcon />} 
      />
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
            Liste des documents
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Voici la liste des documents indexés dans la collection. Cliquer sur l'icône de suppression pour supprimer un document. La suppression est définitive.
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
            La suppression de documents est désactivée car une opération d'indexation ou de réindexation est actuellement en cours.
          </Typography>
        </Paper>
      )}
      <Box display='flex' flexDirection='column'>
        {data.length === 0 && (
          <Paper
            variant='outlined'
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
            <WarningAmberIcon color='warning' sx={{ fontSize: 28 }} />
            <Typography variant='body2'>
              Aucun document indexé
            </Typography>
          </Paper>
        )}
        {data.length > 0 && (
          <DataGrid
            columns={columns}
            rows={data}
            rowCount={count}
            paginationModel={paginationModel}
            paginationMode='server'
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPaginationModelChange={handlePaginationChange}
          />
        )}
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
