import { AIMessage } from "@langchain/core/messages";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import { model } from "../config/openrouter";
import { createCalorieSearchTool } from "../tools/calorie-search";
import { type CalorieEntry, calorieEntrySchema, createSaveCaloriesTool } from "../tools/save-calories";

// ── Schemas ──────────────────────────────────────────────────────────────────

const extractionSchema = z.object({
	shouldRecord: z
		.boolean()
		.describe("true = user reports food/drink consumption or confirms a prior food mention; false = greeting or unrelated message"),
	dish: z
		.string()
		.default("Quick calorie entry")
		.describe("Food name and quantity only. Example: '2 plates of chicken shawarma'. Never include words like 'i ate' or 'hey'."),
	calories: z
		.number()
		.positive()
		.nullable()
		.describe("Exact number the user stated, or null if not stated"),
	fat: z.number().nonnegative().default(0),
	ingredients: z.string().default(""),
	consumedAt: z.string().datetime({ offset: true }),
});

type Extracted = z.infer<typeof extractionSchema>;

// ── Graph state ──────────────────────────────────────────────────────────────

const GraphState = Annotation.Root({
	message: Annotation<string>(),
	history: Annotation<Array<{ role: "user" | "assistant" | "tool"; content: string }>>(),
	now: Annotation<string>(),
	timezone: Annotation<string>(),
	extracted: Annotation<Extracted | null>(),
	searchResult: Annotation<string>(),
	savedEntry: Annotation<unknown>(),
	wasEstimated: Annotation<boolean>(),
	reply: Annotation<string>(),
	inputTokens: Annotation<number>({ reducer: (a, b) => a + b, default: () => 0 }),
	outputTokens: Annotation<number>({ reducer: (a, b) => a + b, default: () => 0 }),
});

