import { createFileRoute, Outlet } from "@tanstack/react-router";
import ErrorAccess from "@components/ErrorAccess";
import { isAdmin, isGestionnaire } from "@utils/security";

export const Route = createFileRoute('/_authenticated/_authAdmin')({
  beforeLoad: ({ context: { auth } }) => {
    if (!isAdmin(auth.user) && !isGestionnaire(auth.user)) {
      console.error("Accès non autorisé, utilisateur n'a pas les droits d'accès");
      throw new Error
    }
  },
  errorComponent: ErrorAccess,
  component: AuthAdmin
})

function AuthAdmin() {
  return (
    <Outlet />
  )
}