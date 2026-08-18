import axios from "axios";
import { env } from "./env";

const apiClient = axios.create({
    baseURL: `${env.NEXT_PUBLIC_API_BASE}`,
    headers: {
        "Content-Type": "application/json"
    }
});

export default apiClient;