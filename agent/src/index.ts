import { Hono } from 'hono'
import { buildCalorieGraph } from './services/graph'
import { logger } from 'hono/logger'
import { recordUsage } from './services/usage'
import { cors } from 'hono/cors'

const app = new Hono<{ Bindings: CloudflareBindings }>()

// match any method, all routes
app.use(logger())

// Browser access for the versioned API.
app.use('/api/v1/*', async (c, next) => {
	return cors({
		origin: c.env.FRONTEND_URL,
		allowHeaders: ["Content-Type", "Authorization"],
		allowMethods: ["POST", "OPTIONS"],
		credentials: true,
		maxAge: 86400,
	})(c, next)
})

app.get('/', (c) => {
  return c.text('Hello Hono!')
});

app.get('/health', (c) => {
  return c.json({
    status: 200,
    server: "calories agent",
    date: new Date()
  })
});

app.post("/api/v1/agent/chat", async (c) => {
	const authorization = c.req.header("Authorization") ?? ""
	if (!authorization.startsWith("Bearer ")) {
		return c.json({ error: "authentication required" }, 401)
	}

	const input = await c.req.json<{ message?: string }>().catch((): { message?: string } => ({}))
	const message = input.message?.trim()
	if (!message) {
		return c.json({ error: "message is required" }, 400)
	}

	const meResponse = await fetch(`${c.env.GO_API_URL}/auth/me`, {
		headers: { Authorization: authorization },
	})
	if (!meResponse.ok) {
		return c.json({ error: "invalid session" }, 401)
	}
	const { user } = await meResponse.json<{ user: { timezone: string } }>()

	try {
		const graph = buildCalorieGraph({
			openRouterApiKey: c.env.OPENROUTER_KEY,
			tavilyApiKey: c.env.TAVIY_KEY,
			apiUrl: c.env.GO_API_URL,
			authorization,
		})
		const result = await graph.invoke({
			message,
			now: new Date().toISOString(),
			timezone: user.timezone,
			extracted: null,
			searchResult: "",
			savedEntry: null,
			inputTokens: 0,
			outputTokens: 0,
		})
		c.executionCtx.waitUntil(recordUsage(
			c.env.GO_API_URL,
			authorization,
			result.inputTokens,
			result.outputTokens,
		))

		if (!result.savedEntry) {
			return c.json({ message: "Tell me what you consumed and I will record it." })
		}

		return c.json({ message: "Calorie entry added.", entry: result.savedEntry })
	} catch (error) {
		console.error(JSON.stringify({ event: "agent_error", error: error instanceof Error ? error.message : "unknown" }))
		return c.json({ error: "could not process calorie entry" }, 502)
	}
});

export default app
