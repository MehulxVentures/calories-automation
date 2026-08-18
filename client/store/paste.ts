import { createPasteAPI, getPasteContentAPI, deletePasteAPI, getAllPastesAPI } from "@/lib/client";
import { AllPasteResponse, AllPasteStoreState, CreatePaste, GetAndDelPasteContent, PasteResponse } from "@/types/paste";
import { create } from "zustand";

interface PasteStoreState {
    allPaste: AllPasteStoreState[] | []
    currentPaste: PasteResponse | null
    getPasteContent: (payload: GetAndDelPasteContent) => Promise<PasteResponse>
    createPaste: (payload: CreatePaste) => Promise<PasteResponse>
    deletePaste: (payload: GetAndDelPasteContent) => Promise<PasteResponse>
    getAllPaste: () => Promise<AllPasteResponse>
}

export const PasteStore = create<PasteStoreState>()((set) => ({
    currentPaste: null,
    allPaste: [],
    createPaste: async(payload) => await createPasteAPI(payload),
    getPasteContent: async(payload) => {
        const res = await getPasteContentAPI(payload)
        set({
            currentPaste: res
        })
        return res;
    },
    deletePaste: async(payload) => {
        const res = await deletePasteAPI(payload)
        set({
            currentPaste: null
        })
        return res;
    },
    getAllPaste: async() => {
        const res = await getAllPastesAPI()
        set({
            allPaste: res.data
        })
        return res;
    },
}));