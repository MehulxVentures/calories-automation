import { AIMessage } from "@langchain/core/messages";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import { model } from "../config/openrouter";
import { createCalorieSearchTool } from "../tools/calorie-search";
import { CalorieEntry, calorieEntrySchema, createSaveCaloriesTool } from "../tools/save-calories";

const extractionSchema = z.object({
	shouldRecord: z.boolean().describe("True only when the user says they consumed food or calories"),
	dish: z.string().default("Quick calorie entry"),
	calories: z.number().positive().nullable().describe("Null when the user did not state calories"),
	fat: z.number().nonnegative().default(0),
	ingredients: z.string().default(""),
	consumedAt: z.string().datetime({ offset: true }),
});

type Extracted = z.infer<typeof extractionSchema>;

const GraphState = Annotation.Root({
	message: Annotation<string>(),
	history: Annotation<Array<{ role: "user" | "assistant" | "tool"; content: string }>>(),
	now: Annotation<string>(),
	timezone: Annotation<string>(),
	extracted: Annotation<Extracted | null>(),
	searchResult: Annotation<string>(),
	savedEntry: Annotation<unknown>(),
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

function tokenUsage(raw?: AIMessage) {
	return {
		inputTokens: raw?.usage_metadata?.input_tokens ?? 0,
		outputTokens: raw?.usage_metadata?.output_tokens ?? 0,
	};
}

function clearlyReportsConsumption(message: string) {
	return /\b(?:i|we)\s+(?:just\s+)?(?:ate|had|consumed|drank)\b/i.test(message)
		|| /\b\d+(?:\.\d+)?\s*(?:calories|kcal)\b/i.test(message);
}

function textContent(message: AIMessage) {
	return typeof message.content === "string"
		? message.content
		: message.content.map((part) => typeof part === "string" ? part : "text" in part ? String(part.text) : "").join("");
}

function fallbackExtraction(state: typeof GraphState.State): Extracted {
	const calorieMatch = state.message.match(/\b(\d+(?:\.\d+)?)\s*(?:calories|kcal)\b/i);
	const previousFood = [...state.history]
		.reverse()
		.find((item) => item.role === "user" && item.content !== state.message && clearlyReportsConsumption(item.content));
	const cleanDish = (value: string) => value
		.replace(/\b(?:i|we)\s+(?:just\s+)?(?:ate|had|consumed|drank)\b/gi, "")
		.replace(/\b(?:for|about)?\s*\d+(?:\.\d+)?\s*(?:calories|kcal)\b/gi, "")
		.replace(/\b(?:today|now)\b/gi, "")
		.trim();
	const dish = cleanDish(state.message) || (previousFood ? cleanDish(previousFood.content) : "") || "Quick calorie entry";
	return {
		shouldRecord: clearlyReportsConsumption(state.message),
		dish,
		calories: calorieMatch ? Number(calorieMatch[1]) : null,
		fat: 0,
		ingredients: "",
		consumedAt: state.now,
	};
}

function caloriesFromSearch(searchResult: string) {
	const values = [...searchResult.matchAll(/\b(\d+(?:\.\d+)?)\s*(?:calories|kcal)\b/gi)]
		.map((match) => Number(match[1]))
		.filter((value) => value > 0 && value < 10000);
	if (values.length === 0) throw new Error("Tavily returned no usable calorie estimate");
	return values[0];
}

export function buildCalorieGraph(options: BuildOptions) {
	const chatModel = model(options.openRouterApiKey);
	const searchTool = createCalorieSearchTool(options.tavilyApiKey);
	const saveTool = createSaveCaloriesTool(options.apiUrl, options.authorization);

	const extract = async (state: typeof GraphState.State) => {
		const structured = chatModel.withStructuredOutput(extractionSchema, { includeRaw: true });
		const recentContext = state.history.slice(-12);
		const result = await structured.invoke([
			["system", `Extract one calorie-consumption entry from the latest user message and recent conversation. Current time is ${state.now}; user timezone is ${state.timezone}.
Rules:
- If the latest message reports eating, drinking, consuming, or gives calories for previously mentioned food, shouldRecord must be true.
- Resolve short follow-ups such as "100 calories" to the most recently mentioned food.
- Preserve calories explicitly stated by the user.
- If food is reported without calories, return calories as null; do not ask questions and do not estimate here.
- For "just ate", "today", or no stated time, use the current time.
- Greetings and unrelated questions have shouldRecord false.`],
			["human", JSON.stringify({ recentContext, latestMessage: state.message })],
		]);
		const extracted = result.parsed ?? fallbackExtraction(state);
		return {
			extracted: {
				...extracted,
				shouldRecord: extracted.shouldRecord || clearlyReportsConsumption(state.message),
			},
			...tokenUsage(result.raw as AIMessage),
		};
	};

	const search = async (state: typeof GraphState.State) => ({
		searchResult: await searchTool.invoke({ food: state.extracted!.dish }),
	});

	const estimate = async (state: typeof GraphState.State) => {
		const structured = chatModel.withStructuredOutput(calorieEntrySchema, { includeRaw: true });
		const result = await structured.invoke([
			["system", "Use the search evidence to estimate one reasonable calorie entry. Keep the extracted consumption time and food details."],
			["human", JSON.stringify({ extracted: state.extracted, search: state.searchResult })],
		]);
		const estimated = result.parsed ?? calorieEntrySchema.parse({
			...state.extracted!,
			calories: caloriesFromSearch(state.searchResult),
		});
		return { extracted: { ...state.extracted!, ...estimated }, ...tokenUsage(result.raw as AIMessage) };
	};

	const save = async (state: typeof GraphState.State) => {
		const item = state.extracted as CalorieEntry;
		return {
			savedEntry: JSON.parse(await saveTool.invoke(item)),
			reply: `Added ${item.calories} calories for ${item.dish}.`,
		};
	};

	const converse = async (state: typeof GraphState.State) => {
		const history = state.history.map((item) => [item.role === "tool" ? "assistant" : item.role, item.content] as ["user" | "assistant", string]);
		const result = await chatModel.invoke([
			["system", "You are a friendly, concise calorie-tracking assistant. Chat naturally. Do not claim an entry was saved unless the calorie workflow saved it."],
			...history,
		]);
		const reply = textContent(result as AIMessage);
		return { reply, ...tokenUsage(result as AIMessage) };
	};

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
