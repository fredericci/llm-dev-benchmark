import * as path from 'path';
import { runTests } from '../../utils/code-runner';
import { Job, JobInput, Language } from '../base.job';

const MIGRATION_CONFIG: Record<Language, { library: string; oldVersion: string; newVersion: string; breakingChanges: string }> = {
  nodejs: {
    library: 'axios',
    oldVersion: '0.27',
    newVersion: '1.x',
    breakingChanges: `1. Error handling changed: AxiosError is now a class, check error.response directly
2. Interceptors: request interceptors now receive and must return the full config object
3. Deprecated axios.create() options moved under adapter key
4. TypeScript: AxiosRequestConfig renamed to InternalAxiosRequestConfig in interceptors`,
  },
  java: {
    library: 'Spring Boot',
    oldVersion: '2.7',
    newVersion: '3.x',
    breakingChanges: `1. javax.* imports replaced with jakarta.*
2. WebSecurityConfigurerAdapter removed — use SecurityFilterChain bean instead
3. Spring Security: antMatchers() replaced with requestMatchers()
4. spring.security.oauth2 config key changes`,
  },
  dotnet: {
    library: 'Entity Framework Core',
    oldVersion: '6',
    newVersion: '8',
    breakingChanges: `1. Bulk operations: ExecuteUpdateAsync/ExecuteDeleteAsync replace SaveChanges loops
2. Conventions: ConfigureConventions replaces manual type configuration
3. JSON columns: now natively supported via OwnsMany with ToJson()
4. DateOnly/TimeOnly now supported as column types`,
  },
};

export class MigrationJob implements Job {
  id = 'j08';
  name = 'Migration - Breaking Dependency Changes';
  description = 'Migrate code to a new major version of a library with breaking changes';
  supportedLanguages: Language[] = ['nodejs', 'java', 'dotnet'];
  evaluationType = 'test-execution' as const;
  maxTurns = 1;

  systemPrompt =
    'You are a senior engineer performing a library upgrade. Respond with migrated code only.';

  buildPrompt(input: JobInput): string {
    const config = MIGRATION_CONFIG[input.language];

    return `Migrate the code from the old version to the new version of the library.

LIBRARY: ${config.library}
OLD VERSION: ${config.oldVersion}
NEW VERSION: ${config.newVersion}

BREAKING CHANGES TO ADDRESS:
${config.breakingChanges}

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

    const testDir = path.join(process.cwd(), 'fixtures', 'nodejs', 'j08', 'tests');
    const result = await runTests(response, input.language, testDir, 'http-client.js');

    return {
      passed: result.passed,
      score: result.passed ? 5 : 1,
      notes: result.output || result.errorMessage || '',
    };
  }
}

export default new MigrationJob();
