import { ChatOpenRouter } from "@langchain/openrouter";

const modelId = "dots-studio/dots-3-note-preview:free"

export const model = (apikey: string) => {
    return new ChatOpenRouter({
        model: modelId,
        temperature: 0.7,
        apiKey: apikey
    })
}