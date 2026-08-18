import { modelId } from "../config/openrouter"

export async function recordUsage(
    apiUrl: string,
    authorization: string,
    inputTokens: number,
    outputTokens: number,
) {
    if (inputTokens === 0 && outputTokens === 0) return
    const response = await fetch(`${apiUrl}/usage`, {
        method: "POST",
        headers: { Authorization: authorization, "Content-Type": "application/json" },
        body: JSON.stringify({
            model: modelId,
            inputTokens,
            outputTokens,
        }),
    })
    if (!response.ok) {
        console.error(JSON.stringify({ event: "usage_record_failed", status: response.status }))
    }
}
