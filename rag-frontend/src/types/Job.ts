import type { Document } from "./Document"

export type JobStatus = 'queued' | 'started' | 'finished' | 'failed' 
  | 'stopped' | 'canceled' | 'deferred' | null

export interface JobInfoStatut {
  job_id: string
  status: JobStatus
  type: 'ingestion' | 'query'
  step: 'starting' | 'conversion' | 'chunking' | 'embedding' | 'file_storage'
    | 'db_storage' | 'done' | null
  message: string | null
  progress: number
}

export interface JobDocument extends JobInfoStatut {
  filename?: string
  collection_id?: number
}

export interface Job {
  job_id: string
  status: JobStatus
  result?: any
  error?: string
}

export interface FinishedIngestionJob {
  id: number
  uuid: string
  collection_id: number
  document_id: number
  filename: string
  document: Document | null
  status: JobStatus
  result: any
  error: string | null
  created_at: Date
}

export interface Source {
  fichier: string
  chapitre: string
  section: string
  page: number
}

export interface RagResponse {
    query: string
    title: string | null
    reponse: string
    sources: Source[]
}

export interface FinishedKbQueryJob {
    id: number
    uuid: string
    collection_id: number
    query: string
    creator_id: number
    status: string
    result: RagResponse | null
    error: string | null
    created_at: Date
}