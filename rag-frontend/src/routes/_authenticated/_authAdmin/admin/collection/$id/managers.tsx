import { useState } from 'react';
import {
  createFileRoute,
  useLoaderData,
  useNavigate,
  useParams,
  useRouter
} from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Typography
} from '@mui/material';
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
  type GridRowParams,
} from '@mui/x-data-grid';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import AdminPageHeader from '@components/AdminPageHeader';
import ConfirmationMessage from '@components/ConfirmationMessage';
import {
  addCollectionManager,
  deleteCollectionManager,
  fetchCollectionManagersStatut
} from '@api/collections';
import { fetchUsers } from '@api/users';
import type { UserAuth } from '@appTypes/User';

type RouteSearch = {
  page?: number;
  pageSize?: number;
}

export const Route = createFileRoute(
  '/_authenticated/_authAdmin/admin/collection/$id/managers',
)({
  validateSearch: (search: RouteSearch) => {
    return {
      page: search.page ? Number(search.page) : 1,
      pageSize: search.pageSize ? Number(search.pageSize) : 25
    }
  },
  loaderDeps: ({ search: { page, pageSize } }) => ({ page, pageSize }),
  loader: async ({ params, deps: { page, pageSize }, context: { queryClient } }) => {
    const users = await queryClient.ensureQueryData({
      queryKey: ['users', 'GESTIONNAIRE_ADMIN', page, pageSize],
      queryFn: () => fetchUsers(page, pageSize, true, null, ['GESTIONNAIRE', 'ADMIN'])
    });
    const authorization = await queryClient.ensureQueryData({
      queryKey: ['authorizedManagers', params.id, users.data.map(u => u.id).join(',')],
      queryFn: () => fetchCollectionManagersStatut(
        params.id,
        users.data.map(u => u.id)
      )
    });
    const usersAuth: UserAuth[] = users.data.map(user => {
      return {
        ...user,
        is_authorised: authorization.find(u => u.id === user.id)?.authorized || false
      }
    })
    return {
      data: usersAuth,
      count: users.count
    }
  },
  component: RouteComponent,
})

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function RouteComponent() {
  const router = useRouter();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const { id } =
    useParams({ from: '/_authenticated/_authAdmin/admin/collection/$id' });
  const { data, count } =
    useLoaderData({ from: '/_authenticated/_authAdmin/admin/collection/$id/managers' });
  const [paginationModel, setPaginationModel] = useState({
    page: 1,
    pageSize: 25
  });
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSnackbar, setShowSnackbar] = useState<boolean>(false);

  const handlePaginationChange = (model: GridPaginationModel) => {
    setPaginationModel(model);
    navigate({
      search: () => ({ page: model.page, pageSize: model.pageSize })
    })
  }

  const handleRowDoubleClick = async (params: GridRowParams) => {
    setIsUpdating(true);
    setErrorMessage(null);
    setShowSnackbar(false);
    try {
      if (params.row.is_authorised)
        await deleteCollectionManager(String(id), String(params.row.id));
      else
        await addCollectionManager(String(id), String(params.row.id));
      
      queryClient.resetQueries({
        queryKey: ['collections', String(id)]
      });
      queryClient.resetQueries({
        queryKey: ['authorizedManagers', String(id)]
      });
      router.invalidate();
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Une erreur est survenue lors de la mise à jour");
      setShowSnackbar(true);
    } finally {
      setIsUpdating(false);
    }
  }

  const columns: GridColDef[] = [
    { field: 'username', headerName: 'Nom', flex: 0.5 },
    { field: 'email', headerName: 'E-mail', flex: 1 },
    { field: 'role', headerName: 'Rôle', flex: 0.25 },
    {
      field: 'is_authorised',
      headerName: 'Gestionnaire',
      minWidth: 50,
      renderCell: (params) => {
        if (params.value) return <CheckIcon color='success' />
        else return <CloseIcon color='error' />
      }
    }
  ];

  return (
    <Grid size={8} pt={2}>
      <AdminPageHeader 
        title="Gestionnaires de la collection" 
        icon={<ManageAccountsIcon />} 
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
            Gestion des gestionnaires
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Double‑clic sur une ligne pour ajouter ou retirer les droits de gestion de cette collection à un utilisateur. Il doit y avoir au moins un gestionnaire par collection (rôle GESTIONNAIRE ou ADMIN).
          </Typography>
        </Box>
      </Paper>
      <Box>
        <Box display='flex' flexDirection='column'>
          <DataGrid
            columns={columns}
            rows={data}
            rowCount={count}
            paginationModel={paginationModel}
            paginationMode='server'
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            loading={isUpdating}
            onPaginationModelChange={handlePaginationChange}
            onRowDoubleClick={handleRowDoubleClick}
            sx={{ cursor: 'pointer' }}
          />
        </Box>
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
            Merci de patienter durant la mise à jour des données
          </DialogContent>
        </Dialog>
        <ConfirmationMessage
          open={showSnackbar}
          message={errorMessage || ''}
          color="error"
          onClose={() => setShowSnackbar(false)}
        />
      </Box>
    </Grid>
  )
}
