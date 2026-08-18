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
		.describe("True when the user reports eating, drinking, or consuming food/calories — including short confirmations like 'yes' that refer to previously mentioned food"),
	dish: z
		.string()
		.default("Quick calorie entry")
		.describe("ONLY the food or drink name with quantity, e.g. '2 plates of chicken shawarma'. Strip all filler words like 'hey', 'i just ate', 'today', etc."),
	calories: z
		.number()
		.positive()
		.nullable()
		.describe("The exact calorie number stated by the user, or null when not provided"),
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

// ── Build options ────────────────────────────────────────────────────────────

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

/** Broad check — intentionally loose to catch typos and casual phrasing. */
function looksLikeFoodReport(message: string): boolean {
	const lower = message.toLowerCase();
	// Direct consumption verbs (handles typos like "i just a ate")
	if (/\b(?:i|we)\b.*\b(?:ate|eat|had|consumed|drank|drinking|eating)\b/i.test(message)) return true;
	// Calorie / kcal mentions
	if (/\b\d+(?:\.\d+)?\s*(?:calories|kcal|cals)\b/i.test(message)) return true;
	// "plate of", "bowl of", "cup of", "glass of" + food
	if (/\b(?:plate|plates|bowl|bowls|cup|cups|glass|piece|pieces|serving|servings)\s+of\b/i.test(message)) return true;
	// Common food-related phrases
	if (/\b(?:just\s+)?(?:ate|had|eaten|finished)\b/i.test(message)) return true;
	return false;
}

/** Check if the message is a short confirmation referencing earlier food. */
function isConfirmation(message: string): boolean {
	return /^\s*(?:yes|yeah|yep|yea|sure|ok|okay|y|log\s+it|save\s+it|do\s+it|go\s+ahead)\s*[.!]?\s*$/i.test(message);
}

function textContent(message: AIMessage): string {
	if (typeof message.content === "string") return message.content;
	return message.content
		.map((part) => (typeof part === "string" ? part : "text" in part ? String(part.text) : ""))
		.join("");
}

function pickCaloriesFromSearch(searchResult: string): number {
	const values = [...searchResult.matchAll(/\b(\d+(?:\.\d+)?)\s*(?:calories|kcal|cals)\b/gi)]
		.map((m) => Number(m[1]))
		.filter((v) => v > 0 && v < 10_000);
	if (values.length === 0) throw new Error("Tavily returned no usable calorie estimate");
	return values[0];
}

/** Strip conversational filler from a raw message, keeping only the food name + quantity. */
function cleanDishName(raw: string): string {
	return raw
		.replace(/\b(?:hey|hi|hello|yo)\b[,.]?\s*/gi, "")
		.replace(/\b(?:i|we)\s+(?:\w+\s+)?(?:just\s+)?(?:ate|eat|had|consumed|drank|finished)\s*/gi, "")
		.replace(/\b(?:for|about|around)?\s*\d+(?:\.\d+)?\s*(?:calories|kcal|cals)\b/gi, "")
		.replace(/\b(?:today|now|just now|right now|for (?:lunch|dinner|breakfast|snack))\b/gi, "")
		.replace(/[.,!?]+$/g, "")
		.replace(/\s{2,}/g, " ")
		.trim() || "Quick calorie entry";
}

// ── Graph builder ────────────────────────────────────────────────────────────

