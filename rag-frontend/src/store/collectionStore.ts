import type { CollectionDetail } from '@appTypes/Collection';
import { atom } from 'jotai';
const collectionAtom = atom<CollectionDetail | null>(null);
export { collectionAtom };