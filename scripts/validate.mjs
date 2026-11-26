import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "yaml";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillsDir = join(root, "skills");
const errors = [];
const fail = (where, message) => errors.push(`${where}: ${message}`);
const rel = (path) => relative(root, path).split(sep).join("/");

const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const MAX_BODY_LINES = 500;

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(rel(path), `invalid JSON (${error.message})`);
    return null;
  }
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

function checkSkill(skillPath, seenNames) {
  const file = join(skillPath, "SKILL.md");
  const where = rel(file);
  const text = readFileSync(file, "utf8");
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return fail(where, "no YAML frontmatter block");

  const doc = parseDocument(match[1], { strict: true, uniqueKeys: true });
  if (doc.errors.length) return fail(where, doc.errors[0].message.split("\n")[0]);
  const data = doc.toJS() ?? {};
  const folder = skillPath.split(sep).pop();

  if (typeof data.name !== "string" || !NAME.test(data.name) || data.name.length > 64) {
    fail(where, "`name` must be 1-64 lowercase letters, digits and single hyphens");
  } else if (data.name !== folder) {
    fail(where, `\`name\` "${data.name}" must match its folder "${folder}"`);
  } else if (seenNames.has(data.name)) {
    fail(where, `\`name\` "${data.name}" is already used by ${seenNames.get(data.name)}`);
  } else {
    seenNames.set(data.name, where);
  }

  if (typeof data.description !== "string" || !data.description.trim()) fail(where, "missing `description`");
  else if (data.description.length > 1024) fail(where, "`description` is over 1024 characters");

  if (data.compatibility !== undefined && (typeof data.compatibility !== "string" || data.compatibility.length > 500)) {
    fail(where, "`compatibility` must be a string of at most 500 characters");
  }
  if (data.metadata !== undefined) {
    const values = typeof data.metadata === "object" ? Object.values(data.metadata) : [null];
    if (values.some((value) => typeof value !== "string")) fail(where, "`metadata` values must all be strings");
  }
  if (match[2].split("\n").length > MAX_BODY_LINES) fail(where, `body is over ${MAX_BODY_LINES} lines`);
}

function checkLinks(file) {
  const text = readFileSync(file, "utf8");
  for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const path = resolve(dirname(file), decodeURIComponent(target.split("#")[0]));
    if (!existsSync(path)) fail(rel(file), `broken link to ${target}`);
  }
}

function changedSince(ref) {
  const out = execFileSync("git", ["diff", "--name-only", `${ref}...HEAD`], { cwd: root, encoding: "utf8" });
  return out.split("\n").filter(Boolean);
}

function versionAt(ref, path) {
  try {
    const out = execFileSync("git", ["show", `${ref}:${path}`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return JSON.parse(out).version;
  } catch {
    return null;
  }
}

const marketplace = readJson(join(root, ".claude-plugin", "marketplace.json"));
const listedPlugins = new Map((marketplace?.plugins ?? []).map((plugin) => [plugin.name, plugin]));
const seenNames = new Map();
const categories = readdirSync(skillsDir).filter((name) => statSync(join(skillsDir, name)).isDirectory());
const sinceIndex = process.argv.indexOf("--since");
const since = sinceIndex > -1 ? process.argv[sinceIndex + 1] : null;
const changed = since ? changedSince(since) : [];

for (const category of categories) {
  const categoryDir = join(skillsDir, category);
  const manifestPath = join(categoryDir, ".claude-plugin", "plugin.json");
  if (!existsSync(manifestPath)) {
    fail(rel(categoryDir), "category has no .claude-plugin/plugin.json");
    continue;
  }
  const manifest = readJson(manifestPath);
  if (!manifest) continue;

  const pluginName = `ahmadfiazjan-${category}`;
  if (manifest.name !== pluginName) fail(rel(manifestPath), `name must be "${pluginName}"`);
  if (!SEMVER.test(manifest.version ?? "")) fail(rel(manifestPath), "version must look like 1.2.3");

  const entry = listedPlugins.get(pluginName);
  if (!entry) fail(".claude-plugin/marketplace.json", `does not list ${pluginName}`);
  else if (entry.source !== `./skills/${category}`) fail(".claude-plugin/marketplace.json", `${pluginName} source must be "./skills/${category}"`);

  const listed = new Set((manifest.skills ?? []).map((path) => resolve(categoryDir, path)));
  const found = readdirSync(categoryDir)
    .map((name) => join(categoryDir, name))
    .filter((path) => existsSync(join(path, "SKILL.md")));

  for (const path of listed) if (!existsSync(join(path, "SKILL.md"))) fail(rel(manifestPath), `lists ${rel(path)}, which has no SKILL.md`);
  for (const path of found) {
    if (!listed.has(path)) fail(rel(manifestPath), `does not list ${rel(path)}`);
    checkSkill(path, seenNames);
  }

  const touched = changed.some((path) => path.startsWith(`skills/${category}/`) && !path.endsWith("README.md"));
  if (touched && versionAt(since, rel(manifestPath)) === manifest.version) {
    fail(rel(manifestPath), `skills changed since ${since} but version is still ${manifest.version}`);
  }
}

for (const name of listedPlugins.keys()) {
  const category = name.replace(/^ahmadfiazjan-/, "");
  if (!categories.includes(category)) fail(".claude-plugin/marketplace.json", `lists ${name}, but skills/${category} does not exist`);
}

for (const file of walk(root)) {
  if (!/\.(md|mjs|js|json|ya?ml|svg)$/.test(file)) continue;
  if (readFileSync(file, "utf8").includes("\r\n")) fail(rel(file), "has Windows (CRLF) line endings");
  if (file.endsWith(".md")) checkLinks(file);
}

if (errors.length) {
  console.error(errors.join("\n"));
  console.error(`\n${errors.length} problem(s) found.`);
  process.exit(1);
}
console.log(`OK: ${categories.length} categor${categories.length === 1 ? "y" : "ies"}, ${seenNames.size} skill(s) valid.`);
