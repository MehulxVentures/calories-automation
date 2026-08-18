import { agentApi, serverApi } from "../axios";
import type { AgentResponse, ChatMessage, Conversation } from "@/types/chat";

export const listConversationsApi = () =>
    serverApi.get<{ conversations: Conversation[] }>("/chat/conversations").then((response) => response.data.conversations);

export const listMessagesApi = (conversationId: string) =>
    serverApi.get<{ messages: ChatMessage[] }>(`/chat/conversations/${conversationId}/messages?limit=30`)
        .then((response) => response.data.messages);

export const sendAgentMessageApi = (payload: { message: string; conversationId?: string }) =>
    agentApi.post<AgentResponse>("/api/v1/agent/chat", payload).then((response) => response.data);
