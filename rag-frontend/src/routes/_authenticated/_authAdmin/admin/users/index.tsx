import { useState } from 'react';
import { activateUser, deactivateUser, fetchUsers } from '@api/users';
import { createFileRoute, useLoaderData, useNavigate, useRouter } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Box, Divider, Grid, IconButton, Typography } from '@mui/material';

type RouteSearch = {
  page?: number;
  pageSize?: number;
  search?: string;
}

export const Route = createFileRoute(
  '/_authenticated/_authAdmin/admin/users/'
)({
  validateSearch: (search: RouteSearch) => {
    return {
      page: search.page ? Number(search.page) : 1,
      pageSize: search.pageSize ? Number(search.pageSize) : 25,
      search: search.search || null
    }
  },
  loaderDeps: ({ search: { page, pageSize, search } }) => ({ page, pageSize, search }),
  loader: async ({ deps: { page, pageSize, search }, context: { queryClient } }) => {
    return await queryClient.ensureQueryData({
      queryKey: ['users', { page, pageSize, search }],
      queryFn: () => fetchUsers(page, pageSize, null, search)
    });
  },
  component: RouteComponent,
})

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function RouteComponent() {
  const router = useRouter();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const { data, count } = 
    useLoaderData({ from: '/_authenticated/_authAdmin/admin/users/' }) || 
    { data: [], count: 0 };
  const [paginationModel, setPaginationModel] = useState({
    page: 1,
    pageSize: 25
  });
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const handlePaginationChange = (model: GridPaginationModel) => {
    setPaginationModel(model);
    navigate({
      search: () => ({ 
        page: model.page, 
        pageSize: model.pageSize,
        search: null
      })
    })
  }

  const handleRowDoubleClick = async (params: any) => {
    setIsUpdating(true);
    try {
      if (params.row.is_active) {
        await deactivateUser(params.row.id);
      } else {
        await activateUser(params.row.id);
      }
      queryClient.resetQueries({ queryKey: ['users', { 
        page: paginationModel.page + 1, 
        pageSize: paginationModel.pageSize, 
        search: null 
      }]});
      router.invalidate();
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  }

  const handleShowUser = (userId: number) => {
    navigate({
      to: '/admin/users/$id',
      params: { id: String(userId) }
    })
  }

  const columns: GridColDef[] = [
    { 
      field: 'id', 
      headerName: 'ID', 
      minWidth: 25,
      renderCell: (params) => (
        <IconButton 
          id={`show-user-${params.row.id}`}
          key={params.row.id}
          onClick={() => handleShowUser(params.row.id)}
        >
          <VisibilityIcon color='primary' />
        </IconButton>
      )
    },
    { field: 'username', headerName: 'Nom', flex: 0.5},
    { field: 'email', headerName: 'E-mail', flex: 0.5},
    { field: 'role', headerName: 'Rôle', flex: 0.25},
    { 
      field: 'is_active', 
      headerName: 'Actif', 
      minWidth: 25, 
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
      </Box>
    </Grid>
  )
}
