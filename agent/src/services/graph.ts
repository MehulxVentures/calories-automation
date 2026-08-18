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
	now: Annotation<string>(),
	timezone: Annotation<string>(),
	extracted: Annotation<Extracted | null>(),
	searchResult: Annotation<string>(),
	savedEntry: Annotation<unknown>(),
	inputTokens: Annotation<number>({ reducer: (a, b) => a + b, default: () => 0 }),
	outputTokens: Annotation<number>({ reducer: (a, b) => a + b, default: () => 0 }),
});

type BuildOptions = {
	openRouterApiKey: string;
	tavilyApiKey: string;
	apiUrl: string;
	authorization: string;
};

function tokenUsage(raw: AIMessage) {
	return {
		inputTokens: raw.usage_metadata?.input_tokens ?? 0,
		outputTokens: raw.usage_metadata?.output_tokens ?? 0,
	};
}

export function buildCalorieGraph(options: BuildOptions) {
	const chatModel = model(options.openRouterApiKey);
	const searchTool = createCalorieSearchTool(options.tavilyApiKey);
	const saveTool = createSaveCaloriesTool(options.apiUrl, options.authorization);

	const extract = async (state: typeof GraphState.State) => {
		const structured = chatModel.withStructuredOutput(extractionSchema, { includeRaw: true });
		const result = await structured.invoke([
			["system", `Extract one calorie-consumption entry. Current time is ${state.now}; user timezone is ${state.timezone}. Preserve calories explicitly stated by the user. Never estimate missing calories here.`],
			["human", state.message],
		]);
		return { extracted: result.parsed, ...tokenUsage(result.raw as AIMessage) };
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
		return { extracted: { ...state.extracted!, ...result.parsed }, ...tokenUsage(result.raw as AIMessage) };
	};

	const save = async (state: typeof GraphState.State) => {
		const item = state.extracted as CalorieEntry;
		return { savedEntry: JSON.parse(await saveTool.invoke(item)) };
	};

	return new StateGraph(GraphState)
		.addNode("extract", extract)
		.addNode("search", search)
		.addNode("estimate", estimate)
		.addNode("save", save)
		.addEdge(START, "extract")
		.addConditionalEdges("extract", (state) => {
			if (!state.extracted?.shouldRecord) return END;
			return state.extracted.calories == null ? "search" : "save";
		})
		.addEdge("search", "estimate")
		.addEdge("estimate", "save")
		.addEdge("save", END)
		.compile();
}
