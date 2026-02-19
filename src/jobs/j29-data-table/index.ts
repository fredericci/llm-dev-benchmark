import * as path from 'path';
import { FullstackJob, JobInput, Language } from '../base.job';
import { runE2ETests } from '../../utils/e2e-runner';

export class DataTableJob implements FullstackJob {
  id = 'j29';
  name = 'Fullstack - Data Table';
  description = 'Implement data table with server-side pagination and sorting';
  supportedLanguages: Language[] = ['nodejs'];
  evaluationType = 'e2e' as const;
  maxTurns = 3;
  baseProjectPath = 'fullstack/base-project';
  playwrightTestFile = 'e2e/tests/j29-data-table.spec.ts';

  systemPrompt =
    'You are a senior fullstack developer. Implement the requested feature by directly modifying project files. Do not explain — just implement.';

  buildPrompt(_input: JobInput): string {
    return `You are working on a NestJS + React (Vite) fullstack application. The project structure is:

- backend/ — NestJS API server (TypeScript, TypeORM, SQLite)
- frontend/ — React app with Vite (TypeScript, React Router)

The database has a \`User\` entity with fields: id, name, email, avatar, role, createdAt.
The \`UsersController\` already exists at \`backend/src/users/users.controller.ts\` with GET /api/users.
The database is seeded with 20 users.

TASK: Implement a data table page with server-side pagination and column sorting.

BACKEND:
1. Modify the existing GET /api/users endpoint (or create a new one) to support pagination and sorting with these query parameters:
   - \`page\` (number, default: 1) — current page number
   - \`limit\` (number, default: 10) — items per page
   - \`sort\` (string, default: "name") — column to sort by (name, email, role, createdAt)
   - \`order\` (string, default: "ASC") — sort direction: ASC or DESC
2. Return the response in this format:
   {
     "data": [...users],
     "total": <total count>,
     "page": <current page>,
     "limit": <items per page>,
     "totalPages": <total pages>
   }

FRONTEND:
1. Create a Users page at \`frontend/src/pages/Users.tsx\`
2. Add a route for /users in \`frontend/src/App.tsx\`
3. Add a "Users" link in the Header navigation

4. The Users page must have a data table with:
   - Columns: Name, Email, Role, Created At
   - Each column header is clickable for sorting
   - Clicking a column header toggles sort direction (ASC → DESC → ASC)
   - Visual indicator showing which column is sorted and the direction (e.g., ▲ or ▼ arrow)

5. Pagination controls below the table:
   - "Previous" button (disabled on first page)
   - "Next" button (disabled on last page)
   - Display current page info: "Page X of Y" or "Showing X-Y of Z"
   - Each page shows 10 users

6. Fetch data from the API whenever page or sort changes
7. Show a loading state while fetching data

IMPORTANT:
- Install any required npm packages in the appropriate directory
- The frontend must build successfully
- The backend must compile without TypeScript errors`;
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

export default new DataTableJob();
