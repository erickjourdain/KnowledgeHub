import type { Collection } from '@appTypes/Collection';
import { atom } from 'jotai';

const collectionAtom = atom<Collection | null>(null);

export { collectionAtom };