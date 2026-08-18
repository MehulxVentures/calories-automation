import type { AuthResponse, Credentials, RegisterInput, UserResponse } from "@/types/auth";
import { serverApi } from "../axios";
import { env } from "../env";

export const loginApi = (payload: Credentials) =>
    serverApi.post<AuthResponse>("/auth/login", payload).then((response) => response.data);

export const registerApi = (payload: RegisterInput) =>
    serverApi.post<AuthResponse>("/auth/register", payload).then((response) => response.data);

export const getCurrentUserApi = () =>
    serverApi.get<UserResponse>("/auth/me").then((response) => response.data);

export async function getUserApi(token: string) {
    const response = await fetch(`${env.NEXT_PUBLIC_SERVER_API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
    });
    if (!response.ok) throw new Error("Invalid session");
    return response.json() as Promise<UserResponse>;
}

export const persistSessionCookie = (token: string) =>
    fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
    });

export const clearSessionCookie = () => fetch("/api/auth/session", { method: "DELETE" });
