import { atom } from 'jotai';
import type { JobInfoStatut} from '@appTypes/Job';

const jobQueryAtom = atom<JobInfoStatut | null>(null);

export { jobQueryAtom }