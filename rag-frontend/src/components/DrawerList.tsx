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



export function DrawerList() {
  const navigate = useNavigate();
  const { auth }: { auth: AuthState } = Route.useRouteContext();
  const collection = useAtomValue(collectionAtom);

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
      </List>
    </Box>
  )
}