import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { buildCalorieGraph } from "./services/graph";
import { createConversation, loadMessages, saveMessage } from "./services/chat";
import { recordUsage } from "./services/usage";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.use(logger());

app.use("/api/v1/*", async (c, next) =>
	cors({
		origin: c.env.FRONTEND_URL,
		allowHeaders: ["Content-Type", "Authorization"],
		allowMethods: ["POST", "OPTIONS"],
		credentials: true,
		maxAge: 86_400,
	})(c, next),
);

app.get("/", (c) => c.text("Nitro calorie agent"));

app.get("/health", (c) =>
	c.json({ status: 200, server: "calories agent", date: new Date() }),
);

app.post("/api/v1/agent/chat", async (c) => {
	const authorization = c.req.header("Authorization") ?? "";
	if (!authorization.startsWith("Bearer ")) {
		return c.json({ error: "authentication required" }, 401);
	}

	const input = await c.req
		.json<{ message?: string; conversationId?: string }>()
		.catch(() => ({}) as { message?: string; conversationId?: string });
	const message = input.message?.trim();
	if (!message) {
		return c.json({ error: "message is required" }, 400);
	}

	// Authenticate user and get timezone
	const meResponse = await fetch(`${c.env.GO_API_URL}/auth/me`, {
		headers: { Authorization: authorization },
	});
	if (!meResponse.ok) {
		return c.json({ error: "invalid session" }, 401);
	}
	const { user } = await meResponse.json<{ user: { timezone: string } }>();

	try {
		// Persist the conversation and user message
		const conversationId =
			input.conversationId ??
			(await createConversation(c.env.GO_API_URL, authorization, message.slice(0, 120)));

		await saveMessage(c.env.GO_API_URL, authorization, conversationId, {
			role: "user",
			content: message,
		});

		const history = await loadMessages(c.env.GO_API_URL, authorization, conversationId);

		// Run the calorie graph
		const graph = buildCalorieGraph({
			openRouterApiKey: c.env.OPENROUTER_KEY,
			tavilyApiKey: c.env.TAVIY_KEY,
			apiUrl: c.env.GO_API_URL,
			authorization,
		});

		const result = await graph.invoke({
			message,
			history,
			now: new Date().toISOString(),
			timezone: user.timezone,
			extracted: null,
			searchResult: "",
			savedEntry: null,
			wasEstimated: false,
			reply: "",
			inputTokens: 0,
			outputTokens: 0,
		});

		// Record token usage in the background
		c.executionCtx.waitUntil(
			recordUsage(c.env.GO_API_URL, authorization, result.inputTokens, result.outputTokens),
		);

		// Persist the assistant reply
		const calorieEntryId =
			result.savedEntry && typeof result.savedEntry === "object" && "id" in result.savedEntry
				? String(result.savedEntry.id)
				: undefined;

		await saveMessage(c.env.GO_API_URL, authorization, conversationId, {
			role: "assistant",
			content: result.reply,
			calorieEntryId,
		});

		return c.json({
			conversationId,
			message: result.reply,
			...(result.savedEntry ? { entry: result.savedEntry } : {}),
		});
	} catch (error) {
		console.error(
			JSON.stringify({
				event: "agent_error",
				error: error instanceof Error ? error.message : "unknown",
				stack: error instanceof Error ? error.stack : undefined,
			}),
		);
		return c.json({ error: "could not process calorie entry" }, 502);
	}
});

export default app;
