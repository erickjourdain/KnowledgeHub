import {
  AppBar,
  Box,
  CssBaseline,
  Toolbar,
  Typography
} from "@mui/material";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'; 
import logoUrl from "../assets/logo.png"
import { type MyRouterContext } from "../router";
import IndexingIndicator from "@components/IndexingIndicator";


export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootLayout
});

function RootLayout() {

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Box>
            <img 
              src={logoUrl} 
              alt="logo" 
              width="50px"
            />
          </Box>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            RAG-AI
          </Typography>
          <IndexingIndicator />
        </Toolbar>
      </AppBar>
      <Outlet />
      <ReactQueryDevtools buttonPosition="bottom-left"/>
      <TanStackRouterDevtools position="bottom-right" />
    </Box>
  )
}
