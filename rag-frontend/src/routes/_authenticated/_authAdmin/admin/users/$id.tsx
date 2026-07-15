import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { 
  Box, 
  Button, 
  Checkbox, 
  Container, 
  FormControl, 
  FormControlLabel, 
  FormLabel, 
  MenuItem,
  Paper,
  Select, 
  TextField, 
  Typography
} from '@mui/material';
import { fetchUser, updateUser } from '@api/users';
import { USER_ROLES, type UserRole } from '@appTypes/User';
import { useCallback, useState, useEffect } from 'react';
import ConfirmationMessage from '@components/ConfirmationMessage';
import { isAdmin } from '@utils/security';
import { AppError } from '@utils/errors';
import ErrorPage from '@components/ErrorPage';

export const Route = createFileRoute(
  '/_authenticated/_authAdmin/admin/users/$id',
)({
  beforeLoad: ({ context: { auth } }) => {
    if (!isAdmin(auth.user)) {
      throw new AppError("Accès non autorisé, cette page est réservée aux administrateurs.", 403);
    }
  },
  errorComponent: ({ error, reset }) => <ErrorPage error={error} reset={reset} />,
  loader: async ({ params: { id }, context: { queryClient } }) => {
    return await queryClient.ensureQueryData({
      queryKey: ['users', { id }],
      queryFn: () => fetchUser(Number(id))
    });
  },
  component: RouteComponent,
})

type UserInput = {
  username: string
  email: string
  role: UserRole
  is_active: boolean
}

function RouteComponent() {
  const router = useRouter();
  const user = Route.useLoaderData();
  const queryClient = useQueryClient();
  const { id } = Route.useParams();
  const [updating, setUpdating] = useState<boolean>(false);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  const [updateStatus, setUpdateStatus] = useState<"success" | "error" | null>(null);
  const [message, setMessage] = useState<string>("");

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<UserInput>({
    defaultValues: {
      username: user.username,
      email: user.email,
      role: user.role,
      is_active: user.is_active
    }
  })

  useEffect(() => {
    reset({
      username: user.username,
      email: user.email,
      role: user.role,
      is_active: user.is_active
    });
  }, [user, reset]);

  const onSubmit: SubmitHandler<UserInput> = useCallback((data) => {
    setUpdating(true);
    updateUser(Number(id), data)
      .then(() => {
        setUpdateStatus("success");
        setMessage("L'utilisateur a été mis à jour avec succès.");
        setShowConfirmation(true);
        queryClient.resetQueries({ queryKey: ['users'] });
        queryClient.invalidateQueries({ queryKey: ['users', { id }] });
        router.invalidate();
      })
      .catch((error) => {
        console.error(error);
        setUpdateStatus("error");
        setMessage("Une erreur s'est produite lors de la mise à jour de l'utilisateur.");
        setShowConfirmation(true);
      })
      .finally(() => setUpdating(false));
  }, []);

  return (
    <Container sx={{ width: '100%' }}>
      <Typography variant="h5">
        Modifier {user.username}
      </Typography>
      <Paper sx={{ p: 2, m: "auto", mt: 2, maxWidth: "500px" }}>
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            gap: 2,
          }}
        >
          <FormControl>
            <FormLabel htmlFor="username">Login</FormLabel>
            <TextField
              type="text"
              autoFocus
              required
              fullWidth
              variant="outlined"
              placeholder="Entrez votre nom d'utilisateur"
              color={errors.username ? 'error' : 'primary'}
              helperText={errors.username ? errors.username.message : ''}
              {...register("username", {
                required: "Le nom d'utilisateur est obligatoire.",
              })}
            />
          </FormControl>
          <FormControl>
            <FormLabel htmlFor="email">Email</FormLabel>
            <TextField
              type="email"
              autoFocus
              required
              fullWidth
              variant="outlined"
              placeholder="Entrez votre email"
              color={errors.email ? 'error' : 'primary'}
              helperText={errors.email ? errors.email.message : ''}
              {...register("email", {
                required: "L'email est obligatoire.",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Adresse email invalide."
                }
              })}
            />
          </FormControl>
          <Box sx={{ display: 'flex', gap: 2, width: '100%', alignItems: 'center' }}>
            <FormControl sx={{ width: '75%' }}>
              <FormLabel htmlFor="role">Rôle</FormLabel>
              <Controller
                name="role"
                control={control}
                rules={{ required: "Le rôle est obligatoire." }}
                render={({ field }) => (
                  <Select
                    {...field}
                    variant="outlined"
                    color={errors.role ? 'error' : 'primary'}
                  >
                    {Object.entries(USER_ROLES).map(([value, label]) => (
                      <MenuItem key={value} value={value}>{label}</MenuItem>
                    ))}
                  </Select>
                )}
              />
            </FormControl>
            <FormControl sx={{ width: '25%', display: 'flex', alignItems: 'flex-end' }}>
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <FormControlLabel 
                    control={<Checkbox {...field} checked={field.value} />}
                    label="Actif"
                  />
                )}
              />
            </FormControl>
          </Box>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            sx={{ mt: 3, mb: 2 }}
            disabled={updating}
          >
            {updating ? "Mise à jour..." : "Mettre à jour"}
          </Button>
        </Box>
      </Paper>
      <ConfirmationMessage
        open={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        color={updateStatus === "success" ? "success" : "error"}
        message={message}
      />
    </Container>
  )
}