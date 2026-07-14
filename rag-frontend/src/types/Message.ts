import type { User } from './User';

export interface Source {
  id: number
  fichier: string
  chapitre: string
  section: string
  page: number
}
export interface Message {
  id: number
  uuid: string
  conversation_id: number
  sender: User
  questions: string
  answer: string | null
  sources: Source[] | null
  created_at: string
}