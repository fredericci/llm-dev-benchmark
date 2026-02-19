import * as path from 'path';
import { FullstackJob, JobInput, Language } from '../base.job';
import { runE2ETests } from '../../utils/e2e-runner';

export class ToastNotificationsJob implements FullstackJob {
  id = 'j30';
  name = 'Fullstack - Toast Notifications';
  description = 'Implement reusable toast notification system';
  supportedLanguages: Language[] = ['nodejs'];
  evaluationType = 'e2e' as const;
  maxTurns = 3;
  baseProjectPath = 'fullstack/base-project';
  playwrightTestFile = 'e2e/tests/j30-toast.spec.ts';

  systemPrompt =
    'You are a senior fullstack developer. Implement the requested feature by directly modifying project files. Do not explain — just implement.';

  buildPrompt(_input: JobInput): string {
    return `You are working on a NestJS + React (Vite) fullstack application. The project structure is:

- frontend/ — React app with Vite (TypeScript, React Router)

The frontend has a Landing page at \`frontend/src/pages/Landing.tsx\`.

TASK: Implement a reusable toast notification system.

REQUIREMENTS:

1. Toast Component & Provider:
   - Create a ToastProvider (React context) that wraps the app and manages toast state
   - Create a useToast() hook that exposes a \`showToast(message, type)\` function
   - Wrap the App with the ToastProvider in \`frontend/src/App.tsx\` or \`frontend/src/main.tsx\`

2. Toast Types and Appearance:
   - Support three toast types: "success", "error", "info"
   - Each type must have a visually distinct style:
     - Success: green background or green accent (e.g., background #22c55e or similar)
     - Error: red background or red accent (e.g., background #ef4444 or similar)
     - Info: blue background or blue accent (e.g., background #3b82f6 or similar)
   - Each toast must display the message text

3. Toast Behavior:
   - Toasts appear in a fixed position (top-right, bottom-right, or top-center of the viewport)
   - Each toast has a close/dismiss button (accessible, e.g., aria-label="Close" or "Dismiss")
   - Toasts auto-dismiss after 5 seconds
   - Multiple toasts can be visible simultaneously (stacked)
   - Each toast element must have role="alert" or role="status" for accessibility

4. Demo on Landing Page:
   - Add three buttons to the Landing page to demonstrate the toast system:
     - A button labeled "Show Success" that triggers a success toast with message "Operation completed successfully"
     - A button labeled "Show Error" that triggers an error toast with message "Something went wrong"
     - A button labeled "Show Info" that triggers an info toast with message "Here is some information"
   - Place these buttons in a visible section of the Landing page (e.g., in a "Demo" or "Notifications" section)

IMPORTANT:
- Do NOT use any third-party toast library (build from scratch)
- The toast container must be rendered as a portal or at the root level (not inside the page content flow)
- The frontend must build successfully`;
  }

  async evaluate(
    _response: string,
    _input: JobInput,
  ): Promise<{ passed: boolean; score: number; notes: string }> {
    return { passed: false, score: 0, notes: 'e2e evaluation required' };
  }

  async evaluateE2E(
    projectDir: string,
    _input: JobInput,
  ): Promise<{ passed: boolean; score: number; notes: string }> {
    const testFile = path.join(projectDir, this.playwrightTestFile);
    const result = await runE2ETests(projectDir, testFile);
    const score = result.passed
      ? 5
      : Math.round((result.passedTests / Math.max(result.totalTests, 1)) * 5);
    return {
      passed: result.passed,
      score: Math.min(score, 5),
      notes:
        result.errorMessage ||
        result.output ||
        (result.passed
          ? 'All e2e tests passed'
          : `${result.passedTests}/${result.totalTests} tests passed`),
    };
  }
}

export default new ToastNotificationsJob();
