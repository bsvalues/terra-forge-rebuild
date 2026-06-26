// scripts/check-svg-a11y.mjs
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");

async function* walk(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    throw new Error(`Cannot read directory: ${dir} (${err?.message ?? err})`);
  }

  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else yield full;
  }
}

function isTsLike(filePath) {
  return filePath.endsWith(".tsx") || filePath.endsWith(".ts");
}

function checkFile(content, filePath) {
  const issues = [];

  // Find <svg ...> opening tags (multi-line).
  const svgTagRegex = /<svg\b[\s\S]*?>/g;
  const svgTags = content.match(svgTagRegex) ?? [];

  for (const tag of svgTags) {
    const hasRoleImg = /\brole\s*=\s*["']img["']/.test(tag);
    if (!hasRoleImg) continue;

    const hasFocusableFalse = /\bfocusable\s*=\s*["']false["']/.test(tag);
    if (!hasFocusableFalse) {
      issues.push({
        file: filePath,
        rule: "SVG_ROLE_IMG_REQUIRES_FOCUSABLE_FALSE",
        detail: `Found <svg role="img"> missing focusable="false"`,
      });
    }
  }

  // Find <title ...> opening tags — only relevant if the file contains <svg>.
  if (!content.includes("<svg")) return issues;
  const titleTagRegex = /<title\b[^>]*>/g;
  const titleTags = content.match(titleTagRegex) ?? [];

  for (const ttag of titleTags) {
    // Accept:
    //  - <title id="foo">
    //  - <title id={'foo'}>
    //  - <title id={titleId}>
    const hasId =
      /\bid\s*=\s*["'][^"']+["']/.test(ttag) ||
      /\bid\s*=\s*{\s*["'][^"']+["']\s*}/.test(ttag) ||
      /\bid\s*=\s*{\s*[^}]+\s*}/.test(ttag);

    if (!hasId) {
      issues.push({
        file: filePath,
        rule: "SVG_TITLE_REQUIRES_ID",
        detail: `Found <title> missing id (use <title id={titleId}>...)`,
      });
    }
  }

  return issues;
}

async function main() {
  const allIssues = [];

  for await (const f of walk(SRC_DIR)) {
    if (!isTsLike(f)) continue;

    const content = await fs.readFile(f, "utf8");
    if (!content.includes("<svg") && !content.includes("<title")) continue;

    const rel = path.relative(ROOT, f);
    allIssues.push(...checkFile(content, rel));
  }

  if (allIssues.length) {
    console.error("🚨 TerraFusion SVG A11y Guardrail Tripped:");
    for (const i of allIssues) {
      console.error(`- [${i.rule}] ${i.file}: ${i.detail}`);
    }
    console.error("\nRemediation: add focusable=\"false\" to <svg role=\"img\"> and id=... to <title>.");
    process.exit(1);
  }

  console.log("✅ SVG A11y Guardrail passed. The crayons remain secured.");
}

main().catch((err) => {
  console.error(`Guardrail crashed: ${err?.message ?? err}`);
  process.exit(2);
});
