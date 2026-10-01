import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const documents = [
  "prompts-directory/PRD.md",
  "prompts-directory/APP_FLOW.md",
  "prompts-directory/TECH_STACK.md",
  "prompts-directory/BACKEND_STRUCTURE.md",
  "prompts-directory/POC.md",
  "prompts-directory/IMPLEMENTATION_PLAN.md",
  "payproof/docs/phase-4-human-validation.md",
];
const requiredStatements = [
  "Share income, not wallet history.",
  "Claiming anonymous payments",
  "receipt-only demo mode",
  "encrypted, signed disclosure payload",
  "Do not fabricate pilot numbers",
  "No sessions have been recorded yet.",
];
const contents = documents.map((document) => readFileSync(resolve(repositoryRoot, document), "utf8"));

for (const statement of requiredStatements) {
  if (!contents.some((content) => content.includes(statement))) {
    throw new Error(`Documentation contract is missing: ${statement}`);
  }
}

console.log(`Documentation contract passed for ${documents.length} canonical documents.`);
