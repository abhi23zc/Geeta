import test from "node:test";
import assert from "node:assert/strict";
import { createSnapshotWriter } from "../src/state/snapshot-writer.ts";

test("pending writes coalesce to the latest snapshot", async () => {
  const saves = [];
  const writer = createSnapshotWriter(
    async (value) => {
      saves.push(value);
    },
    () => {},
  );
  writer.enqueue(1);
  writer.enqueue(2);
  writer.enqueue(3);
  await writer.flush();
  assert.deepEqual(saves, [3]);
});

test("writes remain ordered when new updates arrive during an in-flight save", async () => {
  const saves = [];
  let resolve;
  const first = new Promise((done) => {
    resolve = done;
  });
  const writer = createSnapshotWriter(
    async (value) => {
      if (value === 1) await first;
      saves.push(value);
    },
    () => {},
  );
  writer.enqueue(1);
  const drain = writer.flush();
  writer.enqueue(2);
  writer.enqueue(3);
  resolve();
  await drain;
  await writer.flush();
  assert.deepEqual(saves, [1, 3]);
});

test("failed storage keeps newest pending changes for retry", async () => {
  let reject;
  const first = new Promise((_, fail) => {
    reject = fail;
  });
  const saves = [];
  const statuses = [];
  let attempts = 0;
  const writer = createSnapshotWriter(
    async (value) => {
      if (++attempts === 1) await first;
      saves.push(value);
    },
    (failed) => statuses.push(failed),
  );
  writer.enqueue(1);
  const drain = writer.flush();
  writer.enqueue(2);
  reject(new Error("disk unavailable"));
  await drain;
  assert.deepEqual(statuses, [true]);
  await writer.flush();
  assert.deepEqual(saves, [2]);
  assert.deepEqual(statuses, [true, false]);
});
