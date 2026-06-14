import type { Collection, CollectionCreate, CollectionDetail, CollectionUpdate, UsersInCollection } from '../types/Collection';
import type { Document, InsertResponse } from '../types/Document';
import type { ApiData, ApiMessage } from '../types/Api';
import instance from './instance';

// Fetch a paginated list of collections, optionally filtered by a search term
export const fetchCollections = async (
  page: number = 1,
  pageSize: number = 20,
  search: string | null = null
): Promise<ApiData<Collection>> => {
  const skip = (page - 1) * pageSize;
  let url = `/collections?skip=${skip}&limit=${pageSize}`;
  if (search !== null) {
    url += `&search=${encodeURIComponent(search)}`;
  }
  const response = await instance.get(url);
  return response.data as ApiData<Collection>;
};

// Fetch a single collection with its details (documents, users, …)
export const fetchCollection = async (id: string | number): Promise<CollectionDetail> => {
  const response = await instance.get(`/collections/${id}`);
  return response.data as CollectionDetail;
};

// Create a new collection
export const createCollection = async (data: CollectionCreate): Promise<Collection> => {
  const response = await instance.post('/collections', data);
  return response.data as Collection;
};

// Update an existing collection
export const updateCollection = async (
  data: CollectionUpdate,
  id: string | number
): Promise<Collection> => {
  const response = await instance.put(`/collections/${id}`, data);
  return response.data as Collection;
};

// Delete a collection
export const deleteCollection = async (id: string | number): Promise<ApiMessage> => {
  const response = await instance.delete(`/collections/${id}`);
  return response.data as ApiMessage;
};

// Trigger a re‑indexing job for a collection
import type { JobInfoStatut } from "../types/Job";

export const reindexCollection = async (
  id: string | number
): Promise<JobInfoStatut[]> => {
  const response = await instance.post(`/collections/${id}/reindex`);
  return response.data as JobInfoStatut[];
};

// Start a document insertion job (file upload)
export const startDocumentInsertion = async (collectionId: string, file: File):
  Promise<InsertResponse> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const response = await instance({
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      url: `/collections/${collectionId}/upload`,
      method: "POST",
      data: formData
    });
    return response.data as InsertResponse;
  } catch (error) {
    throw new Error("Erreur du lancement du traitement du fichier");
  }
}

// Delete a specific document from a collection
export const deleteDocument = async (
  collectionId: string | number,
  documentId: string | number
): Promise<ApiMessage> => {
  const response = await instance.delete(
    `/collections/${collectionId}/documents/${documentId}`
  );
  return response.data as ApiMessage;
};

// Fetch documents of a collection with pagination and optional search
export const fetchCollectionDocument = async (
  collectionId: string | number,
  page: number = 1,
  pageSize: number = 20,
  search: string | null = null
): Promise<ApiData<Document>> => {
  const skip = (page - 1) * pageSize;
  let url = `/collections/${collectionId}/documents?skip=${skip}&limit=${pageSize}`;
  if (search !== null) {
    url += `&search=${encodeURIComponent(search)}`;
  }
  const response = await instance.get(url);
  return response.data as ApiData<Document>;
};

// ------------------------------------------------------------
// User‑collection management helpers
// ------------------------------------------------------------
/**
 * Add a user to a collection.
 */
export const addCollectionUser = async (collectionId: string, userId: string):
  Promise<ApiMessage> => {
  try {
    const response =
      await instance.post(`/collections/${collectionId}/users/${userId}`);
    return response.data as ApiMessage
  } catch (error) {
    throw new Error("Impossible d'ajouter l'utilisateur");
  }
}
/**
 * Remove a user from a collection.
 */
export const deleteCollectionUser = async (collectionId: string, userId: string):
  Promise<ApiMessage> => {
  try {
    const response =
      await instance.delete(`/collections/${collectionId}/users/${userId}`);
    return response.data as ApiMessage
  } catch (error) {
    throw new Error("Impossible de supprimer l'utilisateur");
  }
}
/**
 * Fetch authorization status of users for a collection.
 */
export const fetchCollectionUsersStatut = async (
  collectionId: string, users: number[]
): Promise<UsersInCollection[]> => {
  try {
    const usersList = users.join(',');
    const response = await instance.get(
      `/collections/${collectionId}/users?users=${usersList}`
    );
    return response.data as UsersInCollection[];
  } catch (error) {
    throw new Error("Impossible de récupérer l'information sur les utilisateurs");
  }
}






