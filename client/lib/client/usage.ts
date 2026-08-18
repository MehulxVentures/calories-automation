import { serverApi } from "../axios";

export type UsageSummary = { inputTokens: number; outputTokens: number; requests: number };

export const getUsageApi = () =>
    serverApi.get<{ usage: unknown[]; summary: UsageSummary }>("/usage").then((response) => response.data);
