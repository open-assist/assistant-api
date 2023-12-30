import { z } from "$zod/mod.ts";
import { ORGANIZATION } from "$/models/organization.ts";

export const TOKEN = "token";
export const TOKEN_PREFIX = "tkn";
export const TOKEN_BY_CONTENT = "token_by_content";

export const tokenSchema = z.object({
  name: z.string(),
});

export const tokenType = tokenSchema.merge(z.object({
  id: z.string(),
  content: z.string(),
  created_at: z.number(),
  updated_at: z.number(),
}));

export type Token = z.infer<typeof tokenType>;

export const maskToken = (token: string) =>
  `${token.slice(0, 8)}***${token.slice(-4)}`;

export const genPrimaryKey = (
  orgId: string,
  id: string,
) => [ORGANIZATION, orgId, TOKEN, id];

export const genPrimaryIndexKey = (
  orgId: string,
) => [ORGANIZATION, orgId, TOKEN];

export const genSecondaryKey = (
  orgId: string,
  token: string,
) => [ORGANIZATION, orgId, TOKEN_BY_CONTENT, token];

export const genOrgByTokenKey = (
  token: string,
) => [TOKEN, token, ORGANIZATION];
