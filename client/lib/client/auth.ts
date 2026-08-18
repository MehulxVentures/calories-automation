import { AllPasteResponse, CreatePaste, GetAndDelPasteContent, PasteResponse } from "@/types/auth";
import apiClient from "../axios";

export const createPasteAPI = (payload: CreatePaste) =>
    apiClient.post<PasteResponse>('/submit', payload).then((r) => r.data);

export const getPasteContentAPI = (payload: GetAndDelPasteContent) =>
    apiClient.get<PasteResponse>(`/paste/${payload.token}`).then((r) => r.data);

export const getAllPastesAPI = () => 
    apiClient.get<AllPasteResponse>(`/all-pastes`).then((r) => r.data);

export const deletePasteAPI = (payload: GetAndDelPasteContent) => 
    apiClient.delete<PasteResponse>(`paste/${payload.token}`).then((r) => r.data);