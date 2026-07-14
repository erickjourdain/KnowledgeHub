import type { RagQuery } from "@appTypes/Query";
import instance from "./instance";
import type { FinishedKbQueryJob, Job } from "@appTypes/Job";
import type { ApiData } from "@appTypes/Api";
import type { Conversation } from "@appTypes/Conversation";
import type { Message } from "@appTypes/Message";

const testChat = async (
  query: RagQuery
): Promise<Job> => {
  try {
    const response = await instance({
      url: "/test/query",
      method: "POST",
      data: query
    });
    return response.data as Job
  } catch (error) {
    throw new Error("Impossible d'obtenir la réponse à la demande");
  }
}

const queryRag = async (
  query: RagQuery
): Promise<Job> => {
  try {
    const response = await instance({
      url: "/rag/query",
      method: "POST",
      data: query
    });
    return response.data as Job;
  } catch (error) {
    throw new Error("Impossible de générer la réponse à la question");
  }
}

const fetchFinishedKbJob = async (
  uuid: string
): Promise<FinishedKbQueryJob> => {
  try {
    const response = await instance({
      url: `/jobs/kb/${uuid}`,
      method: 'GET'
    });
    return response.data as FinishedKbQueryJob
  } catch (error) {
    throw new Error("Erreur lors de la récupération de la réponse");
  }
}

const fetchConversations = async (
  collection_id: number,
  search: string | null = null,
  page: number = 1,
  pageSize: number = 20,
): Promise<ApiData<Conversation>> => {
  try {
    const skip = (page - 1) * pageSize;
    let url = `/conversations/collection/${collection_id}?skip=${skip}&limit=${pageSize}`;
    if (search !== null) url += `&search=${search.trim()}`;
    const response = await instance.get(url);
    return response.data as ApiData<Conversation>
  } catch (error) {
    throw new Error("Erreur lors de la récupération des conversations");
  }
}

const fetchConversationMessages = async (
  conversation_uuid: string,
  page: number = 1,
  pageSize: number = 20
): Promise<ApiData<Message>> => {
  try {
    const skip = (page - 1) * pageSize;
    const url = `/conversations/${conversation_uuid}/messages?skip=${skip}&limit=${pageSize}`;
    const response = await instance.get(url);
    return response.data as ApiData<Message>
  } catch (error) {
    throw new Error("Erreur lors de la récupération des messages");
    
  }
}

const fetchMessage = async (
  message_uuid: string
): Promise<Message> => {
  try {
    const response = await instance.get(`/messages/${message_uuid}`);
    return response.data as Message;
  } catch (error) {
    throw new Error("Erreur lors de la récupération du message");
  }
}

const fetchLlmModels = async (): Promise<LlmModel[]> => {
  try {
    const response = await instance.get("/ollama/models");
    return response.data as LlmModel[];
  } catch (error) {
    throw new Error("Erreur lors de la récupération des modèles");
  }
}

const fetchDefaultLlmModel = async (): Promise<{ default_model: string }> => {
  try {
    const response = await instance.get("/ollama/default-model");
    return response.data as { default_model: string };
  } catch (error) {
    throw new Error("Erreur lors de la récupération du modèle par défaut");
  }
}

export interface LlmModel {
  name: string;
  digest?: string | null;
  size?: number | null;
  embed: boolean;
  parameter_size?: string | null;
}

export {
  testChat,
  queryRag,
  fetchFinishedKbJob,
  fetchConversations,
  fetchConversationMessages,
  fetchMessage,
  fetchLlmModels,
  fetchDefaultLlmModel
}