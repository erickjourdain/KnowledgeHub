import { createFileRoute, Outlet } from "@tanstack/react-router";
import ErrorPage from "@components/ErrorPage";
import { isAdmin, isGestionnaire } from "@utils/security";
import { AppError } from "@utils/errors";

export const Route = createFileRoute('/_authenticated/_authAdmin')({
  beforeLoad: ({ context: { auth } }) => {
    if (!isAdmin(auth.user) && !isGestionnaire(auth.user)) {
      console.error("Accès non autorisé, utilisateur n'a pas les droits d'accès");
      throw new AppError("Accès non autorisé, utilisateur n'a pas les droits d'accès", 403);
    }
  },
  errorComponent: ({ error }) => <ErrorPage error={error} />,
  component: AuthAdmin
})

function AuthAdmin() {
  return (
    <Outlet />
  )
}