import * as path from 'path';
import { runTests } from '../../utils/code-runner';
import { Job, JobInput, Language } from '../base.job';

export class BugFixJob implements Job {
  id = 'j03';
  name = 'Bug Fix - Race Condition';
  description = 'Identify and fix a race condition in concurrent code';
  supportedLanguages: Language[] = ['nodejs', 'java', 'dotnet'];
  evaluationType = 'test-execution' as const;
  maxTurns = 1;

  systemPrompt =
    'You are a debugging expert. Structure your response exactly as requested.';

  buildPrompt(input: JobInput): string {
    return `The following code has a race condition causing non-deterministic results under concurrent access.

Analyze the code and respond in exactly this format:

LOCATION: <exact method or line where the race condition occurs>
EXPLANATION: <why this causes non-deterministic results, 2-3 sentences>
FIXED CODE:
<complete corrected implementation>

LANGUAGE: ${input.language}

BUGGY CODE:
${input.fixtureCode}`;
  }

  async evaluate(
    response: string,
    input: JobInput,
  ): Promise<{ passed: boolean; score: number; notes: string }> {
    // Extract the FIXED CODE section
    const fixedCodeMatch = response.match(/FIXED CODE:\s*\n([\s\S]+?)(?:\n\n[A-Z]|$)/);
    const fixedCode = fixedCodeMatch ? fixedCodeMatch[1].trim() : response;

    const implFileMap: Record<Language, string> = {
      nodejs: 'counter.js',
      java: 'Counter.java',
      dotnet: 'Counter.cs',
    };
    const testDir = path.join(process.cwd(), 'fixtures', input.language, 'j03', 'tests');
    const result = await runTests(fixedCode, input.language, testDir, implFileMap[input.language]);

    const hasLocation = /LOCATION:/i.test(response);
    const hasExplanation = /EXPLANATION:/i.test(response);

    return {
      passed: result.passed,
      score: result.passed ? 5 : (hasLocation && hasExplanation ? 2 : 1),
      notes: result.output || result.errorMessage || '',
    };
  }
}

export default new BugFixJob();
