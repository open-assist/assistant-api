import { z } from "$zod/mod.ts";
import { metadata, metaSchema } from "$/models/_schema.ts";
import { THREAD } from "$/models/thread.ts";

export const RUN = "thread.run";
export const RUN_PREFIX = "run";

export const errorType = z.object({
  code: z.enum(["server_error", "rate_limit_exceeded"]),
  message: z.string(),
}).optional();

/**
 * The request body, which creating a run.
 */
export const runSchema = z.object({
  assistant_id: z.string({
    description: "The ID of the assistant to use to execute this run.",
  }),
  model: z.string({
    description:
      "The ID of the Model to be used to execute this run. If a value is provided here, it will override the model associated with the assistant. If not, the model associated with the assistant will be used.",
  }).optional(),
  instructions: z.string({
    description:
      "Overrides the instructions of the assistant. This is useful for modifying the behavior on a per-run basis.",
  }).optional(),
  additional_instructions: z.string({
    description:
      "Appends additional instructions at the end of the instructions for the run. This is useful for modifying the behavior on a per-run basis without overriding other instructions.",
  }).optional(),
  metadata,
});

const runType = runSchema.omit({
  additional_instructions: true,
}).merge(
  z.object({
    object: z.enum([RUN]),
    thread_id: z.string({
      description: "The thread ID that this message belongs to.",
    }),
    status: z.enum([
      "queued",
      "in_progress",
      "requires_action",
      "cancelling",
      "cancelled",
      "failed",
      "completed",
      "expired",
    ], {
      description: "The status of the run.",
    }),
    last_error: errorType,
  }),
).merge(metaSchema.omit({
  updated_at: true,
}));

/**
 * Represents an execution run on a thread.
 */
export type Run = z.infer<typeof runType>;

export const genPrimaryKey = (
  threadId: string,
  id: string,
) => [THREAD, threadId, RUN, id];

export const genPrimaryIndexKey = (
  threadId: string,
) => [THREAD, threadId, RUN];
