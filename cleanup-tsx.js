/**
 * Auto-clean React + TSX unused imports and minor issues.
 * Run: node cleanup-tsx.js
 */

import fs from "fs";
import path from "path";

const root = "./src";

function cleanFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");

  // Remove `import React` lines (React 17+)
  content = content.replace(/import\s+React(,\s*\{[^}]*\})?\s+from\s+["']react["'];?/g, "");

  // Remove unused React hooks if not used in file
  const hooks = ["useState", "useEffect", "useMemo", "useContext", "useRef"];
  hooks.forEach((hook) => {
    const regexImport = new RegExp(`(,\\s*)?${hook}(\\s*,)?`, "g");
    const regexUsage = new RegExp(`\\b${hook}\\b`);
    if (!regexUsage.test(content)) {
      // remove it from imports
      content = content.replace(regexImport, "");
    }
  });

  // Clean leftover commas/braces from import braces
  content = content.replace(/\{\s*,\s*\}/g, "{}");
  content = content.replace(/\{,\s*/g, "{");
  content = content.replace(/,\s*\}/g, "}");

  // Remove multiple consecutive empty lines
  content = content.replace(/\n{3,}/g, "\n\n");

  // Ensure export default ends cleanly
  if (!content.endsWith("\n")) content += "\n";

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`✅ Cleaned: ${filePath}`);
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) walk(filePath);
    else if (file.endsWith(".tsx") || file.endsWith(".ts")) cleanFile(filePath);
  }
}

console.log("🧹 Cleaning TS/TSX files...");
walk(root);
console.log("✨ Cleanup completed! Now formatting with Prettier...");

// Run prettier if available
try {
  const { execSync } = await import("child_process");
  execSync("npx prettier --write src", { stdio: "inherit" });
} catch {
  console.log("⚠️ Prettier not found — skipping format.");
}

console.log("\n✅ All unused React imports and extra hooks removed successfully!");
