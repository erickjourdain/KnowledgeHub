import { styled } from "@mui/material/styles";
import { Card as MuiCard, Stack } from "@mui/material";
import type { Theme } from "@mui/material";

const SignInContainer = styled(Stack)(({ theme }: { theme: Theme }) => ({
  height: 'calc((1 - var(--template-frame-height, 0)) * 100dvh)',
  minHeight: '100%',
  padding: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(4),
  },
  '&::before': {
    content: '""',
    display: 'block',
    position: 'absolute',
    zIndex: -1,
    inset: 0,
    backgroundImage:
      'radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))',
    backgroundRepeat: 'no-repeat',
    ...theme.applyStyles('dark', {
      backgroundImage:
        'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.04) 50%, #090d16 100%)',
    }),
  },
}));

const Card = styled(MuiCard)(({ theme }: { theme: Theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'center',
  width: '100%',
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    maxWidth: '450px',
  },
  borderRadius: '20px',
  backgroundImage: 'none',
  backgroundColor: 'rgba(15, 23, 42, 0.45)',
  backdropFilter: 'blur(16px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.35)',
  ...theme.applyStyles('dark', {
    boxShadow: '0 12px 40px 0 rgba(0, 0, 0, 0.55)',
  }),
}));

export { SignInContainer, Card };