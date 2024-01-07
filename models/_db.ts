import { DbCommitError, NotFoundError } from "$/models/errors.ts";
import { ListParams } from "$/models/list.ts";
import { Meta } from "$/models/_schema.ts";

export const kv = await Deno.openKv();

// Gracefully shutdown after tests
addEventListener("beforeunload", () => {
  kv.close();
});

/**
 * Set the value for the given key in the database.
 *
 * @param key The primary key which object uses.
 * @param value The details of object.
 * @param secondaryKey The secondary key if object has.
 * @returns The commit result of deno kv.
 */
export const createObject = async (
  key: string[],
  value: unknown,
  secondaryKey?: string[],
) => {
  let result = { ok: false };
  if (secondaryKey) {
    result = await kv.atomic().check({ key: key, versionstamp: null })
      .check({ key: secondaryKey, versionstamp: null })
      .set(key, value)
      .set(secondaryKey, key)
      .commit();
  } else {
    result = await kv.atomic().check({ key: key, versionstamp: null })
      .set(key, value)
      .commit();
  }
  if (!result.ok) throw new DbCommitError();

  return result;
};

/**
 * List all object by parameters.
 *
 * @param parentId The id of object's parent.
 * @param params The parameters for list objects api.
 * @param genPrimaryKey The function to generate primary key, when before or after is present.
 * @param genPrimaryIndexKey The function to generate primary index key.
 * @param fields Append fields to all objects.
 * @returns All objects.
 */
export const listObjects = async <T>(
  parentId: string,
  params: ListParams,
  genPrimaryKey: (parentId: string, id: string) => string[],
  genPrimaryIndexKey: (parentId: string) => string[],
  fields?: Partial<T>,
) => {
  const { after, before } = params;
  const selector = {
    prefix: !(before && after) && genPrimaryIndexKey(parentId),
    start: after && genPrimaryKey(parentId, after),
    end: before && genPrimaryKey(parentId, before),
  } as Deno.KvListSelector;
  const options = {
    limit: params.limit,
    reverse: params.order === "desc",
  } as Deno.KvListOptions;

  const iter = kv.list(selector, options);
  const objects = [];
  for await (const result of iter) {
    const run = result.value as Meta;
    run.versionstamp = result.versionstamp;
    objects.push(run);
  }
  if (params.order === "asc") {
    objects.sort((a, b) => a.created_at - b.created_at);
  } else {
    objects.sort((a, b) => b.created_at - a.created_at);
  }

  return objects.map((o) => ({ ...o, ...fields } as T));
};

export const getByPrimaryKey = async <T>(
  key: string[],
) => {
  const result = await kv.get<T>(key as Deno.KvKey);
  if (!result.value) throw new NotFoundError();

  return result;
};

export const getBySecondaryKey = async <T>(
  id: string,
  genSecondaryKey: (id: string) => string[],
) => {
  const primaryKey = await kv.get<Deno.KvKey>(genSecondaryKey(id));
  if (!primaryKey.value) throw new NotFoundError();

  const result = await kv.get<T>(primaryKey.value);
  if (!result.value) throw new NotFoundError();

  return result;
};

export const updateObject = async <T>(
  oldObject: Deno.KvEntryMaybe<T>,
  fields: object,
) => {
  const newObject = {
    ...oldObject.value,
    ...fields,
  } as T;
  const result = await kv.atomic().check(oldObject)
    .set(oldObject.key, newObject).commit();
  if (!result.ok) throw new DbCommitError();

  return newObject;
};

export const updateObjectByKey = async <T>(
  key: Deno.KvKey,
  fields: Partial<T>,
) => {
  const oldObject = await kv.get<T>(key);
  const newObject = {
    ...oldObject.value,
    ...fields,
  };
  const result = await kv.atomic().check(oldObject)
    .set(oldObject.key, newObject).commit();
  if (!result.ok) throw new DbCommitError();

  return newObject;
};

export const deleteObject = async <T>(oldObject: Deno.KvEntryMaybe<T>) => {
  const result = await kv.atomic().check(oldObject)
    .delete(oldObject.key).commit();
  if (!result.ok) throw new DbCommitError();

  return result;
};
