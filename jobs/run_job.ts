import { getBySecondaryKey, kv } from "$/models/_db.ts";
import { StatusFields } from "$/models/_schema.ts";
import { genSecondaryKey as genRunKey, Run } from "$/models/run.ts";
import {
  Assistant,
  genSecondaryKey as genAssistantKey,
} from "$/models/assistant.ts";
import {
  genPrimaryKey as genMessageKey,
  getMessagesByThread,
  Message,
  MESSAGE_PREFIX,
} from "$/models/message.ts";
import {
  genPrimaryKey as genStepKey,
  listByRunId,
  Step,
  STEP_PREFIX,
} from "$/models/step.ts";
import { Google } from "$/helpers/google.ts";
import {
  DbCommitError,
  InternalServerError,
  TooManyRequests,
} from "$/models/errors.ts";

export interface RunJobMessage {
  action: "execute" | "cancel" | "expire";
  runId: string;
}

export function isRunJobMessage(message: unknown) {
  return (message as RunJobMessage).action !== undefined &&
    (message as RunJobMessage).runId !== undefined;
}

export class RunJob {
  /**
   * Perform the run job.
   *
   * @param message The rub job message.
   */
  public static async perform(message: RunJobMessage) {
    const { action, runId } = message;
    switch (action) {
      case "execute":
        await this.execute(runId);
        break;
      case "cancel":
        await this.cancel(runId);
        break;
      case "expire":
        await this.expire(runId);
        break;
    }
  }

  private static async execute(runId: string) {
    // judge run status
    const kvEntry = await getBySecondaryKey<Run>(runId, genRunKey);
    const run = kvEntry.value as Run;
    if (run.status !== "queued") {
      return;
    }

    // create step
    const step = {
      id: `${STEP_PREFIX}-${crypto.randomUUID()}`,
      created_at: Date.now(),
      assistant_id: run.assistant_id,
      thread_id: run.thread_id,
      run_id: run.id,
      type: "message_creation",
      status: "in_progress",
    } as Step;
    const stepKey = genStepKey(runId, step.id);

    // run status: queued -> in_progress
    const { ok } = await kv.atomic()
      .check(kvEntry)
      .check({ key: stepKey, versionstamp: null })
      .set(kvEntry.key, {
        ...run,
        status: "in_progress",
        started_at: Date.now(),
      } as Run)
      .set(stepKey, step)
      .commit();
    if (!ok) throw new DbCommitError();

    let reply;
    try {
      // request llm
      const assistant =
        (await getBySecondaryKey<Assistant>(run.assistant_id, genAssistantKey))
          .value as Assistant;
      const messages: Message[] = await getMessagesByThread(run.thread_id);

      reply = await Google.chat(
        run.model || assistant.model,
        messages,
        run.instructions || assistant.instructions,
      );
    } catch (error) {
      const statusFields = {
        status: "failed",
        failed_at: Date.now(),
      } as StatusFields;
      if (error instanceof TooManyRequests) {
        statusFields.last_error = {
          code: "rate_limit_exceeded",
          message: error.message,
        };
      }
      if (error instanceof InternalServerError) {
        statusFields.last_error = {
          code: "server_error",
          message: error.message,
        };
      }
      // status: in_progress -> failed
      await kv.atomic()
        .set(stepKey, { ...step, ...statusFields })
        .set(kvEntry.key, { ...run, ...statusFields })
        .commit();
      return;
    }

    // create message
    const message = {
      id: `${MESSAGE_PREFIX}-${crypto.randomUUID()}`,
      created_at: Date.now(),
      thread_id: run.thread_id,
      assistant_id: run.assistant_id,
      run_id: run.id,
      role: "assistant",
      content: [
        {
          type: "text",
          text: {
            value: reply,
          },
        },
      ],
    } as Message;
    const messageKey = genMessageKey(run.thread_id, message.id);

    // status: in_progress -> completed
    const statusFields = {
      status: "completed",
      completed_at: Date.now(),
    };
    await kv.atomic()
      .set(messageKey, message)
      .set(stepKey, {
        ...step,
        ...statusFields,
        step_details: {
          type: "message_creation",
          message_creation: {
            message_id: message.id,
          },
        },
      })
      .set(kvEntry.key, {
        ...run,
        ...statusFields,
      })
      .commit();
  }

  private static async cancel(runId: string) {
    const kvEntry = await getBySecondaryKey<Run>(runId, genRunKey);
    const run = kvEntry.value as Run;
    if (run.status === "cancelling") {
      const atomicOp = kv.atomic()
        .check(kvEntry)
        .set(
          kvEntry.key,
          { ...run, status: "cancelled", cancelled_at: Date.now() } as Run,
        );

      const now = Date.now();
      const stepEntrys = await listByRunId(run.id);
      for (const entry of stepEntrys) {
        if (entry.value.status === "in_progress") {
          atomicOp.set(entry.key, {
            ...entry.value,
            status: "cancelled",
            cancelled_at: now,
          } as Step);
        }
      }

      const { ok } = await atomicOp.commit();
      if (!ok) {
        console.log("[-] cancel run(%s) failed.", runId);
      }
    }
  }

  private static async expire(runId: string) {
    const kvEntry = await getBySecondaryKey<Run>(runId, genRunKey);
    const run = kvEntry.value as Run;
    if (run.status === "queued" || run.status === "in_progress") {
      const atomicOp = kv.atomic()
        .check(kvEntry)
        .set(kvEntry.key, {
          ...run,
          status: "expired",
        } as Run);

      const now = Date.now();
      const stepEntrys = await listByRunId(run.id);
      for (const entry of stepEntrys) {
        if (entry.value.status === "in_progress") {
          atomicOp.set(entry.key, {
            ...entry.value,
            status: "expired",
            expired_at: now,
          } as Step);
        }
      }

      const { ok } = await atomicOp.commit();
      if (!ok) {
        console.log("[-] expire run(%s) failed.", runId);
      }
    }
  }
}
