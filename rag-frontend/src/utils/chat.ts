import type { ChatConversation, ChatUser } from '@mui/x-chat/headless';
import { green, yellow } from '@mui/material/colors';
import type { User } from '@appTypes/User';
import logoUrl from '../assets/logo.png';

export function createAvatarDataUrl (
  label: string, 
  background: string, 
  foreground = '#ffffff'
) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="24" fill="${background}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="600" fill="${foreground}">${label}</text></svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function createAvatar(
  user: User | 'assistant' | null, 
  color: string = '#9c27b0'
): ChatUser {
  if (user === 'assistant') {
    return {
      id: '0',
      displayName: 'Assistant',
      avatarUrl: logoUrl,
      isOnline: true,
      role: 'assistant',
    };
  }

  if (user == null) {
    return {
      id: 'you',
      displayName: 'You',
      avatarUrl: createAvatarDataUrl('Y', color),
      isOnline: true,
      role: 'user',
    }
  }

  return {
    id: String(user.id),
    displayName: user.username,
    avatarUrl: createAvatarDataUrl(user.username[0].toUpperCase(), color),
    isOnline: true,
    role: 'user',
  }
}

export function createEmptyConversation(): ChatConversation {
  const conversation: ChatConversation = {
    id: 'new',
    title: 'nouvelle conversation',
    avatarUrl: createAvatarDataUrl("New", yellow[200], green[900]),
  }

  return conversation;
}