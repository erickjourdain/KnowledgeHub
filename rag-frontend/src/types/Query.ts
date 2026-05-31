export interface RagQuery {
  query: string
  collection_id: number
  conversation_uuid?: string
  title?: string
  model?: string
  top_k?: number
}