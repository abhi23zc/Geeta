import test from "node:test";
import assert from "node:assert/strict";
import {
  seedTasks,
  tasksForDate,
  toggleTaskCompletion,
  parseTasksData,
  validTaskInput,
} from "../src/state/tasks-model.ts";

test("starter intentions are incomplete and ordered by scheduled time", () => {
  const tasks = tasksForDate(seedTasks("2026-10-03"), "2026-10-03");
  assert.equal(tasks.length, 4);
  assert.ok(tasks.every((task) => !task.done));
  assert.deepEqual(
    tasks.map((task) => task.id),
    ["surya", "proposal", "read", "walk"],
  );
});

test("daily completion resets on the next local date and history survives", () => {
  const data = toggleTaskCompletion(
    seedTasks("2026-10-03"),
    "surya",
    "2026-10-03",
  );
  assert.equal(tasksForDate(data, "2026-10-03")[0].done, true);
  assert.equal(tasksForDate(data, "2026-10-04")[0].done, false);
  assert.equal(
    tasksForDate(parseTasksData(JSON.stringify(data)), "2026-10-03")[0].done,
    true,
  );
});

test("one-time intentions carry forward until completion and can be unchecked that day", () => {
  let data = seedTasks("2026-10-03");
  data.records[1].recurrence = "once";
  assert.ok(
    tasksForDate(data, "2026-10-05").some((task) => task.id === "proposal"),
  );
  data = toggleTaskCompletion(data, "proposal", "2026-10-05");
  assert.equal(
    tasksForDate(data, "2026-10-05").find((task) => task.id === "proposal")
      .done,
    true,
  );
  assert.ok(
    !tasksForDate(data, "2026-10-06").some((task) => task.id === "proposal"),
  );
  data = toggleTaskCompletion(data, "proposal", "2026-10-05");
  assert.ok(
    tasksForDate(data, "2026-10-06").some((task) => task.id === "proposal"),
  );
});

test("archiving preserves earlier completion but removes current and future occurrences", () => {
  const data = toggleTaskCompletion(
    seedTasks("2026-10-03"),
    "surya",
    "2026-10-03",
  );
  data.records[0].archivedDate = "2026-10-04";
  assert.equal(tasksForDate(data, "2026-10-03")[0].done, true);
  assert.ok(
    !tasksForDate(data, "2026-10-04").some((task) => task.id === "surya"),
  );
  assert.ok(
    !tasksForDate(data, "2026-10-05").some((task) => task.id === "surya"),
  );
});

test("rapid toggles retain final state and unknown IDs never create completion records", () => {
  let data = seedTasks("2026-10-03");
  for (let i = 0; i < 101; i++)
    data = toggleTaskCompletion(data, "read", "2026-10-03");
  assert.deepEqual(data.completions.read, ["2026-10-03"]);
  assert.equal(toggleTaskCompletion(data, "missing", "2026-10-03"), data);
});

test("invalid titles, times, categories, versions and dates are rejected", () => {
  assert.equal(
    validTaskInput({ title: " ", category: "Mind", recurrence: "once" }),
    false,
  );
  assert.equal(
    validTaskInput({
      title: "Read",
      category: "Mind",
      recurrence: "once",
      timeMinutes: 1440,
    }),
    false,
  );
  assert.equal(
    validTaskInput({ title: "Read", category: "Other", recurrence: "once" }),
    false,
  );
  for (const raw of [
    "{",
    "{}",
    '{"version":2}',
    JSON.stringify({
      ...seedTasks("2026-10-03"),
      completions: { surya: ["2026-02-30"] },
    }),
  ])
    assert.throws(() => parseTasksData(raw));
});

test("large lists keep scheduled intentions first and Anytime last", () => {
  const data = seedTasks("2026-10-03");
  for (let i = 0; i < 100; i++)
    data.records.push({
      id: `extra-${i}`,
      title: `Intention ${i}`,
      category: "Mind",
      recurrence: "once",
      startDate: "2026-10-03",
      createdAt: i + 10,
    });
  assert.equal(tasksForDate(data, "2026-10-03").length, 104);
  assert.equal(tasksForDate(data, "2026-10-03").at(-1).id, "extra-99");
  assert.equal(tasksForDate(data, "2026-10-02").length, 0);
});
