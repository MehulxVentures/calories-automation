"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCalorieApi, deleteCalorieApi, listCaloriesApi, updateCalorieApi } from "@/lib/client/calories";

export const useCalories = () => useQuery({ queryKey: ["calories"], queryFn: listCaloriesApi });

export function useCreateCalorie() {
    const client = useQueryClient();
    return useMutation({ mutationFn: createCalorieApi, onSuccess: () => client.invalidateQueries({ queryKey: ["calories"] }) });
}

export function useUpdateCalorie() {
    const client = useQueryClient();
    return useMutation({ mutationFn: updateCalorieApi, onSuccess: () => client.invalidateQueries({ queryKey: ["calories"] }) });
}

export function useDeleteCalorie() {
    const client = useQueryClient();
    return useMutation({ mutationFn: deleteCalorieApi, onSuccess: () => client.invalidateQueries({ queryKey: ["calories"] }) });
}
