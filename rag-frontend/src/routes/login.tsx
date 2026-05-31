import { useCallback, useState } from 'react';
import {
  Typography,
  Box,
  FormLabel,
  FormControl,
  TextField,
  Button,
  Toolbar,
  OutlinedInput,
  InputAdornment,
  IconButton,
  FormHelperText,
} from '@mui/material';
import { createFileRoute, Link, redirect, useRouter } from '@tanstack/react-router';
import { useForm, type SubmitHandler } from 'react-hook-form';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { Card, SignInContainer } from '@components/SignInContainer';
import type { AuthState } from '@appTypes/AuthState';

type LoginInput = {
  username: string;
  password: string;
}

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === 'string'
      ? search.redirect
      : '/',
  }),
  beforeLoad: ({ context: { auth }, search }) => {
    // Redirect if already authenticated
    if (auth.isAuthenticated) {
      throw redirect({ to: search.redirect || '/' })
    }
  },
  component: LoginComponent,
})

function LoginComponent() {
  const router = useRouter();
  const { auth }: { auth: AuthState } = Route.useRouteContext();
  const { redirect } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm<LoginInput>();

  const onSubmit: SubmitHandler<LoginInput> = useCallback((data) => {
    setIsLoading(true);
    auth.login(data.username, data.password)
      .then((status: boolean) => {
        setIsLoading(false);
        if (status) {
          const safeRedirect = redirect?.startsWith('/') ? redirect : '/'
          router.invalidate().finally(() => router.history.push(safeRedirect));
        } else {
          setError("root", {
            message: "Échec de la connexion. Vérifier vos identifiants."
          });
        }
      })
      .catch((error) => {
        setIsLoading(false);
        setError("root", {
          message: error.message || "Échec de la connexion. Vérifier vos identifiants."
        });
      });
  }, [auth, redirect, router, navigate, setError]);

  return (
    <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
      <Toolbar />
      <SignInContainer direction="column" justifyContent="space-between">
        <Card variant="outlined">
          <Typography
            component="h1"
            variant="h4"
            sx={{ width: '100%', fontSize: 'clamp(2rem, 10vw, 2.15rem)' }}
          >
            Connexion
          </Typography>
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
              <FormLabel htmlFor="password">Password</FormLabel>
              <OutlinedInput
                type={showPassword ? 'text' : 'password'}
                autoFocus
                required
                fullWidth
                placeholder="••••••"
                color={errors.password ? 'error' : 'primary'}
                {...register("password", {
                  required: "Le mot de passe est obligatoire.",
                })}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                }
              />
              <FormHelperText error={!!errors.password}>
                {errors.password ? errors.password.message : ''}
              </FormHelperText>
            </FormControl>
            {errors.root && (
              <Typography variant="inherit" color="error">
                {errors.root?.message}
              </Typography>
            )}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading}
            >
              {!isLoading ? "Se connecter" : "Chargement ..."}
            </Button>
            <Link to="/register" style={{ textDecoration: 'none', marginTop: '8px' }}>
              <Typography variant="body2" color="primary">
                Pas de compte ? Inscrivez-vous
              </Typography>
            </Link>
          </Box>
        </Card>
      </SignInContainer>
    </Box>
  )
}
