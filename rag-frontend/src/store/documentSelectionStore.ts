import { atom } from 'jotai';

export interface DocumentSelection {
  mode: 'all_except' | 'none_except';
  ids: number[];
}

export const documentSelectionAtom = atom<Record<string, DocumentSelection>>({});
