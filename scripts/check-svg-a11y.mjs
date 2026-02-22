// scripts/check-svg-a11y.mjs
// TerraFusion SVG A11y Guardrail — fails CI if role="img" SVGs lack focusable="false" or <title> lacks id
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else yield full;
  }
}

function checkFile(content, filePath) {
  const issues = [];

  const svgTags = content.match(/<svg\b[\s\S]*?>/g) ?? [];
  for (const tag of svgTags) {
    if (!/\brole\s*=\s*["']img["']/.test(tag)) continue;
    if (!/\bfocusable\s*=\s*["']false["']/.test(tag)) {
      issues.push({ file: filePath, rule: "SVG_ROLE_IMG_REQUIRES_FOCUSABLE_FALSE", detail: `<svg role="img"> missing focusable="false"` });
    }
  }

  const titleTags = content.match(/<title\b[^>]*>/g) ?? [];
  for (const ttag of titleTags) {
    const hasId = /\bid\s*=\s*{/.test(ttag) || /\bid\s*=\s*["']/.test(ttag);
    if (!hasId) {
      issues.push({ file: filePath, rule: "SVG_TITLE_REQUIRES_ID", detail: `<title> missing id attribute` });
    }
  }

  return issues;
}

async function main() {
  const allIssues = [];

  for await (const f of walk(SRC_DIR)) {
    if (!f.endsWith(".tsx") && !f.endsWith(".ts")) continue;
    const content = await fs.readFile(f, "utf8");
    if (!content.includes("<svg") && !content.includes("<title")) continue;
    allIssues.push(...checkFile(content, path.relative(ROOT, f)));
  }

  if (allIssues.length) {
    console.error("🚨 TerraFusion SVG A11y Guardrail:");
    for (const i of allIssues) console.error(`  [${i.rule}] ${i.file}: ${i.detail}`);
    process.exit(1);
  }

  console.log("✅ SVG A11y Guardrail passed.");
}

main();
