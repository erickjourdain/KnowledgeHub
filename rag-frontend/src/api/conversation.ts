import type { Conversation } from "@appTypes/Conversation";
import instance from "./instance";

const updateConversation = async (uuid: string, title: string): Promise<Conversation> => {
  try {
    const response = await instance.put(`/conversations/${uuid}`, { title });
    return response.data as Conversation;
  } catch (error) {
    throw new Error("Impossible de renommer la conversation");
  }
};

const delConversation = async (uuid: string): Promise<boolean> => {
  try {
      const response = await instance.delete(`/conversations/${uuid}`);
      return response.data as boolean;
  } catch (error) {
    throw new Error("Impossible de supprimer la conversation");
  }
} 

export {
  updateConversation,
  delConversation
}