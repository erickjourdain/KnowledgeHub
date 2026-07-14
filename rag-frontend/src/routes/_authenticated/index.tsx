import { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { 
  Avatar, 
  Box, 
  Card, 
  CardActions, 
  CardContent, 
  CardHeader, 
  Chip,
  IconButton, 
  InputBase, 
  Pagination, 
  Paper, 
  Stack, 
  Tooltip, 
  Typography 
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArticleIcon from '@mui/icons-material/Article';
import ChatIcon from '@mui/icons-material/Chat';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import { EmptyCollectionsState } from '@components/EmptyCollectionsState';
import { fetchCollections } from '@api/collections';
import dayjs from 'dayjs';
import { isAdmin, isGestionnaire } from '@utils/security';
import type { AuthState } from '@appTypes/AuthState';

type RouteSearch = {
  page?: number;
  search?: string | null;
}

export const Route = createFileRoute("/_authenticated/")({
  validateSearch: (search: RouteSearch) => {
    return {
      page: search.page ? Number(search.page) : 1,
      search: search.search || null
    }
  },
  loaderDeps: ({ search: { page, search }}) => {
    return { page, search }
  },
  loader: async ({ deps: { page, search }, context: { queryClient }}) => {
    return await queryClient.ensureQueryData({
      queryKey: ['collections', page, search],
      queryFn: () => fetchCollections(page, 20, search)
    })
  },
  component: Index,
});

function Index() {
  const { data, count } = Route.useLoaderData();
  const { auth }: { auth: AuthState } = Route.useRouteContext();
  const { search: searchParam } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [search, setSearch] = useState<string | undefined>(searchParam || undefined);
  
  useEffect(() => {
    setPageCount(Math.floor((count - 1)/20) + 1);
  }, [count]);

  useEffect(() => {
    setSearch(searchParam || undefined);
  }, [searchParam]);

  const handleNewCollection = () => navigate({ to: '/admin/collection/new'});

  const handleChangePage = ( 
    _event: React.ChangeEvent<unknown>,
    newPage: number
  ) => {
    setPage(newPage);
    navigate({
      search: (prev) => ({ ...prev, page: newPage })
    });
  }

  const handleSearchChange = ( event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  }

  const handleSearchClick = () => {
    setPage(1);
    navigate({
      search: (prev) => ({ ...prev, page: 1, search: search || null })
    });
  }

  const handleChat = (id: number) => {
    navigate({ to: '/collection/$id/chat', params: { id: String(id) }});
  }

  const handleDocument = (id: number) => {
    navigate({ 
      to: '/collection/$id/documents', 
      params: { id: String(id) },
      search: { page: 1, pageSize: 25 }
    });
  }

  const handleAdmin = (id: number) => {
    navigate({ to: '/admin/collection/$id', params: { id: String(id) }})
  }

  return (
    <Box>
      <Paper
        component="form"
        onSubmit={(e) => { e.preventDefault(); handleSearchClick(); }}
        sx={{ 
          p: '4px 16px', 
          display: 'flex', 
          alignItems: 'center', 
          width: 400, 
          maxWidth: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '30px',
          boxShadow: 'none',
          transition: 'all 0.2s ease-in-out',
          '&:focus-within': {
            borderColor: 'primary.main',
            boxShadow: '0 0 12px rgba(99, 102, 241, 0.2)',
          }
        }}
      >
        <InputBase
          sx={{ ml: 1, flex: 1, fontSize: '0.9rem' }}
          placeholder="Rechercher une collection..."
          value={search || ''}
          onChange={handleSearchChange}
          inputProps={{ 'aria-label': 'search' }}
        />
        <IconButton 
          type="button" 
          sx={{ p: '8px', color: 'primary.light' }}
          onClick={handleSearchClick}
          aria-label="search"
        >
          <SearchIcon fontSize="small" />
        </IconButton>
      </Paper>
      {data.length === 0 ? (
        <EmptyCollectionsState
          searchParam={searchParam}
          isAdminOrGestionnaire={isAdmin(auth.user) || isGestionnaire(auth.user)}
          onNewCollection={handleNewCollection}
        />
      ) : (
        <Box
          mt={3}
          sx={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))',
            gap: 3,
          }}
        >
          { 
            (isAdmin(auth.user) || isGestionnaire(auth.user)) &&
            <Card 
              key='0' 
              sx={{ 
                backgroundColor: 'rgba(99, 102, 241, 0.02)', 
                border: '2px dashed rgba(99, 102, 241, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                minHeight: '230px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'rgba(99, 102, 241, 0.06)',
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 24px rgba(99, 102, 241, 0.12)',
                  '& .add-icon-btn': {
                    backgroundColor: 'primary.main',
                    color: '#fff',
                  }
                }
              }}
              onClick={handleNewCollection}
            >
              <Box 
                className="add-icon-btn"
                sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: '50%', 
                  backgroundColor: 'rgba(99, 102, 241, 0.1)', 
                  color: 'primary.main', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  mb: 2,
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <AddIcon fontSize="medium" />
              </Box>
              <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 600, mb: 0.5 }}>
                Ajouter une collection
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: '220px' }}>
                Créez un nouvel espace pour vos documents et conversations
              </Typography>
            </Card>
          }
          {
            data.map(collection => {
              return (
                <Card 
                  key={collection.id}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '230px',
                    p: 0.5,
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      borderColor: 'rgba(99, 102, 241, 0.35)',
                      boxShadow: '0 12px 24px rgba(99, 102, 241, 0.15)',
                    }
                  }}
                >
                  <CardHeader
                    avatar={
                      <Avatar 
                        sx={{ 
                          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                          fontWeight: 'bold',
                          fontSize: '0.95rem'
                        }} 
                        aria-label='collection'
                      >
                        { Array.from(collection.name[0])}
                      </Avatar>
                    }
                    title={
                      <Typography variant="subtitle1" fontWeight="600" sx={{ letterSpacing: '0.1px' }}>
                        {collection.name}
                      </Typography>
                    }
                    subheader={
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Créé le {dayjs(collection.created_at).format('DD/MM/YYYY')}
                      </Typography>
                    }
                  />
                  <CardContent sx={{ pt: 0, pb: 1, flexGrow: 1 }}>
                    <Typography variant='body2' sx={{ color: 'text.secondary', minHeight: '40px', lineBreak: 'anywhere' }}>
                      { collection.description || "Aucune description fournie pour cette collection." }
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
                      <Chip 
                        icon={<ArticleIcon sx={{ fontSize: '0.85rem !important' }} />}
                        label={collection.documents_count > 1 ?
                          `${collection.documents_count} documents` :
                          `${collection.documents_count} document` 
                        }
                        size="small"
                        variant="outlined"
                        sx={{ 
                          borderColor: 'rgba(255, 255, 255, 0.1)', 
                          color: 'text.secondary',
                          fontSize: '0.72rem',
                          height: '24px',
                          '& .MuiChip-icon': { color: 'primary.light' }
                        }}
                      />
                    </Box>
                  </CardContent>
                  <CardActions 
                    sx={{ 
                      display: 'flex', 
                      flexDirection: 'row', 
                      justifyContent: 'flex-end', 
                      gap: 1, 
                      pt: 1, 
                      px: 2, 
                      pb: 1.5 
                    }}
                  >
                    <Tooltip title='Chat'>
                      <IconButton 
                        size='small' 
                        sx={{ 
                          color: 'primary.light',
                          backgroundColor: 'rgba(99, 102, 241, 0.05)',
                          '&:hover': {
                            backgroundColor: 'primary.main',
                            color: '#fff',
                          }
                        }}
                        onClick={() => handleChat(collection.id)}
                      >
                        <ChatIcon fontSize='small'/>
                      </IconButton>
                    </Tooltip>
                    <Tooltip title='Documents'>
                      <IconButton 
                        size='small' 
                        sx={{ 
                          color: 'primary.light',
                          backgroundColor: 'rgba(99, 102, 241, 0.05)',
                          '&:hover': {
                            backgroundColor: 'primary.main',
                            color: '#fff',
                          }
                        }}
                        onClick={() => handleDocument(collection.id)}
                      >
                        <ArticleIcon fontSize='small'/>
                      </IconButton>
                    </Tooltip>
                    <Tooltip title='Administration'>
                      <IconButton 
                        size='small' 
                        sx={{ 
                          color: 'text.secondary',
                          backgroundColor: 'rgba(255, 255, 255, 0.02)',
                          '&:hover': {
                            backgroundColor: 'secondary.main',
                            color: '#fff',
                          }
                        }}
                        onClick={() => handleAdmin(collection.id)}
                      >
                        <SettingsIcon fontSize='small'/>
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              )
            })
          }
        </Box>
      )}
      {
        (page > 1) &&
        <Stack spacing={2} mt={2}>
          <Pagination 
            page={page}
            count={pageCount} 
            color='primary'
            showFirstButton
            showLastButton
            onChange={handleChangePage}
          />
        </Stack>
      }
    </Box>
  );
}