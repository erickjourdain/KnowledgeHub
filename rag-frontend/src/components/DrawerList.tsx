import { useAtomValue } from "jotai";
import {
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
} from "@mui/material";
import ArticleIcon from '@mui/icons-material/Article';
import ChatIcon from '@mui/icons-material/Chat';
import SettingsIcon from '@mui/icons-material/Settings';
import GroupIcon from '@mui/icons-material/Group';
import HomeIcon from '@mui/icons-material/Home';
import { useNavigate } from "@tanstack/react-router";
import type { AuthState } from "@appTypes/AuthState";
import { Route } from "../routes/_authenticated";
import { isAdmin, isCreator } from "@utils/security";
import { collectionAtom } from "@store/collectionStore";
import { jobIngestionIdsAtom } from "@store/jobIngestionStore";
import { jobReindexIdsAtom } from "@store/jobReindexStore";



export function DrawerList() {
  const navigate = useNavigate();
  const { auth }: { auth: AuthState } = Route.useRouteContext();
  const collection = useAtomValue(collectionAtom);

  const ingestionIds = useAtomValue(jobIngestionIdsAtom);
  const reindexIds = useAtomValue(jobReindexIdsAtom);
  const hasRunningJobs = ingestionIds.length > 0 || reindexIds.length > 0;

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
      to: '/collection/$id/chat', 
      params: { id: String(collection?.id) 
      }
    });
  }

  const handleDocument = () => {
    navigate({ 
      to: '/collection/$id/documents', 
      params: { id: String(collection?.id) },
      search: { page: 1, pageSize: 25 }
    });
  }

  const handleAdmin = () => {
    navigate({ 
      to: '/admin/collection/$id', 
      params: { id: String(collection?.id) }
    });
  }

  const handleAdminUsers = () => {
    navigate({ 
      to: '/admin/users',
      search: { page: 1, pageSize: 25, search: null }
    });
  } 

  return (
    <Box sx={{ overflow: 'auto' }}>
      <List>
        <ListItem>
          <ListItemButton onClick={handleHome}>
            <ListItemIcon>
              <HomeIcon />
            </ListItemIcon>
            <ListItemText primary='Accueil' />
          </ListItemButton>
        </ListItem>
        {
          isAdmin(auth.user) && 
          <ListItem>
            <ListItemButton onClick={handleAdminUsers}>
              <ListItemIcon>
                <GroupIcon />
              </ListItemIcon>
              <ListItemText primary='Utilisateurs' />
            </ListItemButton>
          </ListItem>
        }
        <Divider sx={{ mt: 2 }} />
        {
          collection && (
            <>
              <ListSubheader>{collection.name}</ListSubheader>
              <ListItem>
                <ListItemButton onClick={handleChat}>
                  <ListItemIcon>
                    <ChatIcon />
                  </ListItemIcon>
                  <ListItemText>Chat</ListItemText>
                </ListItemButton>
              </ListItem>
              <ListItem>
                <ListItemButton onClick={handleDocument}>
                  <ListItemIcon>
                    <ArticleIcon />
                  </ListItemIcon>
                  <ListItemText>Document</ListItemText>
                </ListItemButton>
              </ListItem>
              {
                (isAdmin(auth.user) || isCreator(auth.user, collection.id)) &&
                <ListItem>
                  <ListItemButton onClick={handleAdmin}>
                    <ListItemIcon>
                      <SettingsIcon />
                    </ListItemIcon>
                    <ListItemText>Admin</ListItemText>
                  </ListItemButton>
                </ListItem>
              }
            </>
          )
        }
        {
          hasRunningJobs && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ px: 3, py: 1.5 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight="bold"
                  sx={{
                    textTransform: 'uppercase',
                    display: 'block',
                    mb: 1.5,
                    letterSpacing: '0.8px'
                  }}
                >
                  Opérations en cours
                </Typography>
                {ingestionIds.length > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <CircularProgress size={16} color="info" />
                    <Typography variant="body2" color="text.secondary">
                      Indexation : {ingestionIds.length} fichier{ingestionIds.length > 1 ? 's' : ''}
                    </Typography>
                  </Box>
                )}
                {reindexIds.length > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <CircularProgress size={16} color="info" />
                    <Typography variant="body2" color="text.secondary">
                      Réindexation : {reindexIds.length} fichier{reindexIds.length > 1 ? 's' : ''}
                    </Typography>
                  </Box>
                )}
              </Box>
            </>
          )
        }
      </List>
    </Box>
  )
}