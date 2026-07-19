import React, { useEffect } from 'react';
import { createFileRoute, Outlet, useNavigate, useLocation } from '@tanstack/react-router';
import { useSetAtom } from 'jotai';
import { collectionAtom } from '@store/collectionStore';
import {
  Container,
  Grid,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Tooltip,
  IconButton
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import FolderIcon from '@mui/icons-material/Folder';
import ErrorPage from '@components/ErrorPage';
import { fetchCollection } from '@api/collections';
import { isAdmin } from '@utils/security';
import { AppError } from '@utils/errors';

export const Route = createFileRoute(
  '/_authenticated/_authAdmin/admin/collection/$slug',
)({
  loader: async ({ params: { slug }, context: { auth, queryClient } }) => {
    try {
      const collection = await queryClient.ensureQueryData({
        queryKey: ['collections', String(slug)],
        queryFn: () => fetchCollection(slug)
      })
      if (isAdmin(auth.user) || (collection.manager_ids && auth.user && collection.manager_ids.includes(auth.user.id))) {
        return collection;
      } else {
        throw new AppError("Vous n'avez pas l'autorisation d'administrer cette collection.", 403);
      }
    } catch (err: any) {
      if (err instanceof AppError) {
        throw err;
      }
      const status = err?.response?.status || 500;
      const message = status === 404 
        ? "La collection d'administration demandée n'existe pas." 
        : (err.message || "Une erreur est survenue lors de la récupération de la collection.");
      throw new AppError(message, status);
    }
  },
  errorComponent: ({ error, reset }) => <ErrorPage error={error} reset={reset} />,
  component: RouteComponent,
})

type Item = {
  key: string
  label: string
  icon: React.ReactNode
  path: string
}

const ITEMS: Item[] = [
  {
    key: 'documents',
    label: 'Documents indexés',
    icon: <DescriptionIcon />,
    path: 'documents'
  },
  {
    key: 'new_doc',
    label: 'Insérer document',
    icon: <UploadFileIcon />,
    path: 'insert'
  },
  {
    key: 'users',
    label: 'Utilisateurs autorisés',
    icon: <PeopleIcon />,
    path: 'users'
  },
  {
    key: 'managers',
    label: 'Gestionnaires',
    icon: <ManageAccountsIcon />,
    path: 'managers'
  },
  {
    key: 'update',
    label: 'Mettre à jour',
    icon: <SettingsIcon />,
    path: 'update'
  },
  {
    key: 'reindex',
    label: 'Réindexer',
    icon: <AutorenewIcon />,
    path: 'reindex'
  },
  {
    key: 'delete',
    label: 'Supprimer',
    icon: <DeleteIcon />,
    path: 'delete'
  },
]

function RouteComponent() {
  const collection = Route.useLoaderData();
  const navigate = useNavigate();
  const { slug } = Route.useParams();
  const setCollection = useSetAtom(collectionAtom);
  const location = useLocation();
  const currentPath = location.pathname;

  useEffect(() => {
    setCollection(collection);
    return () => setCollection(null);
  }, [collection, setCollection]);

  const handleClick = (item: Item) => {
    navigate({ to: `/admin/collection/$slug/${item.path}`, params: { slug } })
  }

  return (
    <Container sx={{ width: '100%' }}>
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          mb: 3, 
          p: 2,
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.4) 100%)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <FolderIcon sx={{ color: 'primary.light', fontSize: '1.75rem' }} />
          <Typography 
            variant="h5" 
            fontWeight="700" 
            sx={{ 
              background: 'linear-gradient(135deg, #a5b4fc 0%, #818cf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 2px 10px rgba(99, 102, 241, 0.1)'
            }}
          >
            {collection.name}
          </Typography>
          {collection.description && (
            <Tooltip 
              title={
                <Box sx={{ p: 0.5 }}>
                  <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 'bold', color: 'primary.light' }}>
                    Description de la collection
                  </Typography>
                  <Typography variant="body2" color="inherit">
                    {collection.description}
                  </Typography>
                </Box>
              }
              arrow
              placement="right"
              enterDelay={100}
              leaveDelay={200}
              componentsProps={{
                tooltip: {
                  sx: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                    maxWidth: 300,
                  }
                },
                arrow: {
                  sx: {
                    color: 'rgba(15, 23, 42, 0.95)',
                  }
                }
              }}
            >
              <IconButton size="small" sx={{ color: 'text.secondary', '&:hover': { color: 'primary.light' } }}>
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
      <Grid container spacing={4} mt={2}>
        <Grid size={4} sx={{ position: 'sticky', top: '100px', alignSelf: 'flex-start' }}>
          <Box 
            sx={{ 
              p: 1.5,
              borderRadius: '16px',
              backgroundColor: 'rgba(15, 23, 42, 0.35)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.25)'
            }}
          >
            <List sx={{ py: 0 }}>
              {ITEMS.map((item) => {
                const isSelected = currentPath.endsWith(item.path);
                return (
                  <ListItem key={item.key} disablePadding sx={{ mb: 0.75, '&:last-child': { mb: 0 } }}>
                    <ListItemButton 
                      onClick={() => handleClick(item)}
                      selected={isSelected}
                      sx={{
                        borderRadius: '10px',
                        py: 1.25,
                        px: 2,
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        borderLeft: isSelected ? '3px solid' : '3px solid transparent',
                        borderColor: 'primary.light',
                        backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.08) !important' : 'transparent',
                        color: isSelected ? 'primary.light' : 'text.primary',
                        fontWeight: isSelected ? 600 : 500,
                        '&:hover': {
                          backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.12) !important' : 'rgba(255, 255, 255, 0.03)',
                          transform: 'translateX(4px)',
                        },
                        '& .MuiListItemIcon-root': {
                          color: isSelected ? 'primary.light' : 'text.secondary',
                          minWidth: '36px',
                          transition: 'color 0.2s',
                        },
                        '& .MuiListItemText-primary': {
                          fontSize: '0.9rem',
                          fontWeight: isSelected ? 600 : 500,
                        }
                      }}
                    >
                      <ListItemIcon>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText primary={item.label} />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        </Grid>
        <Outlet />
      </Grid>
    </Container>
  )
}