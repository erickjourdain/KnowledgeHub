import { useCallback, useState, useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { 
  Box, 
  Button, 
  TextField, 
  Toolbar, 
  Typography, 
  Grid,
  Card,
  Avatar,
  IconButton,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';
import EditIcon from '@mui/icons-material/Edit';
import { useAuth } from '../../providers/authProvider';
import { updateUser } from '@api/users';

export const Route = createFileRoute('/_authenticated/profile')({
  component: RouteComponent,
});

const presetColors = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Violet', value: '#a855f7' },
  { name: 'Rose', value: '#ec4899' },
  { name: 'Bleu', value: '#3b82f6' },
  { name: 'Vert', value: '#10b981' },
  { name: 'Orange', value: '#f59e0b' },
  { name: 'Rouge', value: '#ef4444' },
  { name: 'Cyan', value: '#06b6d4' }
];

function adjustColor(hex: string, percent: number): string {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(char => char + char).join('');
  }
  const num = parseInt(cleanHex, 16);
  let r = (num >> 16) + Math.round(255 * (percent / 100));
  let g = ((num >> 8) & 0x00FF) + Math.round(255 * (percent / 100));
  let b = (num & 0x0000FF) + Math.round(255 * (percent / 100));
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function generateSvgDataUrl(label: string, background: string) {
  let fillValue = background;
  let gradientDefs = '';

  if (background.startsWith('#')) {
    const startColor = background;
    const endColor = adjustColor(background, 20); // 20% lighter
    const gradId = `grad_${background.replace('#', '')}`;
    gradientDefs = `<defs><linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${startColor}"/><stop offset="100%" stop-color="${endColor}"/></linearGradient></defs>`;
    fillValue = `url(#${gradId})`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">${gradientDefs}<rect width="96" height="96" rx="28" fill="${fillValue}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="700" fill="#ffffff">${label}</text></svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function parseExistingIcon(iconUrl?: string, username?: string) {
  if (!iconUrl) {
    const defaultLabel = username ? username[0].toUpperCase() : 'U';
    return { label: defaultLabel, color: '#6366f1' };
  }
  try {
    const decoded = decodeURIComponent(iconUrl.replace('data:image/svg+xml;utf8,', ''));
    // Extract label
    const textMatch = decoded.match(/fill="#ffffff">([^<]+)<\/text>/);
    const label = textMatch ? textMatch[1] : (username ? username[0].toUpperCase() : 'U');
    // Extract background color from stop-color or rect fill
    const colorMatch = decoded.match(/stop-color="([^"]+)"/);
    const color = colorMatch ? colorMatch[1] : '#6366f1';
    return { label, color };
  } catch (e) {
    const defaultLabel = username ? username[0].toUpperCase() : 'U';
    return { label: defaultLabel, color: '#6366f1' };
  }
}

function RouteComponent() {
  const auth = useAuth();
  const navigate = useNavigate();

  // Parsing existing icon properties
  const existingIcon = parseExistingIcon(auth.user?.icon, auth.user?.username);

  const [username, setUsername] = useState(auth.user?.username || '');
  const [email, setEmail] = useState(auth.user?.email || '');
  const [initials, setInitials] = useState(existingIcon.label);
  const [selectedColor, setSelectedColor] = useState(existingIcon.color);
  
  const [previewIcon, setPreviewIcon] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Generate preview in real-time
  useEffect(() => {
    const cleanInitials = initials.trim().substring(0, 2) || (username ? username[0].toUpperCase() : 'U');
    setPreviewIcon(generateSvgDataUrl(cleanInitials, selectedColor));
  }, [initials, selectedColor, username]);

  const handleSave = useCallback(async () => {
    if (!auth.user) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      const cleanInitials = initials.trim().substring(0, 2) || (username ? username[0].toUpperCase() : 'U');
      const finalIconUrl = generateSvgDataUrl(cleanInitials, selectedColor);

      await updateUser(auth.user.id, {
        username: username.trim(),
        email: email.trim(),
        icon: finalIconUrl
      });

      await auth.refreshUser();
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Une erreur est survenue lors de la mise à jour de votre profil.");
    } finally {
      setSaving(false);
    }
  }, [auth, username, email, initials, selectedColor]);

  return (
    <Box component="main" sx={{ flexGrow: 1, p: 3, maxWidth: '1000px', mx: 'auto' }}>
      <Toolbar />
      
      {/* Bouton retour */}
      <Box sx={{ mb: 3 }}>
        <Button 
          onClick={() => navigate({ to: '/', search: { page: 1, search: null } })} 
          startIcon={<ArrowBackIcon />}
          sx={{ 
            color: 'text.secondary',
            textTransform: 'none',
            fontSize: '0.85rem',
            '&:hover': { color: 'text.primary', backgroundColor: 'rgba(255, 255, 255, 0.04)' }
          }}
        >
          Retour à l'accueil
        </Button>
      </Box>

      <Typography variant="h4" fontWeight="700" sx={{ mb: 1, fontFamily: 'Outfit, sans-serif' }}>
        Mon profil
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Gérez vos informations personnelles et personnalisez l'icône de votre compte RAG-AI.
      </Typography>

      <Grid container spacing={4}>
        {/* Colonne gauche : Infos utilisateur */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card 
            variant="outlined" 
            sx={{ 
              p: 3, 
              backgroundColor: 'rgba(15, 23, 42, 0.45)', 
              backdropFilter: 'blur(16px)',
              borderColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '16px' 
            }}
          >
            <Typography variant="h6" fontWeight="600" sx={{ mb: 3, fontSize: '1.05rem' }}>
              Informations du compte
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                label="Nom d'utilisateur"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                variant="outlined"
                fullWidth
                size="small"
                disabled={saving}
                slotProps={{
                  inputLabel: { shrink: true }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '8px',
                  }
                }}
              />

              <TextField
                label="Adresse e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                variant="outlined"
                type="email"
                fullWidth
                size="small"
                disabled={saving}
                slotProps={{
                  inputLabel: { shrink: true }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '8px',
                  }
                }}
              />
            </Box>

            {errorMsg && (
              <Alert severity="error" sx={{ mt: 3, borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                {errorMsg}
              </Alert>
            )}

            <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving || !username || !email}
                startIcon={saving ? <CircularProgress size={18} sx={{ color: 'white' }} /> : <CheckIcon />}
                sx={{ 
                  borderRadius: '8px',
                  px: 4,
                  textTransform: 'none',
                  fontWeight: 600,
                  boxShadow: 'none',
                  '&:hover': { boxShadow: 'none' }
                }}
              >
                {saving ? 'Enregistrement...' : 'Sauvegarder'}
              </Button>
            </Box>
          </Card>
        </Grid>

        {/* Colonne droite : Icône de profil */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card 
            variant="outlined" 
            sx={{ 
              p: 3, 
              backgroundColor: 'rgba(15, 23, 42, 0.45)', 
              backdropFilter: 'blur(16px)',
              borderColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <Typography variant="h6" fontWeight="600" sx={{ mb: 3, fontSize: '1.05rem', alignSelf: 'flex-start' }}>
              Icône personnalisée
            </Typography>

            {/* Aperçu de l'avatar */}
            <Box sx={{ position: 'relative', mb: 4 }}>
              <Avatar 
                src={previewIcon || undefined}
                sx={{ 
                  width: 96, 
                  height: 96, 
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                  border: '2px solid rgba(255, 255, 255, 0.1)'
                }}
              />
              <Box 
                sx={{ 
                  position: 'absolute', 
                  bottom: 0, 
                  right: 0, 
                  backgroundColor: 'primary.main', 
                  borderRadius: '50%', 
                  p: 0.5,
                  border: '2px solid rgb(15, 23, 42)',
                  display: 'flex'
                }}
              >
                <EditIcon sx={{ fontSize: '0.9rem', color: 'white' }} />
              </Box>
            </Box>

            {/* Initiales */}
            <Box sx={{ width: '100%', mb: 3.5 }}>
              <TextField
                label="Initiales de l'icône"
                value={initials}
                onChange={(e) => setInitials(e.target.value.substring(0, 2))}
                placeholder={username ? username[0].toUpperCase() : 'U'}
                variant="outlined"
                fullWidth
                size="small"
                helperText="1 ou 2 lettres qui s'afficheront dans votre icône."
                disabled={saving}
                slotProps={{
                  inputLabel: { shrink: true }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '8px',
                  }
                }}
              />
            </Box>

            {/* Choix des couleurs */}
            <Box sx={{ width: '100%' }}>
              <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ display: 'block', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Couleur d'arrière-plan
              </Typography>
              
              <Grid container spacing={1.5}>
                {presetColors.map((color) => {
                  const isSelected = selectedColor.toLowerCase() === color.value.toLowerCase();
                  return (
                    <Grid size={{ xs: 3 }} key={color.name}>
                      <IconButton
                        onClick={() => setSelectedColor(color.value)}
                        disabled={saving}
                        sx={{
                          width: '100%',
                          height: '40px',
                          borderRadius: '8px',
                          background: `linear-gradient(135deg, ${color.value} 0%, ${adjustColor(color.value, 20)} 100%)`,
                          border: isSelected ? '2px solid white' : '1px solid rgba(255, 255, 255, 0.1)',
                          boxShadow: isSelected ? '0 0 12px rgba(255, 255, 255, 0.4)' : 'none',
                          transition: 'all 0.2s',
                          '&:hover': {
                            transform: 'scale(1.05)',
                            background: `linear-gradient(135deg, ${color.value} 0%, ${adjustColor(color.value, 20)} 100%)`,
                          }
                        }}
                      >
                        {isSelected && <CheckIcon sx={{ color: 'white', fontSize: '1.2rem' }} />}
                      </IconButton>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Message de succès */}
      <Snackbar
        open={success}
        autoHideDuration={3000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" sx={{ width: '100%', borderRadius: '8px' }}>
          Profil mis à jour avec succès !
        </Alert>
      </Snackbar>
    </Box>
  );
}
