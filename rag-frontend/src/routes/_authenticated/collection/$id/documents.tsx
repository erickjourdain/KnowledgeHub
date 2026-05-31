import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Box, Divider, Typography } from '@mui/material';
import { fetchCollectionDocument } from '@api/collections';
import { 
  DataGrid, 
  type GridColDef, 
  type GridPaginationModel 
} from '@mui/x-data-grid';
import dayjs from 'dayjs';

type RouteSearch = {
  page?: number;
  pageSize?: number;
}

export const Route = createFileRoute(
  '/_authenticated/collection/$id/documents',
)({
  validateSearch: (search: RouteSearch) => {
    return {
      page: search.page ? Number(search.page) : 1,
      pageSize: search.pageSize ? Number(search.pageSize) : 25,
    }
  },
  loaderDeps: ({ search: { page, pageSize }}) => ({ page, pageSize }),
  loader: async ({ params, deps: { page, pageSize }, context:{ queryClient } }) => {
    return await queryClient.ensureQueryData({
      queryKey: ['collections', params.id, 'documents', page, pageSize ],
      queryFn: () => fetchCollectionDocument(params.id, page, pageSize)
    })
  },
  component: RouteComponent,
})

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function RouteComponent() {
  const navigate = useNavigate({ from:  Route.fullPath });
  const { data, count } = Route.useLoaderData();
  const [paginationModel, setPaginationModel] = useState({
    page: 1,
    pageSize: 25
  });

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
      valueGetter: (val) => dayjs(val).format('DD/MM/YYYY'),
      flex: 0.3 
    },
    { field: 'nb_chunks', headerName: 'Nb chunks', flex: 0.2}
  ]

  return (
    <Box>
      <Typography variant='h6'>
        Documents indexés dans la collection
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
    </Box>
  )
}
