import React, { createContext, useCallback, useContext, useState, useEffect } from "react";
import { Box, Grid, LinearProgress, Typography } from "@mui/material";
import { useAtom } from "jotai";
import { apiAutoLogin, apiLogin, apiLogout } from "@api/connection";
import { tokenAtomStorage } from "@store/authStore";
import type { TokenResponse, User } from "@appTypes/User";
import type { AuthState } from "@appTypes/AuthState";

const AuthContext = createContext<AuthState | undefined>(undefined);

async function autoLogin(token: string) {
  if (token.length) {
    return await apiAutoLogin()
  } else {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useAtom(tokenAtomStorage);
  const [loading, setLoading] = useState(true);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const tokenResponse: TokenResponse = await apiLogin({ username, password });
      setToken(tokenResponse.access_token);
      const user: User = await apiAutoLogin();
      setUser(user);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
      //localStorage.removeItem('auth-token');
      setToken("");
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      throw error;
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    autoLogin(token)
      .then((user) => {
        setUser(user);
        setIsAuthenticated(!!user);
      }).catch(() => {
        setUser(null);
        setIsAuthenticated(false);
      }).finally(() => {
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <Grid
        container
        spacing={2} 
        display="flex" 
        alignItems="center" 
        flexDirection="column"
        justifyContent="center"
        mt={2}
      >
        <Typography variant="h6" mb={2} >
          Chargement de l'application en cours...
        </Typography>
        <Box sx={{ width: "250px" }}>
          <LinearProgress aria-label="loading..."/>
        </Box>
      </Grid>
    )
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}