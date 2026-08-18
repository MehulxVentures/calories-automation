import { serverApi } from "../axios";
import type { CalorieEntry, CreateCalorieInput } from "@/types/calories";

export const listCaloriesApi = () =>
    serverApi.get<{ entries: CalorieEntry[]; totalCalories: number }>("/calories").then((response) => response.data);

export const createCalorieApi = (payload: CreateCalorieInput) =>
    serverApi.post<{ entry: CalorieEntry }>("/calories", payload).then((response) => response.data.entry);

export const updateCalorieApi = ({ id, ...payload }: Partial<CreateCalorieInput> & { id: string }) =>
    serverApi.patch<{ entry: CalorieEntry }>(`/calories/${id}`, payload).then((response) => response.data.entry);

export const deleteCalorieApi = (id: string) => serverApi.delete(`/calories/${id}`);
