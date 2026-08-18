import { ChatOpenRouter } from "@langchain/openrouter";

export const modelId = "dots-studio/dots-3-note-preview:free"

export const model = (apikey: string) => {
    return new ChatOpenRouter({
        model: modelId,
		temperature: 0,
        apiKey: apikey
    })
}
