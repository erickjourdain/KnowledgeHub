// src/store/jobReindexStore.ts
import { atom } from 'jotai';
import { atomFamily } from 'jotai-family';
import type { JobDocument } from '@appTypes/Job';

// Holds the list of job IDs currently tracked
export const jobReindexIdsAtom = atom<string[]>([]);

// Holds the list of job IDs currently finsihed
export const jobReindexFinishedIdsAtom = atom<string[]>([]);

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

// Family of atoms for each job ID
export const jobFinishedReindexAtomFamily = atomFamily((jobId: string) =>
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
    const jobAtom = jobReindexAtomFamily(payload.job_id);
    set(jobAtom, (prev) => ({
      ...prev,
      ...payload,
    }));
  }
);


// Derived atom: array of job objects for all tracked IDs
export const jobReindexListAtom = atom((get) => {
  const ids = get(jobReindexIdsAtom);
  return ids.map((id) => get(jobReindexAtomFamily(id)));
});

// Derived atom: count of finished jobs
export const finishedJobCountAtom = atom((get) => get(jobReindexFinishedIdsAtom).length);
