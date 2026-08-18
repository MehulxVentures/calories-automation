"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type ChatState = {
    activeConversationId: string | null;
    setActiveConversation: (id: string | null) => void;
    startNewConversation: () => void;
};

export const useChatStore = create<ChatState>()(persist(
    (set) => ({
        activeConversationId: null,
        setActiveConversation: (id) => set({ activeConversationId: id }),
        startNewConversation: () => set({ activeConversationId: null }),
    }),
    { name: "uli-chat" },
));
