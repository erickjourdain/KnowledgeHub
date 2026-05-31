import { useCallback, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { 
  Box, 
  Button, 
  FormControl, 
  FormHelperText, 
  FormLabel, 
  IconButton, 
  InputAdornment, 
  OutlinedInput, 
  TextField, 
  Toolbar, 
  Typography 
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { Card, SignInContainer } from '@components/SignInContainer';
import ConfirmationMessage from '@components/ConfirmationMessage';
import { registerUser } from '@api/users';

type RegisterInput = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export const Route = createFileRoute('/register')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate({ from: Route.fullPath });
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm<RegisterInput>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [confirmationOpen, setConfirmationOpen] = useState<boolean>(false);

  const onSubmit: SubmitHandler<RegisterInput> = useCallback((data) => {
    setIsLoading(true);
    registerUser(data.username, data.email, data.password)
      .then(() => {
        setConfirmationOpen(true);
        setTimeout(() => navigate({ to: "/login", search: { redirect: "/" } }), 
        2000);
      })
      .catch((error) => {
        setError("root", {
          message: error.message || "Échec lors de la création du compte. Veuillez réessayer."
        });
        setIsLoading(false);
      });
  }, []);

  return (
    <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
      <Toolbar />
      <SignInContainer direction="column" justifyContent="space-between">
        <Card variant="outlined">
          <Typography
            variant="h4"
            sx={{ width: '100%', fontSize: 'clamp(2rem, 10vw, 2.15rem)' }}
          >
            Création compte
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
              <FormLabel htmlFor="username">Username</FormLabel>
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
                  minLength: {
                    value: 3,
                    message: "Le nom d'utilisateur doit comporter au moins 3 caractères."
                  },
                  maxLength: {
                    value: 50,
                    message: "Le nom d'utilisateur ne peut pas dépasser 50 caractères."
                  },
                  pattern: {
                    value: /^[a-zA-Z0-9_]+$/,
                    message: "Le nom d'utilisateur ne peut contenir que des lettres, des chiffres et des underscores."
                  }
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
                    value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                    message: "Veuillez entrer un email valide."
                  }
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
                placeholder="Entrez votre mot de passe"
                color={errors.password ? 'error' : 'primary'}
                {...register("password", {
                  required: "Le mot de passe est obligatoire.",
                  minLength: {
                    value: 8,
                    message: "Le mot de passe doit comporter au moins 8 caractères."
                  },
                  maxLength: {
                    value: 128,
                    message: "Le mot de passe ne peut pas dépasser 128 caractères."
                  },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                    message: "Le mot de passe doit contenir au moins une lettre majuscule, une lettre minuscule, un chiffre et un caractère spécial."
                  }
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
            <FormControl>
              <FormLabel htmlFor="confirmPassword">Confirm Password</FormLabel>
              <OutlinedInput
                type={showConfirmPassword ? 'text' : 'password'}
                autoFocus
                required
                fullWidth
                placeholder="Confirmez votre mot de passe"
                color={errors.confirmPassword ? 'error' : 'primary'}
                {...register("confirmPassword", {
                  required: "La confirmation du mot de passe est obligatoire.",
                  validate: (value, formValues) =>
                    value === formValues.password || "Les mots de passe ne correspondent pas.",
                })}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                }
              />
              <FormHelperText error={!!errors.confirmPassword}>
                {errors.confirmPassword ? errors.confirmPassword.message : ''}
              </FormHelperText>
            </FormControl>
            {errors.root && (
              <Typography variant="body2" color="error">
                {errors.root.message}
              </Typography>
            )}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading}
            >
              {!isLoading ? "S'inscrire" : "Chargement ..."}
            </Button>
          </Box>
        </Card>
      </SignInContainer>
      <ConfirmationMessage
        open={confirmationOpen}
        color="success"
        message="Votre compte a été créé avec succès. Un administrateur doit l'activer avant que vous puissiez vous connecter."
        onClose={() => setConfirmationOpen(false)}
      />
    </Box>
  );
}
