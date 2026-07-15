import { createFileRoute, Link } from '@tanstack/react-router';
import { 
  Box, 
  Card, 
  CardContent, 
  Divider, 
  Grid, 
  Typography, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  Paper,
  Button,
  Toolbar
} from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LanguageIcon from '@mui/icons-material/Language';
import SchemaIcon from '@mui/icons-material/Schema';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export const Route = createFileRoute('/info')({
  component: RAGInfoPage,
});

function RAGInfoPage() {
  return (
    <Box sx={{ maxWidth: '1200px', mx: 'auto', py: 2, px: { xs: 2, md: 4 } }}>
      {/* Spacer to push content below the fixed AppBar */}
      <Toolbar sx={{ mb: 1 }} />

      {/* Back to Application Button */}
      <Box sx={{ mb: 2 }}>
        <Button 
          component={Link} 
          to="/" 
          startIcon={<ArrowBackIcon />}
          sx={{ 
            color: 'text.secondary', 
            borderRadius: '20px',
            px: 2,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(15, 23, 42, 0.3)',
            backdropFilter: 'blur(8px)',
            '&:hover': { 
              color: 'primary.light', 
              borderColor: 'primary.light',
              backgroundColor: 'rgba(99, 102, 241, 0.06)' 
            } 
          }}
        >
          Retour à l'application
        </Button>
      </Box>
      {/* Account Verification Info Banner */}
      <Card 
        sx={{ 
          mb: 4, 
          borderColor: 'rgba(99, 102, 241, 0.25)',
          background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.05) 0%, rgba(15, 23, 42, 0.5) 100%)',
          display: 'flex',
          alignItems: 'center',
          p: 2,
          gap: 2
        }}
      >
        <HelpOutlineIcon sx={{ color: 'primary.light', fontSize: '2rem' }} />
        <Box>
          <Typography variant="subtitle2" fontWeight="600" color="primary.light">
            Accès à l'application
          </Typography>
          <Typography variant="body2" color="text.secondary">
            L'accès complet aux fonctionnalités de l'application (collections de documents et chat) nécessite d'avoir <strong>un compte utilisateur préalablement validé par un administrateur</strong>. Vous pouvez consulter les informations ci-dessous librement.
          </Typography>
        </Box>
      </Card>

      {/* Hero Section */}
      <Card 
        sx={{ 
          mb: 4, 
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.15)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '-50%',
            right: '-10%',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, transparent 70%)',
            zIndex: 0,
          }
        }}
      >
        <CardContent sx={{ position: 'relative', zIndex: 1, p: { xs: 3, md: 4 } }}>
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom 
            sx={{ 
              fontWeight: 800,
              fontFamily: '"Outfit", sans-serif',
              background: 'linear-gradient(90deg, #818cf8, #c084fc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1.5
            }}
          >
            Comprendre le Système RAG
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: '800px', fontSize: '1.05rem', lineHeight: 1.6 }}>
            Cette application utilise la technologie de <strong>RAG (Retrieval-Augmented Generation)</strong> ou Génération Augmentée de Récupération. 
            Les documents sont regroupés au sein de <strong>collections indépendantes</strong>, et chaque session de chat s'effectue sur une seule collection ciblée pour garantir l'étanchéité et la pertinence des réponses.
          </Typography>
        </CardContent>
      </Card>

      {/* Comment ça marche ? (Pipeline visuel) */}
      <Typography 
        variant="h6" 
        sx={{ 
          fontWeight: 700, 
          mb: 3, 
          fontFamily: '"Outfit", sans-serif', 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1 
        }}
      >
        <SettingsSuggestIcon sx={{ color: 'primary.light' }} />
        Comment fonctionne le RAG ?
      </Typography>

      <Grid container spacing={3} sx={{ mb: 5 }}>
        {/* Étape 1 */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper 
            sx={{ 
              p: 3, 
              height: '100%', 
              backgroundColor: 'rgba(15, 23, 42, 0.3)', 
              border: '1px solid rgba(255, 255, 255, 0.04)',
              transition: 'transform 0.2s ease, border-color 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                borderColor: 'rgba(99, 102, 241, 0.25)',
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box sx={{ 
                width: 36, 
                height: 36, 
                borderRadius: '50%', 
                backgroundColor: 'rgba(99, 102, 241, 0.1)', 
                color: 'primary.light',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontWeight: 'bold'
              }}>
                1
              </Box>
              <Typography variant="subtitle1" fontWeight="700" fontFamily='"Outfit", sans-serif'>
                Indexation des documents
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              Les fichiers sont découpés en petits segments (chunks) et convertis en vecteurs sémantiques stockés en base de données.
              <br />
              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'info.light', fontWeight: 600 }}>
                ⚠️ L'indexation est réservée aux utilisateurs ayant le rôle Gestionnaire.
              </Typography>
            </Typography>
          </Paper>
        </Grid>

        {/* Étape 2 */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper 
            sx={{ 
              p: 3, 
              height: '100%', 
              backgroundColor: 'rgba(15, 23, 42, 0.3)', 
              border: '1px solid rgba(255, 255, 255, 0.04)',
              transition: 'transform 0.2s ease, border-color 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                borderColor: 'rgba(6, 182, 212, 0.25)',
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box sx={{ 
                width: 36, 
                height: 36, 
                borderRadius: '50%', 
                backgroundColor: 'rgba(6, 182, 212, 0.1)', 
                color: 'info.main',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontWeight: 'bold'
              }}>
                2
              </Box>
              <Typography variant="subtitle1" fontWeight="700" fontFamily='"Outfit", sans-serif'>
                Recherche sémantique
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              Quand vous posez une question dans le chat, le système compare sémantiquement votre question avec l'ensemble des segments indexés de la collection et en extrait les passages les plus pertinents.
            </Typography>
          </Paper>
        </Grid>

        {/* Étape 3 */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper 
            sx={{ 
              p: 3, 
              height: '100%', 
              backgroundColor: 'rgba(15, 23, 42, 0.3)', 
              border: '1px solid rgba(255, 255, 255, 0.04)',
              transition: 'transform 0.2s ease, border-color 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                borderColor: 'rgba(168, 85, 247, 0.25)',
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box sx={{ 
                width: 36, 
                height: 36, 
                borderRadius: '50%', 
                backgroundColor: 'rgba(168, 85, 247, 0.1)', 
                color: 'secondary.light',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontWeight: 'bold'
              }}>
                3
              </Box>
              <Typography variant="subtitle1" fontWeight="700" fontFamily='"Outfit", sans-serif'>
                Génération de la réponse
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              Le modèle de langage (LLM) reçoit votre question accompagnée des segments pertinents trouvés. Il rédige ensuite une réponse précise en se basant <strong>uniquement</strong> sur ces informations.
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Capacités vs Limites */}
      <Grid container spacing={4} sx={{ mb: 5 }}>
        {/* Colonne : Ce qu'il est possible de faire */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card 
            sx={{ 
              height: '100%', 
              borderColor: 'rgba(16, 185, 129, 0.15)',
              background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.01) 0%, rgba(15, 23, 42, 0.45) 100%)' 
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography 
                variant="h6" 
                gutterBottom 
                sx={{ 
                  fontWeight: 700, 
                  fontFamily: '"Outfit", sans-serif', 
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 2.5
                }}
              >
                <AutoAwesomeIcon />
                Ce que le système fait très bien
              </Typography>
              
              <List sx={{ '& .MuiListItem-root': { px: 0, py: 1.5 } }}>
                <ListItem alignItems="flex-start">
                  <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                    <CheckCircleOutlineIcon sx={{ color: '#10b981', fontSize: '1.2rem' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Réponses ancrées dans vos données" 
                    secondary="Les réponses du modèle sont directement issues des documents de votre collection. Cela réduit considérablement le risque que l'IA invente des faits totalement déconnectés."
                    primaryTypographyProps={{ fontWeight: 600, fontSize: '0.95rem' }}
                    secondaryTypographyProps={{ color: 'text.secondary', sx: { mt: 0.5 } }}
                  />
                </ListItem>
                <Divider sx={{ opacity: 0.4 }} />
                <ListItem alignItems="flex-start">
                  <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                    <CheckCircleOutlineIcon sx={{ color: '#10b981', fontSize: '1.2rem' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Citations et traçabilité des sources" 
                    secondary="Chaque réponse importante est accompagnée de références ou liens vers les documents originaux et les pages exactes d'où provient l'information, vous permettant de vérifier par vous-même."
                    primaryTypographyProps={{ fontWeight: 600, fontSize: '0.95rem' }}
                    secondaryTypographyProps={{ color: 'text.secondary', sx: { mt: 0.5 } }}
                  />
                </ListItem>
                <Divider sx={{ opacity: 0.4 }} />
                <ListItem alignItems="flex-start">
                  <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                    <CheckCircleOutlineIcon sx={{ color: '#10b981', fontSize: '1.2rem' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Synthèse d'informations croisées" 
                    secondary="Le système est capable d'analyser plusieurs documents en parallèle pour en extraire des éléments complémentaires et rédiger une synthèse globale structurée."
                    primaryTypographyProps={{ fontWeight: 600, fontSize: '0.95rem' }}
                    secondaryTypographyProps={{ color: 'text.secondary', sx: { mt: 0.5 } }}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Colonne : Les Limites */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card 
            sx={{ 
              height: '100%', 
              borderColor: 'rgba(245, 158, 11, 0.15)',
              background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.01) 0%, rgba(15, 23, 42, 0.45) 100%)' 
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Typography 
                variant="h6" 
                gutterBottom 
                sx={{ 
                  fontWeight: 700, 
                  fontFamily: '"Outfit", sans-serif', 
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 2.5
                }}
              >
                <WarningAmberIcon />
                Les limites et contraintes
              </Typography>
              
              <List sx={{ '& .MuiListItem-root': { px: 0, py: 1.5 } }}>
                <ListItem alignItems="flex-start">
                  <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                    <WarningAmberIcon sx={{ color: '#f59e0b', fontSize: '1.2rem' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Dépendance à la qualité des sources" 
                    secondary="Le principe est « Garbage In, Garbage Out ». Si vos documents contiennent des erreurs, des contradictions, ou des informations dépassées, l'IA les répétera car elle les considère comme la vérité absolue."
                    primaryTypographyProps={{ fontWeight: 600, fontSize: '0.95rem' }}
                    secondaryTypographyProps={{ color: 'text.secondary', sx: { mt: 0.5 } }}
                  />
                </ListItem>
                <Divider sx={{ opacity: 0.4 }} />
                <ListItem alignItems="flex-start">
                  <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                    <WarningAmberIcon sx={{ color: '#f59e0b', fontSize: '1.2rem' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Fenêtre de contexte limitée (sélection)" 
                    secondary="Pour une question donnée, le système n'envoie au modèle que les segments les plus pertinents (généralement quelques pages). Le modèle n'a pas une vision complète et instantanée de milliers de pages à la fois."
                    primaryTypographyProps={{ fontWeight: 600, fontSize: '0.95rem' }}
                    secondaryTypographyProps={{ color: 'text.secondary', sx: { mt: 0.5 } }}
                  />
                </ListItem>
                <Divider sx={{ opacity: 0.4 }} />
                <ListItem alignItems="flex-start">
                  <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                    <WarningAmberIcon sx={{ color: '#f59e0b', fontSize: '1.2rem' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Extraction complexe (tableaux et images)" 
                    secondary="Les tableaux imbriqués, les graphiques complexes ou les scans de documents de mauvaise qualité peuvent être mal interprétés lors de l'extraction de texte, ce qui peut altérer la fidélité des réponses."
                    primaryTypographyProps={{ fontWeight: 600, fontSize: '0.95rem' }}
                    secondaryTypographyProps={{ color: 'text.secondary', sx: { mt: 0.5 } }}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Bonnes pratiques */}
      <Card 
        sx={{ 
          borderColor: 'rgba(6, 182, 212, 0.15)',
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.03) 0%, rgba(15, 23, 42, 0.45) 100%)',
          mb: 2
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Typography 
            variant="h6" 
            gutterBottom 
            sx={{ 
              fontWeight: 700, 
              fontFamily: '"Outfit", sans-serif', 
              color: 'info.light',
              display: 'flex',
              alignItems: 'center',
              gap: 1.2,
              mb: 3
            }}
          >
            <LightbulbIcon />
            Conseils pour obtenir les meilleurs résultats
          </Typography>
          
          <Grid container spacing={4}>
            {/* Conseil 1 */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <PsychologyIcon sx={{ color: 'primary.light', mt: 0.5 }} />
                <Box>
                  <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 0.5 }}>
                    Posez des questions ciblées
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                    Formulez des questions contenant des termes précis présents dans vos documents. Au lieu de « parles-moi des ventes », préférez « quel est le bilan des ventes du T3 2025 ? ».
                  </Typography>
                </Box>
              </Box>
            </Grid>
            
            {/* Conseil 2 */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <LanguageIcon sx={{ color: 'primary.light', mt: 0.5 }} />
                <Box>
                  <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 0.5 }}>
                    Fichiers PDF / DOCX en français
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                    Le système est actuellement optimisé et paramétré pour l'analyse de documents rédigés en <strong>français</strong> aux formats <strong>PDF (.pdf)</strong> et <strong>Word (.docx)</strong>.
                  </Typography>
                </Box>
              </Box>
            </Grid>
            
            {/* Conseil 3 */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <SchemaIcon sx={{ color: 'primary.light', mt: 0.5 }} />
                <Box>
                  <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 0.5 }}>
                    Structure minimale exigée
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                    Pour obtenir des réponses pertinentes, vos fichiers doivent avoir une structure textuelle claire. Les PDF issus de présentations PowerPoint, par exemple, manquent de repères sémantiques et ne peuvent pas être correctement interprétés par l'extracteur.
                  </Typography>
                </Box>
              </Box>
            </Grid>
            
            {/* Conseil 4 */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <HelpOutlineIcon sx={{ color: 'primary.light', mt: 0.5 }} />
                <Box>
                  <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 0.5 }}>
                    Vérification des sources
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                    En cas de doute ou pour valider des points critiques, utilisez toujours les liens et citations de sources affichés sous la réponse de l'IA pour consulter l'extrait d'origine.
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