export function buildCalorieGraph(options: BuildOptions) {
	const chatModel = model(options.openRouterApiKey);
	const searchTool = createCalorieSearchTool(options.tavilyApiKey);
	const saveTool = createSaveCaloriesTool(options.apiUrl, options.authorization);

	// ── Node: extract ────────────────────────────────────────────────────────
	const extract = async (state: typeof GraphState.State) => {
		const recentContext = state.history.slice(-12);
		const structured = chatModel.withStructuredOutput(extractionSchema, { includeRaw: true });

		const result = await structured.invoke([
			[
				"system",
				`Extract one calorie-consumption entry from the latest user message and recent conversation.
Current time: ${state.now}  |  User timezone: ${state.timezone}

Rules:
- If the latest message reports eating, drinking, consuming, or provides calories for previously mentioned food, set shouldRecord = true.
- Short confirmations like "yes", "sure", "ok" that follow a food mention or calorie estimate in conversation history count as shouldRecord = true. Resolve them to the most recently discussed food.
- The "dish" field must contain ONLY the food/drink name with quantity (e.g. "2 plates of chicken shawarma", "a bowl of rice", "3 samosas"). Strip all conversational filler like "hey", "i just ate", "today", "for lunch", etc.
- Preserve calories explicitly stated by the user. If the user did not state a calorie number, set calories = null — do NOT estimate.
- For "just ate", "today", or no stated time, use the current time.
- Greetings, questions unrelated to food, and small talk have shouldRecord = false.`,
			],
			["human", JSON.stringify({ recentContext, latestMessage: state.message })],
		]);

		let extracted = result.parsed;

		// Hard override: if the LLM missed an obvious food report or confirmation, force shouldRecord
		if (extracted && !extracted.shouldRecord) {
			if (looksLikeFoodReport(state.message)) {
				extracted = { ...extracted, shouldRecord: true };
			}
			if (isConfirmation(state.message) && recentContext.some((m) => looksLikeFoodReport(m.content))) {
				extracted = { ...extracted, shouldRecord: true };
			}
		}

		// If structured output completely failed, build a minimal extraction
		if (!extracted) {
			const calorieMatch = state.message.match(/\b(\d+(?:\.\d+)?)\s*(?:calories|kcal|cals)\b/i);
			extracted = {
				shouldRecord: looksLikeFoodReport(state.message) || isConfirmation(state.message),
				dish: cleanDishName(state.message),
				calories: calorieMatch ? Number(calorieMatch[1]) : null,
				fat: 0,
				ingredients: "",
				consumedAt: state.now,
			};
		}

		return { extracted, ...tokenUsage(result.raw as AIMessage) };
	};

	// ── Node: search ─────────────────────────────────────────────────────────
	const search = async (state: typeof GraphState.State) => ({
		searchResult: await searchTool.invoke({ food: state.extracted!.dish }),
	});

	// ── Node: estimate ───────────────────────────────────────────────────────
	const estimate = async (state: typeof GraphState.State) => {
		const structured = chatModel.withStructuredOutput(calorieEntrySchema, { includeRaw: true });

		const result = await structured.invoke([
			[
				"system",
				"Use the search evidence to estimate one reasonable calorie value. Return a single number — not a range. Keep the extracted dish name and consumption time.",
			],
			["human", JSON.stringify({ extracted: state.extracted, search: state.searchResult })],
		]);

		const estimated = result.parsed ?? calorieEntrySchema.parse({
			...state.extracted!,
			calories: pickCaloriesFromSearch(state.searchResult),
		});

		return {
			extracted: { ...state.extracted!, ...estimated },
			wasEstimated: true,
			...tokenUsage(result.raw as AIMessage),
		};
	};

	// ── Node: save ───────────────────────────────────────────────────────────
	const save = async (state: typeof GraphState.State) => {
		const entry: CalorieEntry = {
			dish: state.extracted!.dish,
			calories: state.extracted!.calories!,
			fat: state.extracted!.fat,
			ingredients: state.extracted!.ingredients,
			consumedAt: state.extracted!.consumedAt,
		};

		const saved = JSON.parse(await saveTool.invoke(entry));
		const approx = state.wasEstimated ? " approximately" : "";

		return {
			savedEntry: saved,
			reply: `Added${approx} ${entry.calories} calories for ${entry.dish}.`,
		};
	};

	// ── Node: converse ───────────────────────────────────────────────────────
	const converse = async (state: typeof GraphState.State) => {
		const history = state.history.map(
			(m) => [m.role === "tool" ? "assistant" : m.role, m.content] as ["user" | "assistant", string],
		);

		const result = await chatModel.invoke([
			[
				"system",
				`You are Nitro, a friendly and concise calorie-tracking assistant.
Rules:
- Respond briefly and naturally to greetings and general questions.
- NEVER claim that a calorie entry was saved, logged, or recorded. You do not have that ability in this mode.
- If the user mentions food, tell them you can track it and ask them to share what they ate.
- Do not use emojis.`,
			],
			...history,
		]);

		return { reply: textContent(result as AIMessage), ...tokenUsage(result as AIMessage) };
	};

	// ── Build graph ──────────────────────────────────────────────────────────
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
