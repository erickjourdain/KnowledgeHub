import React, { useState } from 'react';
import { 
  Box, 
  Button, 
  Container, 
  Card, 
  CardContent, 
  Typography, 
  Collapse
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import SearchOffOutlinedIcon from '@mui/icons-material/SearchOffOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import HomeIcon from '@mui/icons-material/Home';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useNavigate } from '@tanstack/react-router';
import { isAppError } from '../utils/errors';

interface ErrorPageProps {
  statusCode?: number;
  title?: string;
  message?: string;
  error?: any;
  reset?: () => void;
}

export const ErrorPage: React.FC<ErrorPageProps> = ({
  statusCode,
  title,
  message,
  error,
  reset
}) => {
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);

  // Determine status code
  let code = statusCode;
  let errorObj = error;

  // If a router error was passed directly
  if (error) {
    if (isAppError(error)) {
      code = error.status;
    } else if (error.status) {
      code = error.status;
    } else if (error.statusCode) {
      code = error.statusCode;
    }
  }

  // Fallback defaults based on status code
  let displayTitle = title;
  let displayMessage = message;
  let displayIcon = <ErrorOutlineOutlinedIcon sx={{ fontSize: 64, color: 'primary.main' }} />;

  switch (code) {
    case 403:
      displayTitle = title || "Accès non autorisé";
      displayMessage = message || "Vous ne disposez pas des droits nécessaires pour accéder à cette page.";
      displayIcon = <LockOutlinedIcon sx={{ fontSize: 64, color: 'error.main' }} />;
      break;
    case 404:
      displayTitle = title || "Page non trouvée";
      displayMessage = message || "La page que vous recherchez n'existe pas ou a été déplacée.";
      displayIcon = <SearchOffOutlinedIcon sx={{ fontSize: 64, color: 'info.main' }} />;
      break;
    default:
      displayTitle = title || "Une erreur est survenue";
      displayMessage = message || "L'application a rencontré un problème inattendu.";
      displayIcon = <ErrorOutlineOutlinedIcon sx={{ fontSize: 64, color: 'secondary.main' }} />;
      break;
  }

  const handleGoHome = () => {
    navigate({ 
      to: '/', 
      search: { page: 1, search: null } 
    });
  };

  const getTechDetails = () => {
    if (!errorObj) return null;
    if (typeof errorObj === 'string') return errorObj;
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {errorObj.message && (
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            Message: {errorObj.message}
          </Typography>
        )}
        {errorObj.stack && (
          <Typography 
            variant="caption" 
            component="pre" 
            sx={{ 
              fontFamily: 'monospace', 
              overflowX: 'auto', 
              backgroundColor: 'rgba(0, 0, 0, 0.4)', 
              p: 1.5, 
              borderRadius: 1,
              maxHeight: '200px',
              textAlign: 'left'
            }}
          >
            {errorObj.stack}
          </Typography>
        )}
      </Box>
    );
  };

  const techDetails = getTechDetails();

  return (
    <Container 
      maxWidth="sm" 
      sx={{ 
        height: 'calc(100vh - 128px)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        py: 4
      }}
    >
      <Card 
        sx={{ 
          width: '100%', 
          textAlign: 'center', 
          p: { xs: 2, sm: 4 },
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '4px',
            background: 'linear-gradient(90deg, #6366f1, #a855f7)',
          }
        }}
      >
        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <Box 
            sx={{ 
              p: 2, 
              borderRadius: '50%', 
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.15)',
            }}
          >
            {displayIcon}
          </Box>

          <Box>
            {code && (
              <Typography 
                variant="h2" 
                sx={{ 
                  fontWeight: 900,
                  fontSize: { xs: '3rem', sm: '4.5rem' },
                  letterSpacing: '-2px',
                  background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  lineHeight: 1,
                  mb: 1
                }}
              >
                {code}
              </Typography>
            )}
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
              {displayTitle}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: '380px', mx: 'auto' }}>
              {displayMessage}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', width: '100%', mt: 1 }}>
            {reset && (
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<RefreshIcon />}
                onClick={() => reset()}
                sx={{ px: 3 }}
              >
                Réessayer
              </Button>
            )}
            <Button 
              variant={reset ? "outlined" : "contained"} 
              color={reset ? "primary" : "primary"}
              startIcon={<HomeIcon />}
              onClick={handleGoHome}
              sx={{ px: 3 }}
            >
              Retour à l'accueil
            </Button>
          </Box>

          {techDetails && (
            <Box sx={{ width: '100%', borderTop: '1px solid rgba(255, 255, 255, 0.08)', pt: 2, mt: 1 }}>
              <Button
                size="small"
                color="inherit"
                endIcon={showDetails ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                onClick={() => setShowDetails(!showDetails)}
                sx={{ color: 'text.secondary', mb: 1 }}
              >
                Détails techniques
              </Button>
              <Collapse in={showDetails}>
                <Box sx={{ mt: 1 }}>
                  {techDetails}
                </Box>
              </Collapse>
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default ErrorPage;
