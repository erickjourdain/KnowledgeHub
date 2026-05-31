import type { User } from "@appTypes/User";

export const isAuth = (user: User | null) => {
  return user !== null
}

export const isAdmin = (user: User | null) => {
  return isAuth(user) && user.role === 'ADMIN';
}

export const isGestionnaire = (user: User | null) => {
  return isAuth(user) && user.role === 'GESTIONNAIRE';
}

export const isCreator = (user: User | null, creatorId: number) => {
  return (isGestionnaire(user) || isAdmin(user)) 
    && isAuth(user) && user.id === creatorId;
}