export type Conversation = {
    id: string;
    userId: string;
    title: string;
    createdAt: string;
    updatedAt: string;
};

export type ChatMessage = {
    id: string;
    conversationId: string;
    role: "user" | "assistant" | "tool";
    content: string;
    calorieEntryId?: string;
    metadata: Record<string, unknown>;
    createdAt: string;
};

export type AgentResponse = {
    conversationId: string;
    message: string;
    entry?: { id: string; calories: number; dish: string };
};
