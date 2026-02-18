import * as path from 'path';
import { runTests } from '../../utils/code-runner';
import { Job, JobInput, Language } from '../base.job';

export class CodeGenerationJob implements Job {
  id = 'j01';
  name = 'Code Generation - REST API';
  description = 'Generate a POST /users endpoint with validation (name, email, password)';
  supportedLanguages: Language[] = ['nodejs', 'java', 'dotnet'];
  evaluationType = 'test-execution' as const;
  maxTurns = 1;

  systemPrompt =
    'You are a senior backend developer. Respond with code only. No explanations, no markdown prose, no preamble.';

  buildPrompt(input: JobInput): string {
    const frameworkMap: Record<Language, string> = {
      nodejs: 'Express.js',
      java: 'Spring Boot',
      dotnet: 'ASP.NET Core',
    };
    const framework = frameworkMap[input.language];

    return `Generate a complete POST /users endpoint.

Requirements:
- name: required, min 2 chars
- email: valid format, must be checked for uniqueness against existing users array
- password: min 8 chars, at least 1 uppercase letter, at least 1 number
- Return 201 with created user object (excluding password field) on success
- Return 400 with array of validation error strings on failure
- Return 409 with message "Email already exists" if duplicate

LANGUAGE: ${input.language}
FRAMEWORK: ${framework}

EXISTING BASE CODE:
${input.fixtureCode}

Return ONLY the implementation file. Tests must pass when run against it.`;
  }

  async evaluate(
    response: string,
    input: JobInput,
  ): Promise<{ passed: boolean; score: number; notes: string }> {
    const implFileMap: Record<Language, string> = {
      nodejs: 'users.js',
      java: 'Users.java',
      dotnet: 'Users.cs',
    };
    const testDir = path.join(process.cwd(), 'fixtures', input.language, 'j01', 'tests');
    const result = await runTests(response, input.language, testDir, implFileMap[input.language]);

    return {
      passed: result.passed,
      score: result.passed ? 5 : Math.max(0, 2),
      notes: result.output || result.errorMessage || '',
    };
  }
}

export default new CodeGenerationJob();
