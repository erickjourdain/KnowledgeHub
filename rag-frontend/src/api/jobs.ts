import type { FinishedIngestionJob } from "../types/Job";
import instance from "./instance"

const fecthFinishedIngestionJob = async (jobId: string): Promise<FinishedIngestionJob> => {
  try {
    const response = await instance.get(`/jobs/ingestion/${jobId}`);
    return response.data as FinishedIngestionJob;
  } catch (error) {
    throw new Error("Impossible de charger le job");
  }
}

const fetchFinishedIngestionJobCollection = 
  async (collectionId: string): Promise<FinishedIngestionJob[]> => {
    try {
      const response = await instance.get(`/jobs/ingestion/collection/${collectionId}`);
      return response.data as FinishedIngestionJob[]
    } catch (error) {
      throw new Error("Impossible de charger les jobs de la collection");
    }
  }

export {
  fecthFinishedIngestionJob,
  fetchFinishedIngestionJobCollection
}