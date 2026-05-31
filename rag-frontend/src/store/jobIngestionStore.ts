import { atom } from 'jotai';
import { atomFamily } from 'jotai-family';
import type { FinishedIngestionJob, JobDocument } from '@appTypes/Job';

const jobIngestionIdsAtom = atom<string[]>([]);

const jobIngestionAtomFamily = atomFamily((jobId: string) =>
  atom<JobDocument>({
    job_id: jobId,
    filename: undefined,
    status: null,
    type: 'ingestion',
    step: null,
    message: null,
    progress: 0,
    collection_id: 0
  })
);

const updateJobIngestionAtom = atom(
  null,
  (_get, set, payload: JobDocument) => {

    const jobAtom = jobIngestionAtomFamily(payload.job_id)

    set(jobAtom, (prev) => ({
      ...prev,
      ...payload
    }))
  }
);

const jobsIngestionFinishedAtom = atom<FinishedIngestionJob[]>([]);

const jobIngestionUpdatedAtom = atom<boolean>(false);

export { 
  jobIngestionIdsAtom, 
  jobIngestionAtomFamily, 
  updateJobIngestionAtom, 
  jobsIngestionFinishedAtom,
  jobIngestionUpdatedAtom
}
