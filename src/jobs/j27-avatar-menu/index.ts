import * as path from 'path';
import { FullstackJob, JobInput, Language } from '../base.job';
import { runE2ETests } from '../../utils/e2e-runner';

export class AvatarMenuJob implements FullstackJob {
  id = 'j27';
  name = 'Fullstack - Avatar Menu';
  description = 'Implement user avatar dropdown menu with auth flow';
  supportedLanguages: Language[] = ['nodejs'];
  evaluationType = 'e2e' as const;
  maxTurns = 3;
  baseProjectPath = 'fullstack/base-project';
  playwrightTestFile = 'e2e/tests/j27-avatar-menu.spec.ts';

  systemPrompt =
    'You are a senior fullstack developer. Implement the requested feature by directly modifying project files. Do not explain — just implement.';

  buildPrompt(_input: JobInput): string {
    return `You are working on a NestJS + React (Vite) fullstack application. The project structure is:

- backend/ — NestJS API server (TypeScript, TypeORM, SQLite)
- frontend/ — React app with Vite (TypeScript, React Router)

The database has a \`User\` entity with fields: id, name, email, password (bcrypt-hashed), avatar, role, createdAt.

Seeded test user credentials:
- Email: admin@example.com / Password: Admin123!

TASK: Implement a user avatar dropdown menu in the application header and a basic authentication flow to support it.

BACKEND:
1. If no auth endpoint exists, create POST /api/auth/login that accepts \`{ email, password }\`, validates with bcrypt against the database, and returns \`{ access_token, user: { id, name, email, avatar } }\`
2. Create GET /api/auth/me endpoint that accepts a Bearer token in the Authorization header, decodes the JWT, and returns the current user's \`{ id, name, email, avatar, role }\`
3. On invalid/missing token, return HTTP 401

FRONTEND:
1. Implement authentication state management:
   - Store JWT token in localStorage (key: "token") and user data (key: "user")
   - Create a way to check if the user is logged in (e.g., React context, hook, or simple localStorage check)

2. Create a Login page at /login if one doesn't exist:
   - Email + password form, POST to /api/auth/login
   - On success, store token and user in localStorage, redirect to /

3. Modify the Header component (\`frontend/src/components/Header.tsx\`):
   - When NOT logged in: show a "Login" link pointing to /login
   - When logged in: hide the "Login" link and show an avatar button instead
   - The avatar button should display the user's avatar image (or initials if no avatar URL)
   - Clicking the avatar button opens a dropdown menu

4. The avatar dropdown menu must contain:
   - The user's name displayed as text
   - The user's email displayed as text
   - A "Profile" link/button
   - A "Logout" button that clears localStorage (token + user) and redirects to /

5. Clicking outside the dropdown should close it
6. The dropdown should have a role="menu" attribute for accessibility

IMPORTANT:
- Install any required npm packages in the appropriate directory
- The frontend must build successfully
- The backend must compile without errors`;
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

export default new AvatarMenuJob();
