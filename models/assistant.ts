import { z } from "$zod/mod.ts";
import { ORGANIZATION } from "$/models/organization.ts";
import { metadata, metaSchema } from "$/models/_schema.ts";

export const ASSISTANT = "assistant";
export const ASSISTANT_OBJECT = "assistant";
export const ASSISTANT_PREFIX = "asst";

/**
 * The request body, which creating assistant.
 */
export const assistantSchema = z.object({
  model: z.string({ description: "ID of the model to use. " }),
  name: z.string({ description: "The name of the assistant." }).trim().min(1)
    .max(256).optional(),
  description: z.string({ description: "The description of the assistant." })
    .max(512).optional(),
  instructions: z.string({
    description: "The system instructions that the assistant uses.",
  }).max(32768).optional(),
  tools: z.array(z.string()).optional(),
  file_ids: z.array(z.string()).max(20).optional(),
  metadata,
});

const assistantType = assistantSchema.merge(z.object({
  object: z.enum([ASSISTANT]),
})).merge(metaSchema);

export type Assistant = z.infer<typeof assistantType>;

export const genPrimaryKey = (
  orgId: string,
  id: string,
) => [ORGANIZATION, orgId, ASSISTANT, id];

export const genPrimaryIndexKey = (
  orgId: string,
) => [ORGANIZATION, orgId, ASSISTANT];

export const genSecondaryKey = (
  id: string,
) => [ASSISTANT, id];
