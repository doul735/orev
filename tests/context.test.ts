import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildContextManifest } from "../src/context.js";

const fixtureRoot = path.resolve("tests", "fixtures");
let tempRoot = "";

beforeEach(async () => {
  await mkdir(fixtureRoot, { recursive: true });
  tempRoot = await mkdtemp(path.join(fixtureRoot, ".tmp-context-"));
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe("buildContextManifest", () => {
  it("includes deterministic root context and changed text files", async () => {
    await writeFile(path.join(tempRoot, "README.md"), "# Fixture\n");
    await writeFile(path.join(tempRoot, "package.json"), "{}\n");
    await writeFile(path.join(tempRoot, "src.ts"), "export const ok = true;\n");

    const manifest = await buildContextManifest({
      root: tempRoot,
      changedFiles: ["src.ts"],
      maxFiles: 10,
      maxBytes: 10000,
      includeTests: false
    });

    expect(manifest.entries.map((entry) => entry.path)).toEqual(["package.json", "README.md", "src.ts"]);
    expect(manifest.skipped).toEqual([]);
  });

  it("skips tests, ignored directories, binaries, and max-file overflow", async () => {
    await mkdir(path.join(tempRoot, "tests"));
    await mkdir(path.join(tempRoot, "node_modules"));
    await mkdir(path.join(tempRoot, ".orev"));
    await writeFile(path.join(tempRoot, "README.md"), "# Fixture\n");
    await writeFile(path.join(tempRoot, "tests", "thing.test.ts"), "test('x', () => undefined);\n");
    await writeFile(path.join(tempRoot, "node_modules", "dep.js"), "module.exports = {};\n");
    await writeFile(path.join(tempRoot, ".orev", "privacy-report.md"), "generated report\n");
    await writeFile(path.join(tempRoot, "image.png"), Buffer.from([0, 1, 2, 3]));
    await writeFile(path.join(tempRoot, "extra.ts"), "export {};\n");

    const manifest = await buildContextManifest({
      root: tempRoot,
      changedFiles: ["tests/thing.test.ts", "node_modules/dep.js", ".orev/privacy-report.md", "image.png", "extra.ts"],
      maxFiles: 1,
      maxBytes: 10000,
      includeTests: false
    });

    expect(manifest.entries.map((entry) => entry.path)).toEqual(["README.md"]);
    expect(manifest.skipped.map((entry) => entry.reason)).toContain("test file skipped; pass --include-tests to include");
    expect(manifest.skipped.map((entry) => entry.reason)).toContain("ignored directory: node_modules");
    expect(manifest.skipped.map((entry) => entry.reason)).toContain("ignored directory: .orev");
    expect(manifest.skipped.map((entry) => entry.reason)).toContain("binary file skipped");
    expect(manifest.skipped.map((entry) => entry.reason)).toContain("max files reached (1)");
  });

  it("skips symlinked context files", async () => {
    const outside = path.join(tempRoot, "outside.txt");
    await writeFile(outside, "secret outside root\n");
    await symlink(outside, path.join(tempRoot, "README.md"));

    const manifest = await buildContextManifest({
      root: tempRoot,
      changedFiles: [],
      maxFiles: 10,
      maxBytes: 10000,
      includeTests: false
    });

    expect(manifest.entries).toEqual([]);
    expect(manifest.skipped).toEqual([{ path: "README.md", reason: "symlink skipped" }]);
  });
});
