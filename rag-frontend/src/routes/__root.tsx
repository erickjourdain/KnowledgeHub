import {
  AppBar,
  Box,
  CssBaseline,
  Toolbar,
  Typography,
  IconButton,
  Tooltip
} from "@mui/material";
import { createRootRouteWithContext, Outlet, Link } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'; 
import logoUrl from "../assets/logo.png"
import { type MyRouterContext } from "../router";
import IndexingIndicator from "@components/IndexingIndicator";
import ErrorPage from "@components/ErrorPage";
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';


export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootLayout,
  errorComponent: ({ error, reset }) => <ErrorPage error={error} reset={reset} />
});

function RootLayout() {

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'rgba(9, 13, 22, 0.75)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: 'none',
        }}
      >
        <Toolbar sx={{ display: 'flex', alignItems: 'center', minHeight: '64px' }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              transition: 'transform 0.3s ease',
              '&:hover': {
                transform: 'scale(1.05)',
              }
            }}
          >
            <img 
              src={logoUrl} 
              alt="logo" 
              width="40px"
              style={{ display: 'block' }}
            />
          </Box>
          <Typography 
            variant="h6" 
            sx={{ 
              flexGrow: 1, 
              fontFamily: '"Outfit", sans-serif', 
              fontWeight: 800,
              letterSpacing: '0.5px',
              background: 'linear-gradient(90deg, #6366f1, #a855f7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              ml: 1.5,
            }}
          >
            RAG-AI
          </Typography>
          <IndexingIndicator />
          <Tooltip title="Fonctionnement & Limites RAG">
            <IconButton 
              component={Link} 
              to="/info" 
              sx={{ 
                color: 'text.secondary', 
                ml: 1.5, 
                '&:hover': { 
                  color: 'primary.light',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)'
                } 
              }}
            >
              <HelpOutlineIcon fontSize="medium" />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Outlet />
      <ReactQueryDevtools buttonPosition="bottom-left"/>
      <TanStackRouterDevtools position="bottom-right" />
    </Box>
  )
}
