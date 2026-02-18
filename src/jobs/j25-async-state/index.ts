import * as path from 'path';
import { runTests } from '../../utils/code-runner';
import { Job, JobInput, Language } from '../base.job';

export class AsyncStateJob implements Job {
  id = 'j25';
  name = 'Async State Management';
  description = 'Create a React component that correctly handles all async states: loading, success, empty, error, and retry';
  supportedLanguages: Language[] = ['nodejs'];
  evaluationType = 'test-execution' as const;
  maxTurns = 1;

  systemPrompt =
    'You are a senior frontend engineer. Respond with code only. No explanations, no markdown prose.';

  buildPrompt(input: JobInput): string {
    return `Create a React component that fetches and displays a list of users with complete async state management.

Props:
- fetchUsers: () => Promise<Array<{ id: number, name: string, email: string }>>

REQUIRED STATES:
1. Loading: show "Loading..." text while fetching
2. Success: render each user showing their name and email
3. Empty: show "No users found" when fetchUsers resolves with an empty array
4. Error: show the error message text and a "Retry" button
5. Retry: clicking "Retry" re-triggers fetchUsers, showing loading state again

RULES:
- Call fetchUsers on component mount (useEffect)
- Loading indicator and data/error content must NEVER appear simultaneously
- The retry button must be accessible with text "Retry"
- Export the component as default (module.exports or export default)
- Component name: UserList
- Do not use any external libraries beyond React

EXISTING CODE:
${input.fixtureCode}

Return ONLY the complete component file. Tests must pass when run against it.`;
  }

  async evaluate(
    response: string,
    input: JobInput,
  ): Promise<{ passed: boolean; score: number; notes: string }> {
    if (input.language !== 'nodejs') {
      return { passed: false, score: 0, notes: `${input.language} not supported for this job` };
    }

    const testDir = path.join(process.cwd(), 'fixtures', 'nodejs', 'j25', 'tests');
    const result = await runTests(response, input.language, testDir, 'user-list.jsx');

    return {
      passed: result.passed,
      score: result.passed ? 5 : 1,
      notes: result.output || result.errorMessage || '',
    };
  }
}

export default new AsyncStateJob();
