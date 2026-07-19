import { useState } from "react";
import { useAtomValue } from "jotai";
import {
  Avatar,
  Box,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
} from "@mui/material";
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import ChatIcon from '@mui/icons-material/Chat';
import SettingsIcon from '@mui/icons-material/Settings';
import GroupIcon from '@mui/icons-material/Group';
import HomeIcon from '@mui/icons-material/Home';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "../providers/authProvider";
import { isAdmin, isGestionnaire } from "@utils/security";
import { collectionAtom } from "@store/collectionStore";
import { jobIngestionIdsAtom } from "@store/jobIngestionStore";
import { jobReindexIdsAtom } from "@store/jobReindexStore";

interface DrawerListProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function DrawerList({ isCollapsed, onToggleCollapse }: DrawerListProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const collection = useAtomValue(collectionAtom);

  const ingestionIds = useAtomValue(jobIngestionIdsAtom);
  const reindexIds = useAtomValue(jobReindexIdsAtom);
  const hasRunningJobs = ingestionIds.length > 0 || reindexIds.length > 0;

  // Profil Menu State
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleCloseMenu();
    auth.logout();
  };

  const handleProfileRoute = () => {
    handleCloseMenu();
    navigate({ to: '/profile' });
  };

  // Détection des routes actives
  const isHomeActive = location.pathname === '/';
  const isUsersActive = location.pathname.includes('/admin/users');
  const isChatActive = location.pathname.startsWith('/collection/') && location.pathname.includes('/chat');
  const isDocumentsActive = location.pathname.startsWith('/collection/') && location.pathname.includes('/documents');
  const isAdminActive = location.pathname.includes('/admin/collection/');

  const handleHome = () => {
    navigate({ 
      to: '/', 
      search: {
        page: 1,
        search: null
      }
    });
  }

  const handleChat = () => {
    navigate({ 
      to: '/collection/$slug/chat', 
      params: { slug: String(collection?.slug) }
    });
  }

  const handleDocument = () => {
    navigate({ 
      to: '/collection/$slug/documents', 
      params: { slug: String(collection?.slug) },
      search: { page: 1, pageSize: 25 }
    });
  }

  const handleAdmin = () => {
    navigate({ 
      to: '/admin/collection/$slug', 
      params: { slug: String(collection?.slug) }
    });
  }

  const handleAdminUsers = () => {
    navigate({ 
      to: '/admin/users',
      search: { page: 1, pageSize: 25, search: null }
    });
  } 

  const getButtonStyle = (isActive: boolean) => ({
    borderRadius: '10px',
    mx: isCollapsed ? 1 : 1.5,
    my: 0.5,
    px: isCollapsed ? 1.5 : 2,
    py: 1.2,
    display: 'flex',
    justifyContent: isCollapsed ? 'center' : 'flex-start',
    backgroundColor: isActive ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
    color: isActive ? '#818cf8' : 'text.secondary',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      backgroundColor: isActive ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.03)',
      color: isActive ? '#818cf8' : 'text.primary',
      '& .MuiListItemIcon-root': {
        color: isActive ? '#818cf8' : 'text.primary',
      }
    },
    '& .MuiListItemIcon-root': {
      color: isActive ? '#818cf8' : 'text.secondary',
      minWidth: isCollapsed ? 'auto' : '36px',
      marginRight: isCollapsed ? 0 : undefined,
      display: 'flex',
      justifyContent: 'center',
      transition: 'color 0.2s ease, min-width 0.2s ease',
    },
    '& .MuiListItemText-primary': {
      fontWeight: isActive ? 600 : 500,
      fontSize: '0.875rem',
      letterSpacing: '0.1px',
    }
  });

  const renderItem = (label: string, icon: React.ReactNode, onClick: () => void, isActive: boolean) => {
    const button = (
      <ListItemButton onClick={onClick} sx={getButtonStyle(isActive)}>
        <ListItemIcon>
          {icon}
        </ListItemIcon>
        {!isCollapsed && <ListItemText primary={label} />}
      </ListItemButton>
    );

    return (
      <ListItem disablePadding key={label}>
        {isCollapsed ? (
          <Tooltip title={label} placement="right" arrow>
            {button}
          </Tooltip>
        ) : (
          button
        )}
      </ListItem>
    );
  };

  return (
    <Box 
      sx={{ 
        height: 'calc(100vh - 64px)', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-between',
        overflow: 'hidden'
      }}
    >
      <Box sx={{ overflowY: 'auto', flexGrow: 1, py: 1.5 }}>
        <List disablePadding>
          {renderItem(
            isCollapsed ? "Développer" : "Réduire", 
            isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />, 
            onToggleCollapse, 
            false
          )}
          <Divider sx={{ my: 1, opacity: 0.4 }} />
          
          {renderItem("Accueil", <HomeIcon />, handleHome, isHomeActive)}
          
          {isAdmin(auth.user) && 
            renderItem("Utilisateurs", <GroupIcon />, handleAdminUsers, isUsersActive)
          }
          
          {collection && (
            <>
              {!isCollapsed ? (
                <Box sx={{ mt: 3, mb: 1 }}>
                  <Divider sx={{ mb: 2, opacity: 0.4 }} />
                  <ListSubheader 
                    sx={{ 
                      backgroundColor: 'transparent',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'text.secondary',
                      letterSpacing: '1px',
                      pl: 3.5,
                      lineHeight: '24px'
                    }}
                  >
                    {collection.name}
                  </ListSubheader>
                </Box>
              ) : (
                <Divider sx={{ my: 2, opacity: 0.4 }} />
              )}

              {renderItem("Chat", <ChatIcon />, handleChat, isChatActive)}
              {renderItem("Recherche avancée", <ManageSearchIcon />, handleDocument, isDocumentsActive)}
              
              {(isAdmin(auth.user) || (collection.manager_ids && auth.user && collection.manager_ids.includes(auth.user.id))) &&
                renderItem("Admin", <SettingsIcon />, handleAdmin, isAdminActive)
              }
            </>
          )}

          {hasRunningJobs && (
            <>
              <Divider sx={{ my: 3, opacity: 0.4 }} />
              {isCollapsed ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                  <Tooltip title="Opérations en cours" placement="right" arrow>
                    <CircularProgress size={16} color="info" />
                  </Tooltip>
                </Box>
              ) : (
                <Box 
                  sx={{ 
                    px: 3.5, 
                    py: 1.5, 
                    mx: 1.5, 
                    borderRadius: '12px', 
                    backgroundColor: 'rgba(6, 182, 212, 0.02)', 
                    border: '1px dashed rgba(6, 182, 212, 0.15)' 
                  }}
                >
                  <Typography
                    variant="caption"
                    color="info.main"
                    fontWeight="bold"
                    sx={{
                      textTransform: 'uppercase',
                      display: 'block',
                      mb: 1.5,
                      letterSpacing: '1px',
                      fontSize: '0.7rem'
                    }}
                  >
                    Opérations
                  </Typography>
                  {ingestionIds.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                      <CircularProgress size={12} color="info" />
                      <Typography variant="caption" color="text.secondary">
                        Indexation : {ingestionIds.length} fichier{ingestionIds.length > 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  )}
                  {reindexIds.length > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <CircularProgress size={12} color="info" />
                      <Typography variant="caption" color="text.secondary">
                        Réindexation : {reindexIds.length} fichier{reindexIds.length > 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </>
          )}
        </List>
      </Box>

      {/* Profil utilisateur en bas */}
      <Box 
        sx={{ 
          p: 1.5, 
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          gap: 1.5,
          backgroundColor: 'rgba(255, 255, 255, 0.01)'
        }}
      >
        <Box 
          onClick={handleProfileClick}
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1.5, 
            cursor: 'pointer',
            flexGrow: 1,
            maxWidth: isCollapsed ? '36px' : 'calc(100% - 40px)',
            overflow: 'hidden',
            borderRadius: '8px',
            p: 0.5,
            transition: 'all 0.2s ease',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.04)'
            }
          }}
        >
          <Avatar 
            src={auth.user?.icon || undefined}
            sx={{ 
              width: 32, 
              height: 32, 
              background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
              fontSize: '0.85rem',
              fontWeight: 'bold'
            }}
          >
            {!auth.user?.icon && (auth.user?.username[0].toUpperCase() || 'U')}
          </Avatar>
          
          {!isCollapsed && (
            <Box sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <Typography 
                variant="body2" 
                fontWeight="600" 
                color="text.primary" 
                sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {auth.user?.username}
              </Typography>
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {isAdmin(auth.user) ? 'Administrateur' : isGestionnaire(auth.user) ? 'Gestionnaire' : 'Utilisateur'}
              </Typography>
            </Box>
          )}
        </Box>
        
        {!isCollapsed && (
          <Tooltip title="Se déconnecter" placement="top" arrow>
            <IconButton 
              size="small" 
              color="error" 
              onClick={auth.logout}
              sx={{ 
                opacity: 0.7, 
                '&:hover': { 
                  opacity: 1, 
                  backgroundColor: 'rgba(239, 68, 68, 0.08)' 
                } 
              }}
            >
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Menu contextuel de déconnexion */}
      <Menu
        anchorEl={anchorEl}
        open={openMenu}
        onClose={handleCloseMenu}
        anchorOrigin={{
          vertical: 'top',
          horizontal: isCollapsed ? 'right' : 'center',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: isCollapsed ? 'left' : 'center',
        }}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              boxShadow: '0 12px 24px rgba(0, 0, 0, 0.5)',
              mt: -1,
              minWidth: '180px',
            }
          }
        }}
      >
        {isCollapsed && (
          <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <Typography variant="body2" fontWeight="600" color="text.primary" noWrap>
              {auth.user?.username}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {isAdmin(auth.user) ? 'Administrateur' : isGestionnaire(auth.user) ? 'Gestionnaire' : 'Utilisateur'}
            </Typography>
          </Box>
        )}
        <MenuItem 
          onClick={handleProfileRoute}
          sx={{ 
            color: 'text.primary',
            gap: 1.5,
            fontSize: '0.85rem',
            py: 1,
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.05)'
            }
          }}
        >
          <AccountCircleIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          Mon profil
        </MenuItem>
        <MenuItem 
          onClick={handleLogout}
          sx={{ 
            color: 'error.light',
            gap: 1.5,
            fontSize: '0.85rem',
            py: 1,
            '&:hover': {
              backgroundColor: 'rgba(239, 68, 68, 0.08)'
            }
          }}
        >
          <LogoutIcon fontSize="small" />
          Se déconnecter
        </MenuItem>
      </Menu>
    </Box>
  );
}