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
import { changePassword } from '@api/users';

type ChangePasswordInput = {
  username: string;
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export const Route = createFileRoute('/change-password')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate({ from: Route.fullPath });
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm<ChangePasswordInput>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showOldPassword, setShowOldPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState<boolean>(false);
  const [confirmationOpen, setConfirmationOpen] = useState<boolean>(false);

  const onSubmit: SubmitHandler<ChangePasswordInput> = useCallback((data) => {
    setIsLoading(true);
    changePassword(data.username, data.oldPassword, data.newPassword)
      .then(() => {
        setConfirmationOpen(true);
        setTimeout(() => navigate({ to: "/login", search: { redirect: "/" } }), 
        2000);
      })
      .catch((error) => {
        setIsLoading(false);
        setError('root', { 
          message: error.message || "Échec lors du changement de mot de passe. Veuillez réessayer."
        });
      });
  }, [])

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
            Changer mot de passe
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
              <FormLabel htmlFor="oldPassword">Ancien mot de passe</FormLabel>
              <OutlinedInput
                type={showOldPassword ? 'text' : 'password'}
                autoFocus
                required
                fullWidth
                placeholder="Entrez votre mot de passe"
                color={errors.oldPassword ? 'error' : 'primary'}
                {...register("oldPassword", {
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
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      edge="end"
                    >
                      {showOldPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                }
              />
              <FormHelperText error={!!errors.oldPassword}>
                {errors.oldPassword ? errors.oldPassword.message : ''}
              </FormHelperText>
            </FormControl>
            <FormControl>
              <FormLabel htmlFor="newPassword">Nouveau mot de passe</FormLabel>
              <OutlinedInput
                type={showNewPassword ? 'text' : 'password'}
                autoFocus
                required
                fullWidth
                placeholder="Entrez votre nouveau mot de passe"
                color={errors.newPassword ? 'error' : 'primary'}
                {...register("newPassword", {
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
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      edge="end"
                    >
                      {showNewPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                }
              />
              <FormHelperText error={!!errors.newPassword}>
                {errors.newPassword ? errors.newPassword.message : ''}
              </FormHelperText>
            </FormControl>
            <FormControl>
              <FormLabel htmlFor="confirmNewPassword">Confirmation mot de passe</FormLabel>
              <OutlinedInput
                type={showConfirmNewPassword ? 'text' : 'password'}
                autoFocus
                required
                fullWidth
                placeholder="Confirmez votre nouveau mot de passe"
                color={errors.confirmNewPassword ? 'error' : 'primary'}
                {...register("confirmNewPassword", {
                  required: "La confirmation du nouveau mot de passe est obligatoire.",
                  validate: (value, formValues) =>
                    value === formValues.newPassword || "Les mots de passe ne correspondent pas.",
                })}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      edge="end"
                    >
                      {showConfirmNewPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                }
              />
              <FormHelperText error={!!errors.confirmNewPassword}>
                {errors.confirmNewPassword ? errors.confirmNewPassword.message : ''}
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
              {!isLoading ? "Changer le mot de passe" : "Modification ..."}
            </Button>
          </Box>
        </Card>
      </SignInContainer>
      <ConfirmationMessage
        open={confirmationOpen}
        color="success"
        message="Votre mot de passe a été changé avec succès."
        onClose={() => setConfirmationOpen(false)}
      />
    </Box>
  )
}
