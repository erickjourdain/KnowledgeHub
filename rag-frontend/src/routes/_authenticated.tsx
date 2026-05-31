import { Box, Drawer, Toolbar } from '@mui/material';
import { createFileRoute, redirect, Outlet } from '@tanstack/react-router';

import { DrawerList } from "@components/DrawerList";

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context: { auth }, location }) => {
    if (!auth.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: {
          // Save current location for redirect after login
          redirect: location.href,
        },
      })
    }
  },
  component: Authenticated
})

function Authenticated() {
  const drawerWidth = 240;

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <DrawerList />
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </>
  )
}