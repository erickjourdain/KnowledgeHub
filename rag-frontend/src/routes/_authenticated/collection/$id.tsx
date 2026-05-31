import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import {
  Box,
  Container,
  Typography
} from '@mui/material'
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant='h5' mb={2}>
          {collection.name}
        </Typography>
      </Box>
      <Outlet />
    </Container>
  )
}
