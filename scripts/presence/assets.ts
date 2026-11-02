import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * Fetches the Plugin's large data files that are not committed here (presence-assets/README.md), pinned by commit and
 * checksum. Sources, in order: AION_PLUGIN_DIR (a checkout of Aion-Presence-Plugin), the sibling ../Aion-Presence-Plugin,
 * then GitHub at the pinned commit. A file is written only when its SHA-256 matches.
 *
 *   npm run presence:assets            fetch what is missing or different
 *   npm run presence:assets -- --check report only (exit 1 when something is missing)
 */
export const SOURCE_COMMIT = "fb9b210d5d34a867d58931f284c30a3f84feecad";
const REPO_ROOT = resolve(import.meta.dirname, "..", "..");
const TARGET = join(REPO_ROOT, "presence-assets");

export const FILES = [
  { path: "packs/chinese-writing/strokes.ahpk", sha256: "00d5322d0bdcb65068bff8cd19f32504ac013e61c6383db2b746fb74e2e9fc15", why: "Chinese stroke data (handwriting)" },
  { path: "packs/chinese-writing/dictionary.ahpk", sha256: "976f0aaf684064ea2d9fbce6efedddd0849b93821d52e534eae6700b6d0b7cd2", why: "Chinese dictionary facts" },
  { path: "assets/cards/transformer.glb", sha256: "0a7fe99b1a52eeb85d1d4bd30031b8adbb002353b7153df5981dfe4c7b306472", why: "the CAD viewer's demonstration model" },
] as const;

const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

function local(path: string): Buffer | null {
  const roots = [process.env.AION_PLUGIN_DIR, join(REPO_ROOT, "..", "Aion-Presence-Plugin")].filter(Boolean) as string[];
  for (const root of roots) {
    const file = join(root, "plugins", "aion-presence", path);
    if (existsSync(file)) return readFileSync(file);
  }
  return null;
}

async function remote(path: string): Promise<Buffer> {
  const url = `https://raw.githubusercontent.com/FulongLi/Aion-Presence-Plugin/${SOURCE_COMMIT}/plugins/aion-presence/${path}`;
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  const check = process.argv.includes("--check");
  let missing = 0;
  for (const file of FILES) {
    const target = join(TARGET, file.path);
    if (existsSync(target) && sha256(readFileSync(target)) === file.sha256) { console.log(`  ok       ${file.path}`); continue; }
    if (check) { console.log(`  missing  ${file.path} (${file.why})`); missing++; continue; }
    let bytes = local(file.path);
    let from = "local Plugin checkout";
    if (!bytes || sha256(bytes) !== file.sha256) { bytes = await remote(file.path); from = `GitHub @ ${SOURCE_COMMIT.slice(0, 7)}`; }
    if (sha256(bytes) !== file.sha256) throw new Error(`checksum mismatch for ${file.path}: nothing written`);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(`${target}.part`, bytes);
    renameSync(`${target}.part`, target);
    console.log(`  fetched  ${file.path} (${(bytes.length / 1024).toFixed(0)} KB, ${from})`);
  }
  if (missing) { console.log(`${missing} file(s) missing: run npm run presence:assets. Aion works without them; the features above say they are unavailable.`); process.exit(1); }
}

await main();
