import * as path from 'path';
import { runTests } from '../../utils/code-runner';
import { Job, JobInput, Language } from '../base.job';

export class RefactoringJob implements Job {
  id = 'j02';
  name = 'Refactoring - Eliminate Code Smells';
  description = 'Refactor a god class to eliminate code smells without changing behavior';
  supportedLanguages: Language[] = ['nodejs', 'java', 'dotnet'];
  evaluationType = 'test-execution' as const;
  maxTurns = 1;

  systemPrompt =
    'You are a senior engineer. Respond with refactored code only. No explanations.';

  buildPrompt(input: JobInput): string {
    return `Refactor the following code to eliminate all code smells listed below.
Do NOT change the observable behavior — all existing tests must still pass.

SMELLS TO FIX:
- God class: split into focused classes/modules
- Magic numbers: extract to named constants
- Duplicated logic: extract to shared functions
- Deep nesting: use early returns / guard clauses
- Methods longer than 20 lines: split into smaller focused functions

LANGUAGE: ${input.language}

CODE:
${input.fixtureCode}`;
  }

  async evaluate(
    response: string,
    input: JobInput,
  ): Promise<{ passed: boolean; score: number; notes: string }> {
    const implFileMap: Record<Language, string> = {
      nodejs: 'order-processor.js',
      java: 'OrderProcessor.java',
      dotnet: 'OrderProcessor.cs',
    };
    const testDir = path.join(process.cwd(), 'fixtures', input.language, 'j02', 'tests');
    const result = await runTests(response, input.language, testDir, implFileMap[input.language]);

    return {
      passed: result.passed,
      score: result.passed ? 5 : 1,
      notes: result.output || result.errorMessage || '',
    };
  }
}

export default new RefactoringJob();
