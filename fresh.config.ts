import { defineConfig } from "$fresh/server.ts";
import { kv } from "$/models/_db.ts";
import { isRunJobMessage, RunJob, RunJobMessage } from "$/jobs/run_job.ts";

kv.listenQueue(async (message: unknown) => {
  console.log("[+] job: ", message);

  if (isRunJobMessage(message)) {
    await RunJob.perform(message as RunJobMessage);
  }
});

export default defineConfig({});
