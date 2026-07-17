import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import {
  Box,
  Container,
  Typography,
  Tooltip,
  IconButton
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import FolderIcon from '@mui/icons-material/Folder';
import { fetchCollection } from '@api/collections';
import { collectionAtom } from '@store/collectionStore';


export const Route = createFileRoute('/_authenticated/collection/$id')({
  loader: async ({ params, context: { queryClient } }) => {
    return await queryClient.ensureQueryData({
      queryKey: ['collections', { id: params.id }],
      queryFn: () => fetchCollection(params.id)
    })
  },
  component: RouteComponent,
})

function RouteComponent() {
  const collection = Route.useLoaderData();
  const setCollection = useSetAtom(collectionAtom);

  useEffect(() => {
    setCollection(collection);

    return () => setCollection(null);
  }, [collection]);

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
      <Outlet />
    </Container>
  )
}