type BuildOptions = {
	openRouterApiKey: string;
	tavilyApiKey: string;
	apiUrl: string;
	authorization: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function tokenUsage(raw?: AIMessage) {
	return {
		inputTokens: raw?.usage_metadata?.input_tokens ?? 0,
		outputTokens: raw?.usage_metadata?.output_tokens ?? 0,
	};
}

function textContent(msg: AIMessage): string {
	if (typeof msg.content === "string") return msg.content;
	return msg.content
		.map((p) => (typeof p === "string" ? p : "text" in p ? String(p.text) : ""))
		.join("");
}

/**
 * Defensive check on converse output.
 * If the model hallucinates a save confirmation, we replace it
 * because converse never actually saves anything.
 */
function sanitizeConverseReply(reply: string): string {
	const bad = /\b(?:logged|saved|recorded|added|tracked)\b.*\b(?:calorie|kcal|entry|food)\b/i;
	if (bad.test(reply)) {
		return "Hey! What did you eat? I can track it for you.";
	}
	return reply;
}

// ── Extraction prompt ────────────────────────────────────────────────────────

function extractionPrompt(now: string, timezone: string): string {
	return `You are a structured-data extractor for a calorie tracker. Parse the user's latest message and recent conversation into a single JSON entry.

CURRENT TIME: ${now}
USER TIMEZONE: ${timezone}

FIELD RULES:

shouldRecord (boolean)
  true  → the message describes food/drink consumption, states calories, OR is a confirmation ("yes", "ok", "sure", "yep") referring to food mentioned earlier in the conversation.
  false → the message is a greeting, off-topic question, or unrelated small talk with NO food context in recent history.
  When in doubt, prefer true.

dish (string)
  The food or drink name with quantity. Strip everything else.
  INPUT: "hey i just a ate 2 plate of chicken swarma"  →  OUTPUT: "2 plates of chicken shawarma"
  INPUT: "had a big mac and fries for lunch today"      →  OUTPUT: "big mac and fries"
  INPUT: "200 calories of almonds"                      →  OUTPUT: "almonds"
  INPUT: "i ate rice"                                   →  OUTPUT: "rice"
  INPUT: (previous msg mentioned biryani, user says "yes") → OUTPUT: "biryani"

calories (number | null)
  The EXACT number the user wrote (e.g. "800 calories" → 800).
  null if the user did NOT write a number. Never estimate.

fat (number) — 0 if unknown.
ingredients (string) — "" if unknown.
consumedAt (ISO 8601) — current time unless the user specified a different time.`;
}

// ── Graph builder ────────────────────────────────────────────────────────────

export function buildCalorieGraph(options: BuildOptions) {
	const chatModel = model(options.openRouterApiKey);
	const searchTool = createCalorieSearchTool(options.tavilyApiKey);
	const saveTool = createSaveCaloriesTool(options.apiUrl, options.authorization);

	// ── extract ──────────────────────────────────────────────────────────────
	const extract = async (state: typeof GraphState.State) => {
		const recentContext = state.history.slice(-12);
		const structured = chatModel.withStructuredOutput(extractionSchema, { includeRaw: true });

		const result = await structured.invoke([
			["system", extractionPrompt(state.now, state.timezone)],
			["human", JSON.stringify({ recentContext, latestMessage: state.message })],
		]);

		if (!result.parsed) {
			console.error(JSON.stringify({ event: "extraction_failed", message: state.message }));
			return {
				extracted: {
					shouldRecord: false,
					dish: "Quick calorie entry",
					calories: null,
					fat: 0,
					ingredients: "",
					consumedAt: state.now,
				} satisfies Extracted,
				...tokenUsage(result.raw as AIMessage),
			};
		}

		return { extracted: result.parsed, ...tokenUsage(result.raw as AIMessage) };
	};

	// ── search ───────────────────────────────────────────────────────────────
	const search = async (state: typeof GraphState.State) => ({
		searchResult: await searchTool.invoke({ food: state.extracted!.dish }),
	});

	// ── estimate ─────────────────────────────────────────────────────────────
	const estimate = async (state: typeof GraphState.State) => {
		const structured = chatModel.withStructuredOutput(calorieEntrySchema, { includeRaw: true });

		const result = await structured.invoke([
			[
				"system",
				"You are a calorie estimator. Given the food and search evidence, return a single reasonable calorie number. Do not return a range. Keep the dish name and consumedAt exactly as given.",
			],
			["human", JSON.stringify({ food: state.extracted, evidence: state.searchResult })],
		]);

		if (!result.parsed) {
			const m = state.searchResult.match(/\b(\d+(?:\.\d+)?)\s*(?:calories|kcal)\b/i);
			return {
				extracted: { ...state.extracted!, calories: m ? Number(m[1]) : 200 },
				wasEstimated: true,
				...tokenUsage(result.raw as AIMessage),
			};
		}

		return {
			extracted: { ...state.extracted!, ...result.parsed },
			wasEstimated: true,
			...tokenUsage(result.raw as AIMessage),
		};
	};

	// ── save ─────────────────────────────────────────────────────────────────
	const save = async (state: typeof GraphState.State) => {
		const entry: CalorieEntry = {
			dish: state.extracted!.dish,
			calories: state.extracted!.calories!,
			fat: state.extracted!.fat,
			ingredients: state.extracted!.ingredients,
			consumedAt: state.extracted!.consumedAt,
		};

		const saved = JSON.parse(await saveTool.invoke(entry));
		const prefix = state.wasEstimated ? "Added approximately" : "Added";
		return { savedEntry: saved, reply: `${prefix} ${entry.calories} calories for ${entry.dish}.` };
	};

	// ── converse (no save capability — purely chat) ──────────────────────────
	const converse = async (state: typeof GraphState.State) => {
		const history = state.history.map(
			(m) => [m.role === "tool" ? "assistant" : m.role, m.content] as ["user" | "assistant", string],
		);

		const result = await chatModel.invoke([
			[
				"system",
				"You are Uli, a calorie-tracking chatbot. In this turn you are ONLY making small talk. You have NOT saved any food entry. You CANNOT save entries. Never say you logged, saved, added, recorded, or tracked anything. Keep responses to one or two short sentences. No emojis.",
			],
			...history,
		]);

		const raw = textContent(result as AIMessage);
		return { reply: sanitizeConverseReply(raw), ...tokenUsage(result as AIMessage) };
	};

	// ── graph ────────────────────────────────────────────────────────────────
	return new StateGraph(GraphState)
		.addNode("extract", extract)
		.addNode("search", search)
		.addNode("estimate", estimate)
		.addNode("save", save)
		.addNode("converse", converse)
		.addEdge(START, "extract")
		.addConditionalEdges("extract", (state) => {
			if (!state.extracted?.shouldRecord) return "converse";
			return state.extracted.calories == null ? "search" : "save";
		})
		.addEdge("search", "estimate")
		.addEdge("estimate", "save")
		.addEdge("save", END)
		.addEdge("converse", END)
		.compile();
}
