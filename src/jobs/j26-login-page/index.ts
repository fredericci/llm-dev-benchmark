import * as path from 'path';
import { FullstackJob, JobInput, Language } from '../base.job';
import { runE2ETests } from '../../utils/e2e-runner';

export class LoginPageJob implements FullstackJob {
  id = 'j26';
  name = 'Fullstack - Login Page';
  description = 'Implement login form with auth endpoint, JWT, and redirect';
  supportedLanguages: Language[] = ['nodejs'];
  evaluationType = 'e2e' as const;
  maxTurns = 3;
  baseProjectPath = 'fullstack/base-project';
  playwrightTestFile = 'e2e/tests/j26-login.spec.ts';

  systemPrompt =
    'You are a senior fullstack developer. Implement the requested feature by directly modifying project files. Do not explain — just implement.';

  buildPrompt(_input: JobInput): string {
    return `You are working on a NestJS + React (Vite) fullstack application. The project structure is:

- backend/ — NestJS API server (TypeScript, TypeORM, SQLite)
- frontend/ — React app with Vite (TypeScript, React Router)

The database already has a \`User\` entity at \`backend/src/users/user.entity.ts\` with fields:
id, name, email, password (bcrypt-hashed), avatar, role, createdAt.

There are seeded users in the database. The test user credentials are:
- Email: admin@example.com / Password: Admin123!
- Email: jane@example.com / Password: Jane123!

TASK: Implement a complete login system with the following requirements:

BACKEND:
1. Create an auth module at \`backend/src/auth/\` with:
   - \`auth.module.ts\` — imports UsersModule, registers JwtModule
   - \`auth.service.ts\` — validates credentials against the database using bcrypt
   - \`auth.controller.ts\` — POST /api/auth/login endpoint
2. The login endpoint accepts \`{ email, password }\` and returns \`{ access_token, user: { id, name, email, avatar } }\`
3. On invalid credentials, return HTTP 401 with \`{ message: "Invalid credentials" }\`
4. Use the \`jsonwebtoken\` or \`@nestjs/jwt\` package for token generation
5. Register the AuthModule in \`app.module.ts\`

FRONTEND:
1. Create a Login page at \`frontend/src/pages/Login.tsx\`
2. The login form must have:
   - An email input field (type="email")
   - A password input field (type="password")
   - A submit button with text "Login" or "Sign In"
3. On form submission, POST to /api/auth/login
4. On success: store the JWT token in localStorage (key: "token"), store user data in localStorage (key: "user"), and redirect to the home page "/"
5. On failure: display the error message from the API response below the form
6. Add a route for /login in the React Router configuration in \`frontend/src/App.tsx\`

IMPORTANT:
- Install any required npm packages in the appropriate directory (backend/ or frontend/)
- Make sure the backend compiles without TypeScript errors
- The frontend must build successfully with \`npm run build\``;
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

export default new LoginPageJob();
