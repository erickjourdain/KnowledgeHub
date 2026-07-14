import { useState } from 'react';
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
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const drawerWidth = isCollapsed ? 76 : 240;

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { 
            width: drawerWidth, 
            boxSizing: 'border-box',
            transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            overflowX: 'hidden'
          },
          transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Toolbar />
        <DrawerList 
          isCollapsed={isCollapsed} 
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)} 
        />
      </Drawer>
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 3,
          width: `calc(100% - ${drawerWidth}px)`,
          transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </>
  )
}