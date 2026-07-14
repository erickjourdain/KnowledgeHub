import qs from 'qs';
import type { Login, User, TokenResponse } from '../types/User';
import instance from './instance';
import { AxiosError } from 'axios';

const apiLogin = async (payload: Login): Promise<TokenResponse> => {
  try {
    const response = await instance.request(
      {
        method: "POST",
        url: "/users/login",
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        data: qs.stringify(payload)
      }
    );
    console.log("Login response:", response.data);
    return response.data;
  } catch (error: any) {
    if (typeof AxiosError && error.response && error.response.data)
      throw new Error(error.response.data.detail || "Impossible de se connecter avec les informations fournies");
    throw new Error("Impossible de se connecter avec les informations fournies")
  }
}

const apiAutoLogin = async (): Promise<User> => {
  try {
    const response = await instance.get(
      "/users/me"
    );
    console.log("Auto login response:", response.data);
    return response.data;
  } catch (error: any) {
    if (typeof AxiosError && error.response && error.response.data)
      throw new Error(error.response.data.detail || "Impossible de se connecter avec les informations disponibles");
    throw new Error("Impossible de se connecter avec les informations disponibles")
  }
}

export { apiLogin, apiAutoLogin };