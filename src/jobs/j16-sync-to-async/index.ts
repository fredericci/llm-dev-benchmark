import * as path from 'path';
import { runTests } from '../../utils/code-runner';
import { Job, JobInput, Language } from '../base.job';

export class SyncToAsyncJob implements Job {
  id = 'j16';
  name = 'Sync to Async Conversion';
  description = 'Convert callback-based code to modern async/await';
  supportedLanguages: Language[] = ['nodejs', 'java', 'dotnet'];
  evaluationType = 'test-execution' as const;
  maxTurns = 1;

  systemPrompt =
    'You are refactoring legacy code to modern async patterns. Respond with code only.';

  buildPrompt(input: JobInput): string {
    return `Convert the following code from callback/synchronous patterns to modern async/await.

RULES:
- No callback nesting
- Every promise must be explicitly handled (no fire-and-forget)
- Parallel operations that don't depend on each other must use Promise.all
- Proper error propagation with try/catch
- Behavior must be 100% identical to the original

LANGUAGE: ${input.language}

CURRENT CODE:
${input.fixtureCode}`;
  }

  async evaluate(
    response: string,
    input: JobInput,
  ): Promise<{ passed: boolean; score: number; notes: string }> {
    if (input.language !== 'nodejs') {
      return { passed: false, score: 0, notes: `${input.language} test execution not supported (stub)` };
    }

    const testDir = path.join(process.cwd(), 'fixtures', 'nodejs', 'j16', 'tests');
    const result = await runTests(response, input.language, testDir, 'data-pipeline.js');

    // Check for callback antipatterns in response
    const hasCallbackNesting = /callback.*callback|\.then.*\.then.*\.then/i.test(response);

    return {
      passed: result.passed && !hasCallbackNesting,
      score: result.passed ? (hasCallbackNesting ? 3 : 5) : 1,
      notes: result.output || result.errorMessage || '',
    };
  }
}

export default new SyncToAsyncJob();
