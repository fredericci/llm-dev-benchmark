import * as path from 'path';
import { runTests } from '../../utils/code-runner';
import { Job, JobInput, Language } from '../base.job';

const ISSUE_TITLE = 'Notify user by email when password has not been changed in 90 days';

const ISSUE_DESCRIPTION = `Users should be notified by email when their password hasn't been changed in 90 days.
This is a security requirement to encourage regular password updates.
The notification should be sent once per user per 90-day period (no spam).`;

const ACCEPTANCE_CRITERIA = `1. A scheduled job or check runs daily and finds users whose lastPasswordChange is 90+ days ago
2. An email is sent to each qualifying user with a clear message and a link to change their password
3. After the email is sent, record that notification was sent (to avoid duplicate notifications)
4. Unit tests cover: user qualifies after 90 days, user does not qualify before 90 days, duplicate notification prevention`;

export class FeatureFromIssueJob implements Job {
  id = 'j13';
  name = 'Feature from Issue - Password Expiry Notification';
  description = 'Implement a GitHub issue: notify users when password has not changed in 90 days';
  supportedLanguages: Language[] = ['nodejs', 'java', 'dotnet'];
  evaluationType = 'test-execution' as const;
  maxTurns = 1;

  systemPrompt =
    'You are implementing a GitHub issue. Provide all necessary code changes.';

  buildPrompt(input: JobInput): string {
    return `Implement the following feature request in the existing codebase.

ISSUE: ${ISSUE_TITLE}

DESCRIPTION:
${ISSUE_DESCRIPTION}

ACCEPTANCE CRITERIA:
${ACCEPTANCE_CRITERIA}

EXISTING CODE:
${input.fixtureCode}

LANGUAGE: ${input.language}

Provide:
1. APPROACH: 2-3 sentences on implementation strategy
2. CHANGED FILES: each file with complete updated content
3. NEW FILES: any new files needed
4. TESTS: unit tests covering the acceptance criteria`;
  }

  async evaluate(
    response: string,
    input: JobInput,
  ): Promise<{ passed: boolean; score: number; notes: string }> {
    if (input.language !== 'nodejs') {
      return { passed: false, score: 0, notes: `${input.language} test execution not supported (stub)` };
    }

    const testDir = path.join(process.cwd(), 'fixtures', 'nodejs', 'j13', 'tests');
    const result = await runTests(response, input.language, testDir, 'password-notification.js');

    return {
      passed: result.passed,
      score: result.passed ? 5 : 1,
      notes: result.output || result.errorMessage || '',
    };
  }
}

export default new FeatureFromIssueJob();
