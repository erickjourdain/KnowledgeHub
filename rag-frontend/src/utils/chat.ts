import type { ChatConversation, ChatUser, ChatMessagePart } from '@mui/x-chat/headless';
import type { User } from '@appTypes/User';
import type { Message } from '@appTypes/Message';
import logoUrl from '../assets/logo.png';

function adjustColor(hex: string, percent: number): string {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(char => char + char).join('');
  }
  const num = parseInt(cleanHex, 16);
  let r = (num >> 16) + Math.round(255 * (percent / 100));
  let g = ((num >> 8) & 0x00FF) + Math.round(255 * (percent / 100));
  let b = (num & 0x0000FF) + Math.round(255 * (percent / 100));
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function createAvatarDataUrl(
  label: string,
  background: string,
  foreground = '#ffffff'
) {
  let fillValue = background;
  let gradientDefs = '';

  if (background.startsWith('#')) {
    const startColor = background;
    const endColor = adjustColor(background, 20); // 20% lighter
    const gradId = `grad_${background.replace('#', '')}`;
    gradientDefs = `<defs><linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${startColor}"/><stop offset="100%" stop-color="${endColor}"/></linearGradient></defs>`;
    fillValue = `url(#${gradId})`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">${gradientDefs}<rect width="96" height="96" rx="28" fill="${fillValue}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="700" fill="${foreground}">${label}</text></svg>`;

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
    avatarUrl: user.icon,
    isOnline: true,
    role: 'user',
  }
}

export function createEmptyConversation(): ChatConversation {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><defs><linearGradient id="newGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#a855f7"/></linearGradient></defs><rect width="96" height="96" rx="28" fill="url(#newGrad)"/><path d="M48 28v40M28 48h40" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/></svg>`;

  const conversation: ChatConversation = {
    id: 'new',
    title: 'nouvelle conversation',
    avatarUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
  }

  return conversation;
}

export function defineMessageParts(message: Message): ChatMessagePart[] {
  const messageParts: ChatMessagePart[] = [];
  messageParts.push(
    { type: 'text', text: message.answer || 'aucune réponse' }
  );
  if (message.sources) {
    message.sources.forEach(source => {
      messageParts.push(
        {
          type: 'source-document',
          sourceId: source.id.toString(),
          title: source.fichier,
          text: `${source.chapitre} - ${source.section}`
        } as any
      )
    })
  }
  return messageParts;
}