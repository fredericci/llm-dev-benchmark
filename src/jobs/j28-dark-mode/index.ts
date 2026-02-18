import * as path from 'path';
import { FullstackJob, JobInput, Language } from '../base.job';
import { runE2ETests } from '../../utils/e2e-runner';

export class DarkModeJob implements FullstackJob {
  id = 'j28';
  name = 'Fullstack - Dark Mode';
  description = 'Implement dark mode toggle with theme persistence';
  supportedLanguages: Language[] = ['nodejs'];
  evaluationType = 'e2e' as const;
  maxTurns = 3;
  baseProjectPath = 'fullstack/base-project';
  playwrightTestFile = 'e2e/tests/j28-dark-mode.spec.ts';

  systemPrompt =
    'You are a senior fullstack developer. Implement the requested feature by directly modifying project files. Do not explain — just implement.';

  buildPrompt(_input: JobInput): string {
    return `You are working on a NestJS + React (Vite) fullstack application. The project structure is:

- backend/ — NestJS API server
- frontend/ — React app with Vite (TypeScript, React Router)

The frontend has a global CSS file at \`frontend/src/styles/global.css\` with CSS custom properties (variables) for colors, and a Header component at \`frontend/src/components/Header.tsx\`.

TASK: Implement a dark mode toggle with theme persistence.

REQUIREMENTS:

1. CSS Theme System:
   - Define CSS custom properties on :root for the light theme (default):
     --bg-color: #ffffff (or similar light color)
     --text-color: #1a1a1a (or similar dark color)
     --header-bg: a distinguishable header background color
   - Define the same variables with dark values under [data-theme="dark"] or .dark-mode on the html/body:
     --bg-color: #1a1a1a (or similar dark color)
     --text-color: #f0f0f0 (or similar light color)
     --header-bg: a distinguishable dark header background
   - Apply these variables to body (background-color, color) and to the header

2. Toggle Button:
   - Add a toggle button in the Header component
   - The button must be visible and accessible (use a button element)
   - The button text or icon should indicate the current mode (e.g., show a moon icon/text when in light mode, sun when in dark mode, or "Dark Mode" / "Light Mode")
   - Use aria-label to describe the action (e.g., "Switch to dark mode" or "Toggle dark mode")

3. State Management:
   - When the toggle is clicked, add/remove the data-theme="dark" attribute on the <html> element (or toggle a class on <body>)
   - The background color and text color of the page must visually change

4. Persistence:
   - Save the user's preference in localStorage (key: "theme" with value "dark" or "light")
   - On page load, read localStorage and apply the saved theme BEFORE the page renders (to avoid flash)
   - If no saved preference exists, default to light mode

IMPORTANT:
- Do NOT break existing styles or layout
- The toggle must be a <button> element (not a checkbox or link)
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

export default new DarkModeJob();
