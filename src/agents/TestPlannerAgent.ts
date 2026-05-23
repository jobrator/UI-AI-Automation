#!/usr/bin/env ts-node
/**
 * TestPlannerAgent — AI agent powered by Claude that:
 *  1. Browses the target application using web search
 *  2. Analyses features and user flows
 *  3. Generates comprehensive Gherkin scenarios following ISTQB standards
 *  4. Covers security scenarios following OWASP Top 10
 *  5. Writes generated feature files to the /features directory
 *
 * Usage:
 *   npm run agent:planner
 *   npm run agent:planner -- --feature=registration
 *   npm run agent:planner -- --feature=job-search --output=features/jobs
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
const featureArg = args.find((a) => a.startsWith('--feature='))?.split('=')[1] ?? 'login';
const outputArg = args.find((a) => a.startsWith('--output='))?.split('=')[1];
const outputDir = outputArg ?? `features/${featureArg}`;

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the **Test Planner Agent** for the Jobrator web application — a job portal platform.

## Your Role
You are a senior QA engineer with deep expertise in:
- **ISTQB Foundation & Advanced Level** test design techniques
- **OWASP Top 10** security testing methodology
- **BDD/Gherkin** scenario writing
- **Web application** testing best practices

## Application Context
- **Site**: ${SITE_URL}
- **Primary user**: Candidate (job seeker)
- **Candidate credentials** (for context only — use them to understand authenticated flows):
  - Email: ${CANDIDATE_EMAIL}
  - Password: ${CANDIDATE_PASSWORD}

## Your Task
When given a feature area, you MUST:

1. **Explore** the application by searching for information about the feature on the site
2. **Identify** all user flows, edge cases, and security concerns
3. **Design** comprehensive test scenarios using:
   - Equivalence Partitioning (EP)
   - Boundary Value Analysis (BVA)
   - Decision Table Testing (DTT)
   - State Transition Testing (STT)
   - Error Guessing (EG)
4. **Write** scenarios in proper Gherkin (Feature/Background/Scenario/Given/When/Then/And/But)
5. **Tag** every scenario with:
   - Functional area: @authentication, @registration, @search, etc.
   - Test type: @smoke, @regression, @boundary, @negative, @positive
   - Security: @security, @owasp (for OWASP scenarios)
   - UI: @ui, @session
   - Unique ID: @TC001, @TC002, etc.
6. **Include** OWASP security tests covering relevant Top 10 items:
   - A01: Broken Access Control
   - A02: Cryptographic Failures
   - A03: Injection (SQL, XSS, Command)
   - A07: Identification and Authentication Failures
   - A09: Security Logging and Monitoring Failures

## Output Format
Return ONLY a valid Gherkin .feature file — no explanation, no markdown code blocks, no preamble.
Start with the Feature keyword. Include a header comment block with:
- Test standard references
- Coverage summary
- Tag legend
`;

// ─── Agent implementation ─────────────────────────────────────────────────────

class TestPlannerAgent {
  private client: Anthropic;
  private conversationHistory: Anthropic.MessageParam[] = [];

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        '[TestPlannerAgent] ANTHROPIC_API_KEY is not set.\n' +
        'Add it to your .env file: ANTHROPIC_API_KEY=sk-ant-...'
      );
    }
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Run the Test Planner agent for a given feature area.
   */
  async run(featureArea: string): Promise<string> {
    console.log(`\n╔════════════════════════════════════════════════════╗`);
    console.log(`║  Test Planner Agent — Generating scenarios          ║`);
    console.log(`║  Feature: ${featureArea.padEnd(41)}║`);
    console.log(`║  Site:    ${SITE_URL.padEnd(41)}║`);
    console.log(`╚════════════════════════════════════════════════════╝\n`);

    // ── Turn 1: Research the feature on the site ──────────────────────────
    console.log('[TestPlannerAgent] Phase 1: Researching the application...');

    const researchPrompt = `
I need you to research the "${featureArea}" feature on the Jobrator application at ${SITE_URL}.

Please search for information about:
1. How the ${featureArea} feature works on jobrator.com
2. What the user interface looks like (forms, fields, validation)
3. Any specific business rules or requirements
4. Common issues or edge cases for this type of feature

Use your web search tool to gather this information, then provide a brief summary of what you found.
After the summary, generate comprehensive ISTQB + OWASP test scenarios in Gherkin format for the "${featureArea}" feature.

The scenarios should cover all the test design techniques I've described.
`;

    this.conversationHistory.push({ role: 'user', content: researchPrompt });

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      // SDK type union lags the API for server-side tools — cast is safe here.
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search'
        }
      ] as unknown as Anthropic.Tool[],
      messages: this.conversationHistory
    });

    // Collect all text content from the response
    const assistantContent = response.content;
    this.conversationHistory.push({ role: 'assistant', content: assistantContent });

    let gherkinOutput = assistantContent
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    // ── Turn 2: Refine and add security scenarios if needed ───────────────
    console.log('[TestPlannerAgent] Phase 2: Adding security scenarios...');

    const securityPrompt = `
Now, please enhance the Gherkin scenarios you created by ensuring:

1. All OWASP Top 10 relevant security tests are included for the "${featureArea}" feature
2. Each scenario has a unique @TC<NNN> tag
3. Scenarios for all equivalence partitions and boundary values are present
4. The Background section is correct
5. Scenario Outlines with Examples tables are used for data-driven tests

Return the COMPLETE, FINAL Gherkin feature file — clean, with no extra explanation.
`;

    this.conversationHistory.push({ role: 'user', content: securityPrompt });

    const refinedResponse = await this.client.messages.create({
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

    const refinedContent = refinedResponse.content;
    this.conversationHistory.push({ role: 'assistant', content: refinedContent });

    const finalGherkin = refinedContent
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    // Use the refined output if it contains proper Gherkin, otherwise use first
    const output = finalGherkin.includes('Feature:') ? finalGherkin : gherkinOutput;

    return this.cleanGherkinOutput(output);
  }

  /**
   * Remove any markdown code fence wrappers that Claude might add.
   */
  private cleanGherkinOutput(text: string): string {
    return text
      .replace(/^```gherkin\n?/m, '')
      .replace(/^```\n?/m, '')
      .replace(/\n?```$/m, '')
      .trim();
  }

  /**
   * Save the generated feature file to disk.
   */
  saveFeatureFile(content: string, outputPath: string): void {
    const dir = path.dirname(outputPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, content, 'utf-8');
    console.log(`\n[TestPlannerAgent] ✅ Feature file saved → ${outputPath}`);
  }

  /**
   * Print a scenario count summary.
   */
  printSummary(content: string): void {
    const scenarioCount = (content.match(/^\s*Scenario/gm) ?? []).length;
    const outlineCount = (content.match(/^\s*Scenario Outline/gm) ?? []).length;
    const tagCount = new Set(content.match(/@\w+/g) ?? []).size;

    console.log('\n────────────────────────────────────────────────────');
    console.log(`  Scenarios generated    : ${scenarioCount}`);
    console.log(`  Scenario Outlines      : ${outlineCount}`);
    console.log(`  Unique tags used       : ${tagCount}`);
    console.log('────────────────────────────────────────────────────\n');
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const agent = new TestPlannerAgent();

  try {
    const gherkin = await agent.run(featureArg);
    const outputFile = path.join(outputDir, `${featureArg}.feature`);

    agent.saveFeatureFile(gherkin, outputFile);
    agent.printSummary(gherkin);

    // Print a preview
    console.log('── Feature File Preview (first 50 lines) ────────────');
    console.log(gherkin.split('\n').slice(0, 50).join('\n'));
    console.log('────────────────────────────────────────────────────');
  } catch (error) {
    console.error(`\n[TestPlannerAgent] ERROR: ${(error as Error).message}`);
    process.exit(1);
  }
}

main();
