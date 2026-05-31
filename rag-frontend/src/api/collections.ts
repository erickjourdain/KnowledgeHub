import type { ApiData, ApiMessage } from '@appTypes/Api';
import type { 
  Collection, 
  CollectionCreate, 
  CollectionUpdate, 
  UsersInCollection} from '@appTypes/Collection';
import type { Document, InsertResponse } from '@appTypes/Document';
import instance from './instance';


const fetchCollections = async (
  page: number = 1, 
  pageSize: number = 25,
  search: string | null = null
): Promise<ApiData<Collection>> => {
  try {
    const skip = (page - 1) * pageSize;
    let url = `/collections?skip=${skip}&limit=${pageSize}`;
    if (search !== null) url += `&search=${search.trim()}`;
    const response = await instance.get(url);
    return response.data as ApiData<Collection>;
  } catch (error) {
    throw new Error("Impossible de récupérer les collections");
  }
}

const fetchCollection = async (id: string): Promise<Collection> => {
  try {
    const response = await instance.get(`/collections/${id}`);
    return response.data as Collection;
  } catch (error) {
    throw new Error("Impossible de charger la collection");
  }
}

const createCollection = async (payload: CollectionCreate): Promise<Collection> => {
  try {
    const response = await instance({
      url: "/collections",
      method: "POST",
      data: payload
    });
    return response.data as Collection;
  } catch (error) {
    throw new Error("Impossible de créer la collection");
  }
}

const updateCollection = async (payload: CollectionUpdate, id: string): 
  Promise<Collection> => {
  try {
    const response = await instance({
      url: `/collections/${id}`,
      method: "PUT",
      data: payload
    });
    return response.data as Collection;
  } catch (error) {
    throw new Error("Impossible de mettre à jour la collection");
  }
}

const deleteCollection = async (collectionId: string): Promise<ApiMessage> => {
  try {
    const response = await instance.delete(`/collections/${collectionId}`);
    return response.data as ApiMessage;
  } catch (error) {
    throw new Error("Impossible de supprimer la collection");
  }
}

const deleteDocument = async (collectionId: string, documentId: string): 
  Promise<ApiMessage> => {
  try {
    const response = 
      await instance.delete(`/collections/${collectionId}/documents/${documentId}`);
    return response.data as ApiMessage;
  } catch (error) {
    throw new Error("Impossible de supprimer le document");
  }
}

const deleteCollectionUser = async(collectionId: string, userId: string): 
  Promise<ApiMessage> => {
  try {
    const response = 
      await instance.delete(`/collections/${collectionId}/users/${userId}`);
    return response.data as ApiMessage
  } catch (error) {
    throw new Error("Impossible de supprimer l'utilisateur");
  }
}

const addCollectionUser = async(collectionId: string, userId: string):
  Promise<ApiMessage> => {
  try {
    const response = 
      await instance.post(`/collections/${collectionId}/users/${userId}`);
    return response.data as ApiMessage
  } catch (error) {
    throw new Error("Impossible d'ajouter l'utilisateur");
  }
  }

const fetchCollectionDocument = async (
  collectionId: string, page: number = 1, pageSize: number = 25): 
  Promise<ApiData<Document>> => {
  try {
    const skip = (page - 1) * pageSize;
    const response = await instance.get(`/collections/${collectionId}/documents`, {
      params: {
        page,
        limit: pageSize,
        skip
      }
    });
    return response.data as ApiData<Document>;
  } catch (error) {
    throw new Error("Impossible de récupérer les documents de la collection");
  }
}

const fetchCollectionUsersStatut = async (
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

const startDocumentInsertion = async (collectionId: string, file: File):
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

export {
  fetchCollection,
  fetchCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  deleteDocument,
  addCollectionUser,
  deleteCollectionUser,
  fetchCollectionDocument,
  fetchCollectionUsersStatut,
  startDocumentInsertion,
}