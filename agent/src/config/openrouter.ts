import { ChatOpenRouter } from "@langchain/openrouter";

export const modelId = "google/gemini-3.7-flash"

export const model = (apikey: string) => {
    return new ChatOpenRouter({
        model: modelId,
		temperature: 0,
        apiKey: apikey
    })
}
