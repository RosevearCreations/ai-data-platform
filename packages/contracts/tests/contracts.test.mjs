import assert from "node:assert/strict";
import test from "node:test";

import {
  PLATFORM_BUILD,
  PLATFORM_NAME,
  WORKSPACE_SLUGS
} from "../dist/index.js";

test("shared contracts expose the Build 001 platform baseline", () => {
  assert.equal(PLATFORM_NAME, "AI Data Platform");
  assert.equal(PLATFORM_BUILD, "001");
  assert.deepEqual(WORKSPACE_SLUGS, [
    "rosiedazzlers",
    "devilndove",
    "personal"
  ]);
});
