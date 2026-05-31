import { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { 
  Avatar, 
  Box, 
  Card, 
  CardActions, 
  CardContent, 
  CardHeader, 
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
import { grey, red } from '@mui/material/colors';
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
  const navigate = useNavigate({ from: Route.fullPath });
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [search, setSearch] = useState<string | undefined>(undefined)
  
  useEffect(() => {
    setPageCount(Math.floor((count - 1)/20) + 1);
  }, [count]);

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
        sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', width: 400, flexGrow: 1 }}
      >
        <InputBase
          sx={{ ml: 1, flex: 1 }}
          placeholder="recherche collection"
          value={search}
          onChange={handleSearchChange}
          inputProps={{ 'aria-label': 'search' }}
        />
        <IconButton 
          type="button" 
          sx={{ p: '10px' }}
          onClick={handleSearchClick}
          aria-label="search"
        >
          <SearchIcon />
        </IconButton>
      </Paper>
      <Box
        mt={2}
        sx={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
          gap: 2,
        }}
      >
        { 
          (isAdmin(auth.user) || isGestionnaire(auth.user)) &&
          <Card key='0' sx={{ backgroundColor: grey[800] }}>
            <CardHeader
              avatar={
                <IconButton color='primary' onClick={handleNewCollection}>
                  <AddIcon />
                </IconButton>
              }
              title='Ajouter une collection'
            />
            <CardContent>
              <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                Cliquer sur le bouton pour créer une collection
              </Typography>
            </CardContent>
          </Card>
        }
        {
          data.map(collection => {
            return (
              <Card key={collection.id}>
                <CardHeader
                  avatar={
                    <Avatar sx={{ bgcolor: red[500]}} aria-label='collection'>
                      { Array.from(collection.name[0])}
                    </Avatar>
                  }
                  title={collection.name}
                  subheader={
                    `créé le ${dayjs(collection.created_at).format('DD/MM/YYYY')}`
                  }
                />
                <CardContent>
                  <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                    { collection.description }
                  </Typography>
                  <Typography variant='body1' mt={2}>
                    { collection.documents_count > 1 ?
                      `${collection.documents_count} documents indéxés` :
                      `${collection.documents_count} document indéxé` 
                    }
                  </Typography>
                </CardContent>
                <CardActions 
                  sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end'}}
                >
                  <Tooltip title='chat'>
                    <IconButton 
                      size='small' 
                      color='primary'
                      onClick={() => handleChat(collection.id)}
                    >
                      <ChatIcon fontSize='small'/>
                  </IconButton>
                  </Tooltip>
                  <Tooltip title='documents'>
                    <IconButton 
                      size='small' 
                      color='primary'
                      onClick={() => handleDocument(collection.id)}
                    >
                      <ArticleIcon fontSize='small'/>
                    </IconButton>
                  </Tooltip>
                  <Tooltip title='administration'>
                    <IconButton 
                      size='small' 
                      color='primary'
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