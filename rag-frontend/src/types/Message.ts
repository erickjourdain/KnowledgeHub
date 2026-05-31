export interface Source {
  fichier: string
  chapitre: string
  section: string
  page: number
}
export interface Message {
  id: number
  uuid: string
  conversation_id: number
  sender_id: number
  questions: string
  answer: string | null
  sources: Source[] | null
  created_at: string
}