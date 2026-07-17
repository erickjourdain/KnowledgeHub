import { useState, useMemo, useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Box, Divider, Typography, Paper, InputBase, IconButton, Button, Stack } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { fetchCollectionDocument } from '@api/collections';
import { 
  DataGrid, 
  type GridColDef, 
  type GridPaginationModel,
  type GridRowSelectionModel
} from '@mui/x-data-grid';
import dayjs from 'dayjs';
import { useAtom } from 'jotai';
import { documentSelectionAtom } from '@store/documentSelectionStore';

type RouteSearch = {
  page?: number;
  pageSize?: number;
  search?: string;
}

export const Route = createFileRoute(
  '/_authenticated/collection/$id/documents',
)({
  validateSearch: (search: Record<string, unknown>): RouteSearch => {
    return {
      page: search.page ? Number(search.page) : 1,
      pageSize: search.pageSize ? Number(search.pageSize) : 25,
      search: (search.search as string) || undefined,
    }
  },
  loaderDeps: ({ search: { page, pageSize, search }}) => ({ page, pageSize, search }),
  loader: async ({ params, deps: { page, pageSize, search }, context:{ queryClient } }) => {
    return await queryClient.ensureQueryData({
      queryKey: ['collections', params.id, 'documents', page, pageSize, search ],
      queryFn: () => fetchCollectionDocument(params.id, page, pageSize, search || null)
    })
  },
  component: RouteComponent,
})

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function RouteComponent() {
  const navigate = useNavigate({ from: Route.fullPath });
  const { id } = Route.useParams();
  const { page, pageSize, search } = Route.useSearch();
  const { data, count } = Route.useLoaderData();
  
  const [searchInput, setSearchInput] = useState(search || '');
  const [selectionMap, setSelectionMap] = useAtom(documentSelectionAtom);

  const currentSelection = useMemo(() => {
    return selectionMap[id] || { mode: 'all_except', ids: [] };
  }, [selectionMap, id]);

  const [paginationModel, setPaginationModel] = useState({
    page: (page || 1) - 1, // DataGrid is 0-indexed
    pageSize: pageSize || 25
  });

  // Sync paginationModel with search parameters
  useEffect(() => {
    setPaginationModel({
      page: (page || 1) - 1,
      pageSize: pageSize || 25
    });
  }, [page, pageSize]);

  // Sync search input with searchParam
  useEffect(() => {
    setSearchInput(search || '');
  }, [search]);

  const handlePaginationChange = (model: GridPaginationModel) => {
    setPaginationModel(model);
    navigate({
      search: (prev) => ({ 
        ...prev, 
        page: model.page + 1, 
        pageSize: model.pageSize 
      })
    })
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({
      search: (prev) => ({ 
        ...prev, 
        page: 1, 
        search: searchInput.trim() || undefined 
      })
    });
  };

  const rowSelectionModel = useMemo<GridRowSelectionModel>(() => {
    return {
      type: currentSelection.mode === 'all_except' ? 'exclude' : 'include',
      ids: new Set(currentSelection.ids)
    };
  }, [currentSelection]);

  const handleRowSelectionModelChange = (newSelectionModel: GridRowSelectionModel) => {
    const nextMode = newSelectionModel.type === 'exclude' ? 'all_except' : 'none_except';
    const nextIds = Array.from(newSelectionModel.ids).map(Number);

    setSelectionMap((prev) => ({
      ...prev,
      [id]: {
        mode: nextMode,
        ids: nextIds
      }
    }));
  };

  const handleSelectAll = () => {
    setSelectionMap((prev) => ({
      ...prev,
      [id]: {
        mode: 'all_except',
        ids: []
      }
    }));
  };

  const handleDeselectAll = () => {
    setSelectionMap((prev) => ({
      ...prev,
      [id]: {
        mode: 'none_except',
        ids: []
      }
    }));
  };

  // Compute selected count
  const selectedCount = useMemo(() => {
    if (currentSelection.mode === 'all_except') {
      return Math.max(0, count - currentSelection.ids.length);
    } else {
      return currentSelection.ids.length;
    }
  }, [currentSelection, count]);

  const columns: GridColDef[] = [
    { field: 'title', headerName: 'Fichier', flex: 0.5 },
    { 
      field: 'created_at', 
      headerName: 'Date d\'insertion', 
      valueGetter: (val) => dayjs(val).format('DD/MM/YYYY'),
      flex: 0.3 
    },
    { field: 'nb_chunks', headerName: 'Nb chunks', flex: 0.2}
  ]

  return (
    <Box>
      <Typography variant='h6' display="flex" alignItems="center" gap={1.5} sx={{ fontWeight: 600 }}>
        <ManageSearchIcon color="primary" sx={{ fontSize: '1.8rem' }} /> Recherche avancée
      </Typography>
      <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5, mb: 2 }}>
        Sélectionnez ou désélectionnez les documents à inclure ou exclure de vos recherches. Par défaut, tous les documents de la collection sont inclus.
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }} alignItems="center" justifyContent="space-between">
        {/* Search Input Bar */}
        <Paper
          component="form"
          onSubmit={handleSearchSubmit}
          sx={{
            p: '2px 4px',
            display: 'flex',
            alignItems: 'center',
            width: { xs: '100%', md: 400 },
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            boxShadow: 'none',
            '&:hover': {
              borderColor: 'rgba(255, 255, 255, 0.15)',
            }
          }}
        >
          <InputBase
            sx={{ ml: 1, flex: 1, fontSize: '0.9rem' }}
            placeholder="Rechercher un document..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            inputProps={{ 'aria-label': 'rechercher un document' }}
          />
          <IconButton type="submit" sx={{ p: '8px', color: 'primary.light' }} aria-label="search">
            <SearchIcon fontSize="small" />
          </IconButton>
        </Paper>

        {/* Action Buttons */}
        <Stack direction="row" spacing={1.5} sx={{ width: { xs: '100%', md: 'auto' }, justifyContent: { xs: 'space-between', md: 'flex-end' } }}>
          <Button
            variant="outlined"
            size="medium"
            color="success"
            startIcon={<CheckCircleOutlineIcon />}
            onClick={handleSelectAll}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              borderColor: 'rgba(46, 125, 50, 0.3)',
              backgroundColor: 'rgba(46, 125, 50, 0.04)',
              '&:hover': {
                borderColor: 'success.main',
                backgroundColor: 'rgba(46, 125, 50, 0.08)',
              }
            }}
          >
            Sélectionner tout
          </Button>
          <Button
            variant="outlined"
            size="medium"
            color="error"
            startIcon={<HighlightOffIcon />}
            onClick={handleDeselectAll}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              borderColor: 'rgba(211, 47, 47, 0.3)',
              backgroundColor: 'rgba(211, 47, 47, 0.04)',
              '&:hover': {
                borderColor: 'error.main',
                backgroundColor: 'rgba(211, 47, 47, 0.08)',
              }
            }}
          >
            Tout désélectionner
          </Button>
        </Stack>
      </Stack>

      {/* Info Status Banner */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2,
          backgroundColor: 'action.hover',
          borderColor: 'info.main',
          display: 'flex',
          gap: 2,
          alignItems: 'center'
        }}
      >
        <InfoOutlinedIcon color="info" sx={{ fontSize: 24 }} />
        <Typography variant='body2' fontWeight='500' color='text.primary'>
          Statut : {selectedCount} document{selectedCount > 1 ? 's' : ''} sélectionné{selectedCount > 1 ? 's' : ''} pour la recherche (sur {count} au total)
        </Typography>
      </Paper>

      {/* Documents Data Table */}
      <Box display='flex' flexDirection='column'>
        <DataGrid
          columns={columns}
          rows={data}
          rowCount={count}
          paginationModel={paginationModel}
          paginationMode='server'
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPaginationModelChange={handlePaginationChange}
          checkboxSelection
          rowSelectionModel={rowSelectionModel}
          onRowSelectionModelChange={handleRowSelectionModelChange}
          disableRowSelectionOnClick
          autoHeight
          sx={{
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            },
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
            }
          }}
        />
      </Box>
    </Box>
  )
}
