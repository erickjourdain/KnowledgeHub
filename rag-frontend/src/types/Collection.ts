import type { Document } from "./Document";
import type { User } from "./User";

interface BaseCollection {
  name: string;
  description: string;
  modele: string;
  creator_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface Collection extends BaseCollection {
  id: number;
  uuid: string;
  authorized_users_count: number;
  documents_count: number;
}

export interface CollectionDetail extends BaseCollection {
  id: number;
  uuid: string;
  authorized_users?: User[];
  documents?: Document[];
}

export interface CollectionCreate {
  name: string;
  description?: string;
  modele?: string;
}

export interface CollectionUpdate {
  name?: string;
  description?: string;
}

export interface UsersInCollection {
  id: number;
  authorized: boolean;
}