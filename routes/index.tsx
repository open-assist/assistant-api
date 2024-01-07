import { Handlers } from "$fresh/server.ts";
import manifest from "$/fresh.gen.ts";

export const handler: Handlers = {
  GET(_req, _ctx) {
    const routes = Object.keys(manifest.routes)
      .map((r) => r.replaceAll(/\.\/routes|\.ts|\/index/gm, ""))
      .filter((r) => !r.endsWith("_middleware") && r.startsWith("/v1")).reduce(
        (previous, current) => {
          const name = current.slice(1).replaceAll(/\[|\]/gm, "").split("/")
            .join("_");
          return {
            ...previous,
            [`${name}_url`]: current.replaceAll("[", "{").replaceAll("]", "}"),
          };
        },
        {},
      );
    return new Response(JSON.stringify(routes));
  },
};
