"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { clearSessionCookie, getCurrentUserApi, loginApi, persistSessionCookie, registerApi } from "@/lib/client/auth";
import { useAuthStore } from "@/store/auth-store";

function errorMessage(error: unknown) {
    if (typeof error === "object" && error && "response" in error) {
        const response = (error as { response?: { data?: { error?: string } } }).response;
        if (response?.data?.error) return response.data.error;
    }
    return "Something went wrong";
}

export function useLogin() {
    const router = useRouter();
    const setSession = useAuthStore((state) => state.setSession);
    return useMutation({
        mutationFn: loginApi,
        onSuccess: async ({ token, user }) => {
            await persistSessionCookie(token);
            setSession(token, user);
            router.replace("/dashboard/chat");
            router.refresh();
        },
        onError: (error) => toast.error(errorMessage(error)),
    });
}

export function useRegister() {
    const router = useRouter();
    const setSession = useAuthStore((state) => state.setSession);
    return useMutation({
        mutationFn: registerApi,
        onSuccess: async ({ token, user }) => {
            await persistSessionCookie(token);
            setSession(token, user);
            router.replace("/dashboard/chat");
            router.refresh();
        },
        onError: (error) => toast.error(errorMessage(error)),
    });
}

export function useCurrentUser() {
    const token = useAuthStore((state) => state.token);
    const setUser = useAuthStore((state) => state.setUser);
    const clearSession = useAuthStore((state) => state.clearSession);
    return useQuery({
        queryKey: ["auth", "me"],
        queryFn: async () => {
            try {
                const { user } = await getCurrentUserApi();
                setUser(user);
                return user;
            } catch (error) {
                clearSession();
                throw error;
            }
        },
        enabled: Boolean(token),
        retry: false,
    });
}

export function useLogout() {
    const router = useRouter();
    const clearSession = useAuthStore((state) => state.clearSession);
    return useMutation({
        mutationFn: clearSessionCookie,
        onSuccess: () => {
            clearSession();
            router.replace("/sign-in");
            router.refresh();
        },
    });
}
