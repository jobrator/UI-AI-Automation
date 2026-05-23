#!/usr/bin/env ts-node
/**
 * CodeGeneratorAgent — AI agent powered by Claude that:
 *  1. Reads existing Gherkin feature files
 *  2. Browses the live application to understand UI structure
 *  3. Generates Playwright step definitions following Playwright best practices
 *  4. Generates Page Object classes with resilient locators
 *  5. Ensures zero step-definition conflicts across the codebase
 *  6. Writes generated code to the correct src/ locations
 *
 * Usage:
 *   npm run agent:codegen
 *   npm run agent:codegen -- --feature=features/auth/login.feature
 *   npm run agent:codegen -- --feature=features/registration/register.feature --dry-run
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// ─── Configuration ────────────────────────────────────────────────────────────

const SITE_URL = process.env.JOBRATOR_SITE ?? 'https://jobrator.com/';
const CANDIDATE_EMAIL = process.env.CANDIDATE_EMAIL ?? '';
const CANDIDATE_PASSWORD = process.env.CANDIDATE_PASSWORD ?? '';
const MODEL = process.env.AGENT_MODEL ?? 'claude-sonnet-4-20250514';
const MAX_TOKENS = parseInt(process.env.AGENT_MAX_TOKENS ?? '8000', 10);

// ─── Parse CLI args ───────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const featurePath = args.find((a) => a.startsWith('--feature='))?.split('=')[1]
  ?? 'features/auth/login.feature';
const isDryRun = args.includes('--dry-run');

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the **Code Generator Agent** for the Jobrator BDD automation framework.

## Your Role
You are a principal automation engineer expert in:
- **Playwright** (TypeScript) — latest best practices from docs.playwright.dev
- **Cucumber.js** — @cucumber/cucumber with TypeScript
- **Page Object Model** design pattern
- **BDD step definitions** — clean, reusable, conflict-free
- **TypeScript** — strict mode, proper typing

## Application Context
- **Site**: ${SITE_URL}
- **Candidate credentials** (for inspecting authenticated flows):
  - Email: ${CANDIDATE_EMAIL}
  - Password: ${CANDIDATE_PASSWORD}

## Framework Structure
\`\`\`
src/
├── lib/CommonLibrary.ts      — Playwright wrappers (navigate, click, fill, getText, etc.)
├── pages/
│   ├── BasePage.ts           — abstract: navigate(), isLoaded(), this.lib, this.page
│   └── <Name>Page.ts         — extends BasePage
├── steps/
│   └── <area>/<name>.steps.ts — Cucumber step definitions (Given/When/Then)
└── support/world.ts           — CustomWorld: this.browser, this.context, this.page
\`\`\`

## Your Rules (CRITICAL — prevents merge conflicts)
1. **Unique step patterns**: Every step regex/string must be globally unique across all step files
2. **No duplicate steps**: Check if a step already exists before creating a new one
3. **Page Object only returns values** — no assertions inside page objects
4. **Step definitions contain all assertions** using Playwright's expect()
5. **Use role-based locators first**: page.getByRole(), getByLabel(), getByPlaceholder()
6. **Fallback locators**: data-testid, then CSS, then XPath (last resort)
7. **Never use .sleep()** — use Playwright's built-in waiting mechanisms
8. **Type everything** — no implicit any, no type assertions without good reason
9. **Steps call this.lib or page object methods** — never raw Playwright in steps
10. **CommonLibrary methods are preferred** over direct page.locator() in step definitions

## Code Quality
- Add JSDoc comments to all public methods
- Use descriptive variable names
- Handle errors with meaningful messages
- Keep methods small and focused (single responsibility)

## Output Format
Return a JSON object with these exact keys:
{
  "pageObject": "<full TypeScript code for the Page Object class>",
  "stepDefinitions": "<full TypeScript code for all step definitions>",
  "testData": "<optional JSON test data if needed>"
}
Return ONLY the JSON object — no markdown, no explanation.
`;

// ─── Agent implementation ─────────────────────────────────────────────────────

interface GeneratedCode {
  pageObject: string;
  stepDefinitions: string;
  testData?: string;
}

class CodeGeneratorAgent {
  private client: Anthropic;
  private conversationHistory: Anthropic.MessageParam[] = [];

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        '[CodeGeneratorAgent] ANTHROPIC_API_KEY is not set.\n' +
        'Add it to your .env file: ANTHROPIC_API_KEY=sk-ant-...'
      );
    }
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Run the Code Generator agent for a given feature file.
   */
  async run(featureFilePath: string): Promise<GeneratedCode> {
    // Read the feature file
    if (!fs.existsSync(featureFilePath)) {
      throw new Error(`[CodeGeneratorAgent] Feature file not found: ${featureFilePath}`);
    }
    const featureContent = fs.readFileSync(featureFilePath, 'utf-8');

    // Derive names from the feature file path
    const featureName = path.basename(featureFilePath, '.feature');
    const featureDir = path.dirname(featureFilePath).split('/').pop() ?? featureName;
    const pageClassName = this.toPascalCase(featureName) + 'Page';

    console.log(`\n╔════════════════════════════════════════════════════╗`);
    console.log(`║  Code Generator Agent — Generating Playwright code  ║`);
    console.log(`║  Feature: ${featureName.padEnd(41)}║`);
    console.log(`║  Page:    ${pageClassName.padEnd(41)}║`);
    console.log(`╚════════════════════════════════════════════════════╝\n`);

    // Read existing step files to detect conflicts
    const existingSteps = this.readExistingStepPatterns();

    // ── Turn 1: Research the UI structure ────────────────────────────────
    console.log('[CodeGeneratorAgent] Phase 1: Researching the live application UI...');

    const researchPrompt = `
I need you to research the ${featureName} feature of the Jobrator application at ${SITE_URL}.

Please use web search to find out:
1. What the ${featureName} page/feature looks like on jobrator.com
2. What form fields, buttons, and UI elements exist
3. What locators would work best (role, label, placeholder, data-testid, CSS)
4. What URL paths are used
5. What validation messages or error states exist

Then I'll give you the feature file to generate code for.
`;

    this.conversationHistory.push({ role: 'user', content: researchPrompt });

    await this.client.messages.create({
      model: MODEL,
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search'
        }
      ] as unknown as Anthropic.Tool[],
      messages: this.conversationHistory
    });

    // ── Turn 2: Generate the code ─────────────────────────────────────────
    console.log('[CodeGeneratorAgent] Phase 2: Generating Page Object and Step Definitions...');

    const codeGenPrompt = `
Now generate the Playwright automation code for this feature file:

\`\`\`gherkin
${featureContent}
\`\`\`

## Context
- Page class name: ${pageClassName}
- Feature area: ${featureDir}
- Existing step patterns (DO NOT duplicate these): 
${existingSteps.length > 0 ? existingSteps.map((s) => `  - ${s}`).join('\n') : '  (none yet)'}

## Requirements
1. Generate a complete **Page Object** class (${pageClassName}) extending BasePage
   - All locators as private readonly class fields
   - Methods for every action in the feature file
   - No assertions — only return values
   - Use role-based locators where possible

2. Generate complete **Step Definitions** TypeScript file
   - Import CustomWorld from '../../support/world'
   - Import the Page Object
   - Import EnvConfig for credentials
   - Use \`this: CustomWorld\` in all step functions
   - Assertions use Playwright's expect()
   - Handle async/await correctly

3. Return a valid JSON object with keys: pageObject, stepDefinitions, testData (optional)
`;

    this.conversationHistory.push({ role: 'user', content: codeGenPrompt });

    const codeResponse = await this.client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search'
        }
      ] as unknown as Anthropic.Tool[],
      messages: this.conversationHistory
    });

    const rawOutput = codeResponse.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    return this.parseGeneratedCode(rawOutput);
  }

  /**
   * Parse the JSON response from the agent.
   */
  private parseGeneratedCode(rawOutput: string): GeneratedCode {
    try {
      // Strip any markdown code blocks
      const cleaned = rawOutput
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON object found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.pageObject || !parsed.stepDefinitions) {
        throw new Error('Response missing required keys: pageObject, stepDefinitions');
      }

      return parsed as GeneratedCode;
    } catch (err) {
      console.error('[CodeGeneratorAgent] Failed to parse JSON response:', (err as Error).message);
      console.error('Raw output preview:', rawOutput.substring(0, 500));
      throw new Error('Code generation failed — agent returned invalid JSON');
    }
  }

  /**
   * Read all existing step definition files and extract step patterns
   * to avoid duplication / merge conflicts.
   */
  private readExistingStepPatterns(): string[] {
    const stepsDir = path.join(process.cwd(), 'src', 'steps');
    const patterns: string[] = [];

    if (!fs.existsSync(stepsDir)) return patterns;

    const walkDir = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.name.endsWith('.ts')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const matches = content.matchAll(/(?:Given|When|Then)\s*\(\s*['"`](.*?)['"`]/g);
          for (const match of matches) {
            patterns.push(match[1]);
          }
        }
      }
    };

    walkDir(stepsDir);
    return patterns;
  }

  /**
   * Write the generated files to the filesystem.
   */
  saveGeneratedFiles(
    code: GeneratedCode,
    featureFilePath: string
  ): { pageObjectPath: string; stepsPath: string } {
    const featureName = path.basename(featureFilePath, '.feature');
    const featureArea = path.dirname(featureFilePath).split('/').pop() ?? featureName;
    const pageClassName = this.toPascalCase(featureName) + 'Page';

    const pageObjectPath = path.join('src', 'pages', `${pageClassName}.ts`);
    const stepsPath = path.join('src', 'steps', featureArea, `${featureName}.steps.ts`);

    // Create directories
    fs.mkdirSync(path.dirname(pageObjectPath), { recursive: true });
    fs.mkdirSync(path.dirname(stepsPath), { recursive: true });

    // Write files
    fs.writeFileSync(pageObjectPath, code.pageObject, 'utf-8');
    console.log(`[CodeGeneratorAgent] ✅ Page Object saved    → ${pageObjectPath}`);

    fs.writeFileSync(stepsPath, code.stepDefinitions, 'utf-8');
    console.log(`[CodeGeneratorAgent] ✅ Step Definitions saved → ${stepsPath}`);

    if (code.testData) {
      const testDataPath = path.join('test-data', `${featureName}.json`);
      fs.writeFileSync(testDataPath, code.testData, 'utf-8');
      console.log(`[CodeGeneratorAgent] ✅ Test Data saved       → ${testDataPath}`);
    }

    return { pageObjectPath, stepsPath };
  }

  /**
   * Convert kebab-case or snake_case to PascalCase.
   */
  private toPascalCase(input: string): string {
    return input
      .replace(/[-_](.)/g, (_, char) => char.toUpperCase())
      .replace(/^(.)/, (_, char) => char.toUpperCase());
  }

  /**
   * Count lines in generated code for summary.
   */
  printSummary(code: GeneratedCode, paths: { pageObjectPath: string; stepsPath: string }): void {
    const poLines = code.pageObject.split('\n').length;
    const stepLines = code.stepDefinitions.split('\n').length;
    const stepCount = (code.stepDefinitions.match(/(?:Given|When|Then)\s*\(/g) ?? []).length;

    console.log('\n────────────────────────────────────────────────────');
    console.log(`  Page Object     : ${paths.pageObjectPath} (${poLines} lines)`);
    console.log(`  Step Definitions: ${paths.stepsPath} (${stepLines} lines)`);
    console.log(`  Steps generated : ${stepCount}`);
    console.log('────────────────────────────────────────────────────\n');
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const agent = new CodeGeneratorAgent();

  try {
    const code = await agent.run(featurePath);

    if (isDryRun) {
      console.log('\n[CodeGeneratorAgent] DRY RUN — files not saved.\n');
      console.log('── Page Object Preview ────────────────────────────');
      console.log(code.pageObject.split('\n').slice(0, 30).join('\n'));
      console.log('\n── Step Definitions Preview ───────────────────────');
      console.log(code.stepDefinitions.split('\n').slice(0, 30).join('\n'));
    } else {
      const paths = agent.saveGeneratedFiles(code, featurePath);
      agent.printSummary(code, paths);
    }
  } catch (error) {
    console.error(`\n[CodeGeneratorAgent] ERROR: ${(error as Error).message}`);
    process.exit(1);
  }
}

main();
