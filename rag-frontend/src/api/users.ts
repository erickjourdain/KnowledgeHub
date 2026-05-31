import type { ApiData, ApiMessage } from "@appTypes/Api";
import type { User } from "@appTypes/User";
import instance from "./instance";
import { AxiosError } from "axios";

const fetchUsers = 
  async (page: number=1, size: number=20, is_active?: boolean | null, search?: string | null): Promise<ApiData<User>> => {
  try {
    const offset = (page - 1 ) * size;
    let params = `offset=${offset}&limit=${size}`;
    if (is_active !== undefined && is_active !== null) params += `&is_active=${is_active}`;
    if (search !== undefined && search !== null) params += `&search=${encodeURIComponent(search)}`;
    const response = await instance.get(`/users?${params}`);
    return response.data as ApiData<User>;
  } catch (error) {
    throw new Error("Impossible de récupérer les utilisateurs")
  }
}

const fetchUser = async (userId: number): Promise<User> => {
  try {
    const response = await instance.get(`/users/${userId}`);
    return response.data as User;
  } catch (error) {
    throw new Error("Impossible de récupérer les informations de l'utilisateur")
  }
}

const updateUser = async (userId: number, data: Partial<User>): Promise<User> => {
  try {
    const response = await instance.put(`/users/${userId}`, data);
    return response.data as User;
  } catch (error: any) {
    if (typeof AxiosError && error.response && error.response.data)
      throw new Error(error.response.data.detail || "Impossible de modifier le compte");
    throw new Error("Impossible de modifier le compte")
  }
}

const registerUser = async (username: string, email: string, password: string): Promise<User> => {
  try {
    const response = await instance.post('/users/register', { username, email, password });
    return response.data as User;
  } catch (error: any) {
    if (typeof AxiosError && error.response && error.response.data)
      throw new Error(error.response.data.detail || "Impossible de créer le compte");
    throw new Error("Impossible de créer le compte")
  }
}

const activateUser = async (userId: number): Promise<ApiMessage> => {
  try {
    const response = await instance.post(`/users/activate/${userId}`);
    return response.data as ApiMessage;
  } catch (error) {
    throw new Error("Impossible d'activer le compte")
  }
}

const deactivateUser = async (userId: number): Promise<ApiMessage> => {
  try {
    const response = await instance.post(`/users/deactivate/${userId}`);
    return response.data as ApiMessage;
  } catch (error) {
    throw new Error("Impossible de désactiver le compte")
  }
}

const changePassword = async (
  username: string, 
  old_password: string, 
  new_password: string
): Promise<ApiMessage> => {
  try {
    const response = await instance.put(`/users/change-password`, { 
      username, 
      old_password, 
      new_password 
    });
    return response.data as ApiMessage;
  } catch (error: any) {
    if (typeof AxiosError && error.response && error.response.data)
      throw new Error(error.response.data.detail || "Impossible de changer le mot de passe");
    throw new Error("Impossible de changer le mot de passe")
  }
}

export { 
  fetchUsers, 
  fetchUser, 
  registerUser, 
  activateUser, 
  deactivateUser,
  changePassword,
  updateUser
}