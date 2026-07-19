import React, { createContext, useCallback, useContext, useState, useEffect } from "react";
import { Box, Grid, LinearProgress, Typography } from "@mui/material";
import { useAtom } from "jotai";
import { apiAutoLogin, apiLogin, apiLogout } from "@api/connection";
import { tokenAtomStorage } from "@store/authStore";
import type { TokenResponse, User } from "@appTypes/User";
import type { AuthState } from "@appTypes/AuthState";
import instance from "@api/instance";

const AuthContext = createContext<AuthState | undefined>(undefined);

async function autoLogin() {
  // Tente de se connecter en s'appuyant sur le Cookie HTTPOnly
  return await apiAutoLogin();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useAtom(tokenAtomStorage);
  const [loading, setLoading] = useState(true);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const tokenResponse: TokenResponse = await apiLogin({ username, password });
      // Fallback : stocker le token dans l'état local / localStorage
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
  }, [setToken]);

  const logout = useCallback(async () => {
    try {
      // Invalider la session côté serveur en supprimant les cookies
      await apiLogout();

      // Supprimer le token de secours localement
      setToken("");
      localStorage.removeItem("auth-token");
      
      // Remettre à zéro l'instance axios en supprimant le Bearer token
      delete instance.defaults.headers.common["Authorization"];
      
      setUser(null);
      setIsAuthenticated(false);
      
      // Rediriger l'utilisateur vers la page de login
      window.location.href = "/login";
    } catch (error) {
      console.error("Error during logout:", error);
    }
  }, [setToken]);

  const refreshUser = useCallback(async () => {
    try {
      const updatedUser: User = await apiAutoLogin();
      setUser(updatedUser);
      return updatedUser;
    } catch (error) {
      console.error("Error refreshing user profile:", error);
      throw error;
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    autoLogin()
      .then((user) => {
        setUser(user);
        setIsAuthenticated(!!user);
      }).catch(() => {
        setUser(null);
        setIsAuthenticated(false);
      }).finally(() => {
        setLoading(false);
      });
  }, []);

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
    <AuthContext.Provider value={{ isAuthenticated, user, token, login, logout, refreshUser }}>
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