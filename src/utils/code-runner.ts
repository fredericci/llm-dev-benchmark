import { execSync, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Language } from '../jobs/base.job';

export interface CodeRunResult {
  passed: boolean;
  output: string;
  errorMessage?: string;
}

const TEST_TIMEOUT_MS = 60_000;

/**
 * Extract the first code block from a model response.
 * Handles ```js, ```javascript, ```typescript, ```ts, and plain code.
 */
export function extractCodeFromResponse(response: string): string {
  // Try to extract from fenced code block
  const fencedMatch = response.match(/```(?:javascript|typescript|js|ts|jsx|tsx)?\n([\s\S]*?)```/);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  // If no fence, return the whole response trimmed
  return response.trim();
}

/**
 * Run Node.js tests using Jest.
 * Writes the model response as the implementation file, then runs the pre-existing test suite.
 *
 * @param responseCode   The code returned by the model
 * @param testDir        A directory that already contains package.json + test files
 * @param implFileName   The filename the test suite imports from (e.g. 'users.js')
 */
export async function runNodejsTests(
  responseCode: string,
  testDir: string,
  implFileName: string,
): Promise<CodeRunResult> {
  const implPath = path.join(testDir, implFileName);

  try {
    const code = extractCodeFromResponse(responseCode);
    fs.writeFileSync(implPath, code, 'utf-8');

    const result = spawnSync(
      'npx',
      ['jest', '--json', '--forceExit', '--testTimeout=30000'],
      {
        cwd: testDir,
        timeout: TEST_TIMEOUT_MS,
        encoding: 'utf-8',
        env: { ...process.env, CI: 'true' },
      },
    );

    const stdout = result.stdout ?? '';
    const stderr = result.stderr ?? '';

    if (result.status === null) {
      return { passed: false, output: stderr, errorMessage: 'Test execution timeout' };
    }

    // Try to parse Jest JSON output
    try {
      const jsonStart = stdout.indexOf('{');
      if (jsonStart !== -1) {
        const jestResult = JSON.parse(stdout.slice(jsonStart));
        const passed = jestResult.success === true && jestResult.numFailedTests === 0;
        const notes = passed
          ? `All ${jestResult.numPassedTests} tests passed`
          : `${jestResult.numFailedTests}/${jestResult.numTotalTests} tests failed`;
        return { passed, output: notes };
      }
    } catch {
      // fall through to raw output
    }

    const passed = result.status === 0;
    return {
      passed,
      output: stdout.slice(0, 2000),
      errorMessage: passed ? undefined : stderr.slice(0, 500),
    };
  } catch (err) {
    return {
      passed: false,
      output: '',
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  } finally {
    // Clean up the written implementation file
    try { fs.unlinkSync(implPath); } catch { /* ignore */ }
  }
}

/**
 * Java test runner stub — returns rubric-style result since Maven is not guaranteed to be available.
 */
export async function runJavaTests(_responseCode: string, _testDir: string): Promise<CodeRunResult> {
  return {
    passed: false,
    output: '',
    errorMessage: 'Java test execution not implemented in this environment (stub)',
  };
}

/**
 * .NET test runner stub.
 */
export async function runDotnetTests(_responseCode: string, _testDir: string): Promise<CodeRunResult> {
  return {
    passed: false,
    output: '',
    errorMessage: '.NET test execution not implemented in this environment (stub)',
  };
}

/**
 * Dispatch to the correct test runner based on language.
 */
export async function runTests(
  responseCode: string,
  language: Language,
  testDir: string,
  implFileName: string,
): Promise<CodeRunResult> {
  switch (language) {
    case 'nodejs':
      return runNodejsTests(responseCode, testDir, implFileName);
    case 'java':
      return runJavaTests(responseCode, testDir);
    case 'dotnet':
      return runDotnetTests(responseCode, testDir);
    default:
      return { passed: false, output: '', errorMessage: `Unsupported language: ${language}` };
  }
}

/**
 * Check if a CLI binary is available in PATH. Returns version string or null.
 */
export function checkBinaryAvailable(binary: string): string | null {
  try {
    const result = execSync(`${binary} --version 2>&1`, { timeout: 5000, encoding: 'utf-8' });
    return result.trim();
  } catch {
    return null;
  }
}
