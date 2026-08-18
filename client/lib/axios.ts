import axios from "axios";
import { env } from "./env";
import { useAuthStore } from "@/store/auth-store";

export const serverApi = axios.create({ baseURL: env.NEXT_PUBLIC_SERVER_API_BASE });
export const agentApi = axios.create({ baseURL: env.NEXT_PUBLIC_AGENT_API_BASE });

[serverApi, agentApi].forEach((client) => {
    client.defaults.headers.common["Content-Type"] = "application/json";
    client.interceptors.request.use((config) => {
        const token = useAuthStore.getState().token;
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    });
});

export default serverApi;
