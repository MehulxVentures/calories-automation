"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listConversationsApi, listMessagesApi, sendAgentMessageApi } from "@/lib/client/chat";
import { useChatStore } from "@/store/chat-store";

export function useConversations() {
    return useQuery({ queryKey: ["conversations"], queryFn: listConversationsApi });
}

export function useMessages() {
    const conversationId = useChatStore((state) => state.activeConversationId);
    return useQuery({
        queryKey: ["messages", conversationId],
        queryFn: () => listMessagesApi(conversationId!),
        enabled: Boolean(conversationId),
    });
}

export function useSendMessage() {
    const queryClient = useQueryClient();
    const conversationId = useChatStore((state) => state.activeConversationId);
    const setActiveConversation = useChatStore((state) => state.setActiveConversation);
    return useMutation({
        mutationFn: (message: string) => sendAgentMessageApi({ message, conversationId: conversationId ?? undefined }),
        onSuccess: async (response) => {
            setActiveConversation(response.conversationId);
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["conversations"] }),
                queryClient.invalidateQueries({ queryKey: ["messages", response.conversationId] }),
            ]);
        },
    });
}
