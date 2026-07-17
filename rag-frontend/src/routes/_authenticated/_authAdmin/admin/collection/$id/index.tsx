import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_authenticated/_authAdmin/admin/collection/$id/',
)({
  beforeLoad: ({ params: { id } }) => {
    throw redirect({
      to: '/admin/collection/$id/documents',
      params: { id },
      search: { page: 1, pageSize: 25 }
    });
  },
});
