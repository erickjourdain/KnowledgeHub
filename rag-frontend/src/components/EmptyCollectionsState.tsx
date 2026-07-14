import { Box, Card, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import LockIcon from '@mui/icons-material/Lock';

interface EmptyCollectionsStateProps {
  searchParam: string | null;
  isAdminOrGestionnaire: boolean;
  onNewCollection: () => void;
}

export function EmptyCollectionsState({
  searchParam,
  isAdminOrGestionnaire,
  onNewCollection,
}: EmptyCollectionsStateProps) {
  return (
    <Box
      mt={4}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
        textAlign: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.35)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        maxWidth: '500px',
        mx: 'auto',
      }}
    >
      {searchParam ? (
        <>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: 'text.secondary',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            <SearchIcon sx={{ fontSize: '1.8rem' }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Aucun résultat
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Aucune collection ne correspond à votre recherche "{searchParam}".
          </Typography>
        </>
      ) : (
        <>
          {!isAdminOrGestionnaire ? (
            <>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: 'error.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                }}
              >
                <LockIcon sx={{ fontSize: '1.8rem' }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
                Accès restreint
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: '360px', lineHeight: 1.5 }}>
                Vous n'avez pas accès aux collections. Veuillez contacter votre administrateur pour obtenir des accès.
              </Typography>
            </>
          ) : (
            <Box
              sx={{
                width: '100%',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))',
                gap: 3,
              }}
            >
              <Card 
                key='0' 
                sx={{ 
                  backgroundColor: 'rgba(99, 102, 241, 0.02)', 
                  border: '2px dashed rgba(99, 102, 241, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  p: 3,
                  textAlign: 'center',
                  cursor: 'pointer',
                  minHeight: '230px',
                  width: '100%',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'rgba(99, 102, 241, 0.06)',
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 24px rgba(99, 102, 241, 0.12)',
                    '& .add-icon-btn': {
                      backgroundColor: 'primary.main',
                      color: '#fff',
                    }
                  }
                }}
                onClick={onNewCollection}
              >
                <Box 
                  className="add-icon-btn"
                  sx={{ 
                    width: 48, 
                    height: 48, 
                    borderRadius: '50%', 
                    backgroundColor: 'rgba(99, 102, 241, 0.1)', 
                    color: 'primary.main', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    mb: 2,
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  <AddIcon fontSize="medium" />
                </Box>
                <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 600, mb: 0.5 }}>
                  Ajouter une collection
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: '220px' }}>
                  Créez un nouvel espace pour vos documents et conversations
                </Typography>
              </Card>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
