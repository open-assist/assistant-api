import { z } from "$zod/mod.ts";

export const MODEL_OBJECT = "model";

const modelType = z.object({
  id: z.string(),
  created: z.number().optional(),
  object: z.enum([MODEL_OBJECT]),
  owned_by: z.string(),
});

export type Model = z.infer<typeof modelType>;
