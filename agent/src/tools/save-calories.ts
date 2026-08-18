import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const calorieEntrySchema = z.object({
	dish: z.string().min(1),
	calories: z.number().positive(),
	fat: z.number().nonnegative().default(0),
	ingredients: z.string().default(""),
	consumedAt: z.string().datetime({ offset: true }),
});

export type CalorieEntry = z.infer<typeof calorieEntrySchema>;

export function createSaveCaloriesTool(apiUrl: string, authorization: string) {
	return tool(
		async (entry) => {
			const response = await fetch(`${apiUrl}/agent/calories`, {
				method: "POST",
				headers: {
					Authorization: authorization,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(entry),
			});

			const body = await response.json<{ entry?: unknown; error?: string }>();
			if (!response.ok) {
				const detail = body.error ?? `Go API returned ${response.status}`;
				console.error(JSON.stringify({ event: "save_failed", status: response.status, detail }));
				throw new Error(detail);
			}

			return JSON.stringify(body.entry);
		},
		{
			name: "save_calorie_entry",
			description: "Save a calorie entry through the Go API.",
			schema: calorieEntrySchema,
		},
	);
}
