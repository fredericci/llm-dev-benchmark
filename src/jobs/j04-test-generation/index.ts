import * as path from 'path';
import { runTests } from '../../utils/code-runner';
import { Job, JobInput, Language } from '../base.job';

export class TestGenerationJob implements Job {
  id = 'j04';
  name = 'Test Generation - Edge Cases';
  description = 'Generate a comprehensive test suite for a discount calculation function';
  supportedLanguages: Language[] = ['nodejs', 'java', 'dotnet'];
  evaluationType = 'test-execution' as const;
  maxTurns = 1;

  systemPrompt =
    'You are a QA engineer specializing in test coverage. Respond with test code only.';

  buildPrompt(input: JobInput): string {
    const frameworkMap: Record<Language, string> = {
      nodejs: 'Jest',
      java: 'JUnit 5',
      dotnet: 'xUnit',
    };
    const testFramework = frameworkMap[input.language];

    return `Generate a comprehensive test suite for the function below.

Required coverage:
- Happy path: at least 2 normal cases
- Boundary values: min valid, max valid, zero, empty
- Invalid inputs: null/undefined, wrong types, out-of-range values
- Business rule edge cases: at least 3 non-obvious cases

Each test name must describe WHAT is being tested and the EXPECTED outcome.

LANGUAGE: ${input.language}
FRAMEWORK: ${testFramework}

FUNCTION:
${input.fixtureCode}`;
  }

  async evaluate(
    response: string,
    input: JobInput,
  ): Promise<{ passed: boolean; score: number; notes: string }> {
    if (input.language !== 'nodejs') {
      return { passed: false, score: 0, notes: `${input.language} test execution not supported (stub)` };
    }

    const testDir = path.join(process.cwd(), 'fixtures', 'nodejs', 'j04', 'tests');
    const result = await runTests(response, input.language, testDir, 'discount.test.js');

    const edgeCaseCount = (response.match(/vip|VIP|maximum|max.*30|boundary|null|undefined|NaN/gi) ?? []).length;
    const hasEnoughEdgeCases = edgeCaseCount >= 3;

    return {
      passed: result.passed && hasEnoughEdgeCases,
      score: result.passed ? (hasEnoughEdgeCases ? 5 : 3) : 1,
      notes: result.output || result.errorMessage || '',
    };
  }
}

export default new TestGenerationJob();
