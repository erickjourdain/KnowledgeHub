export type UserRole = 'ADMIN' | 'GESTIONNAIRE' | 'USER';

export const USER_ROLES: Record<UserRole, string> = {
  'USER': 'Utilisateur',
  'GESTIONNAIRE': 'Gestionnaire',
  'ADMIN': 'Administrateur'
};

export const USER_ROLE_VALUES: UserRole[] = Object.keys(USER_ROLES) as UserRole[];

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  icon?: string;
  slug: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserCreate {
  username: string;
  email: string;
  password: string;
}

export interface UserUpdate {
  username?: string;
  email?: string;
  role?: UserRole;
  old_password?: string;
  password?: string;
  is_active?: boolean;
  icon?: string;
}

export interface UserAuth extends User {
  is_authorised: boolean
}

export interface Login {
  username: string;
  password: string;
}
