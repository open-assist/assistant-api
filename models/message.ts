import { z } from "$zod/mod.ts";
import { metadata, metaSchema } from "$/models/_schema.ts";
import { THREAD } from "$/models/thread.ts";
import { createObject, kv } from "$/models/_db.ts";

export const MESSAGE = "message";
export const MESSAGE_OBJECT = "thread.message";
export const MESSAGE_PREFIX = "msg";

/**
 * The request body, which creating a message.
 */
export const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string({
    description: "The content of the message in array of text and/or images.",
  }),
  file_ids: z.array(z.string(), {
    description:
      "A list of file IDs that the assistant should use. Useful for tools like retrieval and code_interpreter that can access files.",
  }).max(10).optional(),
  metadata,
});

const textContentType = z.object({
  type: z.enum(["text"]),
  text: z.object({
    value: z.string({ description: "The data that makes up the text." }),
  }),
});

const messageType = messageSchema.omit({
  content: true,
}).merge(
  z.object({
    content: z.array(textContentType),
    object: z.enum([MESSAGE_OBJECT]),
    thread_id: z.string({
      description: "The thread ID that this message belongs to.",
    }),
    assistant_id: z.string({
      description:
        "If applicable, the ID of the assistant that authored this message.",
    }).optional(),
    run_id: z.string({
      description:
        "If applicable, the ID of the run associated with the authoring of this message.",
    }).optional(),
  }),
).merge(metaSchema.omit({ updated_at: true }));

/**
 * Represents a message within a thread.
 */
export type Message = z.infer<typeof messageType>;

export const genPrimaryKey = (
  threadId: string,
  id: string,
) => [THREAD, threadId, MESSAGE, id];

export const genPrimaryIndexKey = (
  threadId: string,
) => [THREAD, threadId, MESSAGE];

export const genSecodndaryKey = (
  id: string,
) => [MESSAGE, id];

/**
 * Get the messages by thread id. If not exists, return empty array.
 *
 * @param threadId The thread which messages belongs to.
 * @returns The messages of thread
 */
export const getMessagesByThread = async (threadId: string) => {
  const indexKey = genPrimaryIndexKey(threadId);
  const iter = kv.list<Message>({ prefix: indexKey });
  const messages = [];
  for await (const result of iter) {
    messages.push(result.value);
  }
  return messages.sort((a, b) => a.created_at - b.created_at);
};

export const createMessage = async (fields: Partial<Message>) => {
  const newMessage = {
    ...fields,
    id: `${MESSAGE_PREFIX}-${crypto.randomUUID()}`,
    created_at: Date.now(),
  } as Message;

  await createObject(
    genPrimaryKey(newMessage.thread_id, newMessage.id),
    newMessage,
  );

  return newMessage;
};
