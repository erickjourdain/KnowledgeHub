import { atomWithStorage } from "jotai/utils"

const tokenAtomStorage = atomWithStorage("auth-token", "");

export { tokenAtomStorage }
