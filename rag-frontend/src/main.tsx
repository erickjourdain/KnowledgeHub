import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { frFR as coreFrFR} from "@mui/material/locale";
import { frFR as dataGridFrFR} from "@mui/x-data-grid/locales";
import App from "./App";

const theme = createTheme(
  {
    palette: {
      mode: "dark",
      primary: {
        main: '#6366f1', // Indigo moderne
        light: '#818cf8',
        dark: '#4f46e5',
      },
      secondary: {
        main: '#a855f7', // Violet moderne
        light: '#c084fc',
        dark: '#9333ea',
      },
      background: {
        default: '#090d16', // Ardoise très sombre
        paper: 'rgba(15, 23, 42, 0.65)', // Semi-transparent pour effet verre dépoli
      },
      text: {
        primary: '#f8fafc', // Blanc cassé/ardoise très clair
        secondary: '#94a3b8', // Ardoise moyen
      },
      info: {
        main: '#06b6d4', // Cyan
      },
      divider: 'rgba(255, 255, 255, 0.08)',
    },
    typography: {
      fontFamily: '"Outfit", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: {
        fontWeight: 700,
        letterSpacing: '-0.02em',
      },
      h6: {
        fontWeight: 600,
        letterSpacing: '-0.01em',
      },
      body1: {
        letterSpacing: '-0.005em',
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarWidth: 'thin',
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#090d16',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: '8px',
            padding: '8px 16px',
            transition: 'all 0.2s ease-in-out',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: '#090d16',
            borderRight: '1px solid rgba(255, 255, 255, 0.06)',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: 'rgba(9, 13, 22, 0.75)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            boxShadow: 'none',
          },
        },
      },
    },
  },
  coreFrFR,
  dataGridFrFR
);

const suppressFirstChildWarning = () => {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const message = args[0];
    if (
      typeof message === 'string' &&
      message.includes('pseudo class ":first-child"')
    ) {
      return;
    }
    originalError.apply(console, args);
  };
};

suppressFirstChildWarning();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);