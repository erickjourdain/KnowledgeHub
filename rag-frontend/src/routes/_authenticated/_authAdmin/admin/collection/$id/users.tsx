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
  Divider, 
  Grid, 
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
import { 
  addCollectionUser, 
  deleteCollectionUser, 
  fetchCollectionUsersStatut 
} from '@api/collections';
import { fetchUsers } from '@api/users';
import type { UserAuth } from '@appTypes/User';

type RouteSearch = {
  page?: number;
  pageSize?: number;
}

export const Route = createFileRoute(
  '/_authenticated/_authAdmin/admin/collection/$id/users',
)({
  validateSearch: (search: RouteSearch) => {
    return {
      page: search.page ? Number(search.page) : 1,
      pageSize: search.pageSize ? Number(search.pageSize) : 25
    }
  },
  loaderDeps: ({ search: { page, pageSize } }) => ({ page, pageSize }),
  loader: async ({ params, deps: { page, pageSize }, context: {queryClient }}) => {
    const users = await queryClient.ensureQueryData({
      queryKey: ['users'],
      queryFn: () => fetchUsers(page, pageSize, true)
    });
    const authorization =await queryClient.ensureQueryData({
      queryKey: ['authorizedUsers', params.id, users.data.map(u => u.id).join(',')],
      queryFn: () => fetchCollectionUsersStatut(
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
    useParams({ from: '/_authenticated/_authAdmin/admin/collection/$id'});
  const { data, count } = 
    useLoaderData({ from: '/_authenticated/_authAdmin/admin/collection/$id/users'});
  const [paginationModel, setPaginationModel] = useState({
    page: 1,
    pageSize: 25
  });
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const handlePaginationChange = (model: GridPaginationModel) => {
    setPaginationModel(model);
    navigate({
      search: () => ({ page: model.page, pageSize: model.pageSize })
    })
  }

  const handleRowDoubleClick = async (params: GridRowParams) => {
    setIsUpdating(true);
    try {
      if (params.row.is_authorised) 
        await deleteCollectionUser(String(id), String(params.row.id));
      else 
        await addCollectionUser(String(id), String(params.row.id));
      queryClient.resetQueries({ 
        queryKey: ['authorizedUsers', String(id), data.map(d => d.id).join(',')]
      });
      router.invalidate();
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  }

  const columns: GridColDef[] = [
    { field: 'username', headerName: 'Nom', flex: 0.5},
    { field: 'email', headerName: 'E-mail', flex: 1},
    { field: 'role', headerName: 'Rôle', flex: 0.25},
    { 
      field: 'is_authorised', 
      headerName: 'Autorisé', 
      minWidth: 50, 
      renderCell: (params) => {
        if (params.value) return <CheckIcon color='success' />
        else return <CloseIcon color='error' />
      }
    }
  ];

  return (
    <Grid size={8} pt={2}>
      <Typography variant='h6'>
        Gestion des utilisateurs
      </Typography>
      <Divider sx={{ mb: 2 }} />
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
            Merci de patientier durant la mise à jour des données
          </DialogContent>
        </Dialog>
      </Box>
    </Grid>
  )
}
