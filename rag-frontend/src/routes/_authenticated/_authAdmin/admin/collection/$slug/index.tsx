import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_authenticated/_authAdmin/admin/collection/$slug/',
)({
  beforeLoad: ({ params: { slug } }) => {
    throw redirect({
      to: '/admin/collection/$slug/documents',
      params: { slug },
      search: { page: 1, pageSize: 25 }
    });
  },
});
