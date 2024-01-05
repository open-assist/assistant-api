import { defineConfig } from "$fresh/server.ts";
import { kv } from "$/models/_db.ts";
import { RunJob, RunJobMessage } from "$/jobs/run_job.ts";

kv.listenQueue(async (message: unknown) => {
  console.log("[+] job: ", message);
  await RunJob.perform((message as RunJobMessage).runId);
});

export default defineConfig({});
