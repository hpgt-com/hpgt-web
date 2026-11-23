import { test } from "node:test";
import assert from "node:assert/strict";
import { readLimitedBody } from "../worker/body.js";

function chunked(parts) {
  const stream = new ReadableStream({
    start(controller) {
      for (const part of parts) controller.enqueue(new TextEncoder().encode(part));
      controller.close();
    },
  });
  return new Request("https://hpgt.com/api/radioid", { method: "POST", body: stream, duplex: "half" });
}

test("leser hele kroppen under grensen", async () => {
  const body = await readLimitedBody(chunked(["navn=", "Ola"]), 100);
  assert.equal(new TextDecoder().decode(body), "navn=Ola");
});

test("stopper ved grensen uten Content-Length", async () => {
  const req = chunked(["a".repeat(60), "b".repeat(60)]);
  assert.equal(req.headers.get("Content-Length"), null);
  assert.equal(await readLimitedBody(req, 100), null);
});

test("godtar kropp på nøyaktig grensen", async () => {
  const body = await readLimitedBody(chunked(["a".repeat(100)]), 100);
  assert.equal(body.byteLength, 100);
});

test("tom kropp", async () => {
  const body = await readLimitedBody(new Request("https://hpgt.com/api/radioid", { method: "POST" }), 100);
  assert.equal(body.byteLength, 0);
});
