import * as path from 'path';
import { runTests } from '../../utils/code-runner';
import { Job, JobInput, Language } from '../base.job';

export class CIFailureJob implements Job {
  id = 'j20';
  name = 'CI Failure Diagnosis';
  description = 'Diagnose a broken CI pipeline and provide the exact fix';
  supportedLanguages: Language[] = ['nodejs', 'java', 'dotnet'];
  evaluationType = 'test-execution' as const;
  maxTurns = 1;

  systemPrompt =
    'You are a senior engineer fixing a broken CI pipeline.';

  buildPrompt(input: JobInput): string {
    return `The CI pipeline is failing. Diagnose the root cause and provide the exact fix.

Respond with:
FAILURE REASON: <precise cause — not "test failed" but WHY>
AFFECTED FILE: <which file needs to change>
FIXED FILE: <complete corrected file content>
ROOT CAUSE: <underlying engineering issue that caused this>
PREVENTION: <what process or tooling would catch this earlier>

CI LOG:
${input.additionalContext ?? '(no CI log provided)'}

RELEVANT FILES:
${input.fixtureCode}`;
  }

  async evaluate(
    response: string,
    input: JobInput,
  ): Promise<{ passed: boolean; score: number; notes: string }> {
    if (input.language !== 'nodejs') {
      return { passed: false, score: 0, notes: `${input.language} test execution not supported (stub)` };
    }

    // Extract FIXED FILE section
    const fixedMatch = response.match(/FIXED FILE:\s*\n([\s\S]+?)(?:\nROOT CAUSE:|$)/);
    const fixedCode = fixedMatch ? fixedMatch[1].trim() : response;

    const testDir = path.join(process.cwd(), 'fixtures', 'nodejs', 'j20', 'tests');
    const result = await runTests(fixedCode, input.language, testDir, 'utils.js');

    return {
      passed: result.passed,
      score: result.passed ? 5 : 1,
      notes: result.output || result.errorMessage || '',
    };
  }
}

export default new CIFailureJob();
