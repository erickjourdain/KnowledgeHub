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