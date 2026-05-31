export interface Document {
  id: number;
  title: string;
  collection_id: number;
  is_indexed: boolean;
  nb_chunks: Int16Array;
  created_at: Date;
  updated_at: Date;
}

export interface QueueFile {
  id: string
  collection: string
  file: File
  status: string
  queueId: string | null
}

export interface InsertResponse {
  job_id: string
  status: 'queued' | 'started' | 'finished' | 'failed' | 'stopped' 
    | 'canceled' | 'deferred'
}