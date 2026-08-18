export type ChatMessage = {
	role: "user" | "assistant" | "tool";
	content: string;
};

type ConversationResponse = { conversation: { id: string } };
type MessagesResponse = { messages: ChatMessage[] };

async function goRequest<T>(apiUrl: string, authorization: string, path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(`${apiUrl}${path}`, {
		...init,
		headers: {
			Authorization: authorization,
			"Content-Type": "application/json",
			...init?.headers,
		},
	});
	const body = await response.json<{ error?: string } & T>();
	if (!response.ok) throw new Error(body.error ?? "Go chat API request failed");
	return body;
}

export async function createConversation(apiUrl: string, authorization: string, title: string) {
	const body = await goRequest<ConversationResponse>(apiUrl, authorization, "/chat/conversations", {
		method: "POST",
		body: JSON.stringify({ title }),
	});
	return body.conversation.id;
}

export async function loadMessages(apiUrl: string, authorization: string, conversationId: string) {
	const body = await goRequest<MessagesResponse>(
		apiUrl,
		authorization,
		`/chat/conversations/${encodeURIComponent(conversationId)}/messages?limit=30`,
	);
	return body.messages;
}

export async function saveMessage(
	apiUrl: string,
	authorization: string,
	conversationId: string,
	message: ChatMessage & { calorieEntryId?: string },
) {
	await goRequest(apiUrl, authorization, `/chat/conversations/${encodeURIComponent(conversationId)}/messages`, {
		method: "POST",
		body: JSON.stringify(message),
	});
}
