import React from 'react';
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router';
import {
  Container,
  Grid,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import DeleteIcon from '@mui/icons-material/Delete';
import ErrorPage from '@components/ErrorPage';
import { fetchCollection } from '@api/collections';
import { isAdmin, isCreator } from '@utils/security';
import { AppError } from '@utils/errors';

export const Route = createFileRoute(
  '/_authenticated/_authAdmin/admin/collection/$id',
)({
  loader: async ({ params: { id }, context: { auth, queryClient } }) => {
    try {
      const collection = await queryClient.ensureQueryData({
        queryKey: ['collections', String(id)],
        queryFn: () => fetchCollection(id)
      })
      if (isAdmin(auth.user) || isCreator(auth.user, collection.creator_id)) {
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
  const { id } = Route.useParams();

  const handleClick = (item: Item) => {
    navigate({ to: `/admin/collection/$id/${item.path}`, params: { id } })
  }

  return (
    <Container sx={{ width: '100%' }}>
      <Typography variant='h5'>
        Administrer la collection <b>{collection.name}</b>
      </Typography>
      <Grid container mt={2}>
        <Grid size={4} spacing={1}>
          <List>
            {ITEMS.map((item) => (
              <ListItem key={item.key}>
                <ListItemButton onClick={() => handleClick(item)}>
                  <ListItemIcon>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Grid>
        <Outlet />
      </Grid>
    </Container>
  )
}