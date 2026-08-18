import { Context } from "hono";
import { z } from "zod";

export const EnvSchema = z.object({
  OPENROUTER_KEY: z.string(),
  TAVIY_KEY: z.string(),
  FRONTEND_URL: z.string(),
  GO_API_URL: z.string(),
});

// Infer the schema type for Hono bindings
export type AppEnv = {
  Bindings: z.infer<typeof EnvSchema>;
};

// On-demand parser function
export const getEnv = (c: Context<AppEnv>) => {
  return EnvSchema.parse(c.env);
};
