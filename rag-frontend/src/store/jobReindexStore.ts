// src/store/jobReindexStore.ts
import { atom } from 'jotai';
import { atomFamily } from 'jotai-family';
import type { FinishedIngestionJob, JobDocument } from '@appTypes/Job';

// Holds the list of job IDs currently tracked
export const jobReindexIdsAtom = atom<string[]>([]);

// Family of atoms for each job ID
export const jobReindexAtomFamily = atomFamily((jobId: string) =>
  atom<JobDocument>({
    job_id: jobId,
    filename: undefined,
    status: null,
    type: 'ingestion',
    step: null,
    message: null,
    progress: 0,
    collection_id: 0,
  })
);

// Atom to update a job's data
export const updateJobReindexAtom = atom(
  null,
  (_get, set, payload: JobDocument) => {
    console.log('updateJobReindexAtom called', payload);
    const jobAtom = jobReindexAtomFamily(payload.job_id);
    set(jobAtom, (prev) => ({
      ...prev,
      ...payload,
    }));
  }
);

// List of finished ingestion jobs
export const jobsReindexFinishedAtom = atom<FinishedIngestionJob[]>([]);

// Flag indicating if any job got updated
export const jobReindexUpdatedAtom = atom<boolean>(false);
