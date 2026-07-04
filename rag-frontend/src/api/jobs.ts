import type { IngestionJob } from "../types/Job";
import instance from "./instance"

const fecthIngestionJob = async (jobId: string): Promise<IngestionJob> => {
  try {
    const response = await instance.get(`/jobs/ingestion/${jobId}`);
    return response.data as IngestionJob;
  } catch (error) {
    throw new Error("Impossible de charger le job");
  }
}

const fetchFinishedIngestionJobCollection =
  async (collectionId: string): Promise<IngestionJob[]> => {
    try {
      const response = await instance.get(`/jobs/ingestion/collection/${collectionId}`);
      return response.data as IngestionJob[]
    } catch (error) {
      throw new Error("Impossible de charger les jobs de la collection");
    }
  }

export {
  fecthIngestionJob,
  fetchFinishedIngestionJobCollection
}