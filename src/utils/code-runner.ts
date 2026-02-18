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
 * Handles fenced code blocks for JS, TS, Java, C#, and plain code.
 */
export function extractCodeFromResponse(response: string): string {
  // Try to extract from fenced code block
  const fencedMatch = response.match(/```(?:javascript|typescript|js|ts|jsx|tsx|java|csharp|cs|c#)?\n([\s\S]*?)```/);
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
 * Run Java tests using Maven + JUnit 5.
 * Writes the model response as the implementation file under src/main/java/,
 * runs `mvn test`, and parses Surefire XML reports.
 */
export async function runJavaTests(
  responseCode: string,
  testDir: string,
  implFileName: string,
): Promise<CodeRunResult> {
  const implPath = path.join(testDir, 'src', 'main', 'java', implFileName);

  try {
    const code = extractCodeFromResponse(responseCode);
    fs.writeFileSync(implPath, code, 'utf-8');

    // Clean previous test results
    const surefireDir = path.join(testDir, 'target', 'surefire-reports');
    try { fs.rmSync(surefireDir, { recursive: true, force: true }); } catch { /* ignore */ }

    const result = spawnSync(
      'mvn',
      ['test', '-q', '-B', '-Dstyle.color=never'],
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

    // Try to parse Surefire XML reports
    try {
      if (fs.existsSync(surefireDir)) {
        const reportFiles = fs.readdirSync(surefireDir).filter(f => f.startsWith('TEST-') && f.endsWith('.xml'));
        let totalTests = 0;
        let totalFailures = 0;
        let totalErrors = 0;

        for (const file of reportFiles) {
          const xml = fs.readFileSync(path.join(surefireDir, file), 'utf-8');
          totalTests += parseInt(xml.match(/tests="(\d+)"/)?.[1] ?? '0');
          totalFailures += parseInt(xml.match(/failures="(\d+)"/)?.[1] ?? '0');
          totalErrors += parseInt(xml.match(/errors="(\d+)"/)?.[1] ?? '0');
        }

        if (totalTests > 0) {
          const passed = totalFailures === 0 && totalErrors === 0;
          const failed = totalFailures + totalErrors;
          const notes = passed
            ? `All ${totalTests} tests passed`
            : `${failed}/${totalTests} tests failed`;
          return { passed, output: notes };
        }
      }
    } catch {
      // fall through to raw output
    }

    const passed = result.status === 0;
    return {
      passed,
      output: stdout.slice(0, 2000),
      errorMessage: passed ? undefined : (stderr || stdout).slice(0, 500),
    };
  } catch (err) {
    return {
      passed: false,
      output: '',
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  } finally {
    try { fs.unlinkSync(implPath); } catch { /* ignore */ }
  }
}

/**
 * Run .NET Core tests using dotnet test + xUnit.
 * Writes the model response as the implementation file,
 * runs `dotnet test`, and parses console output.
 */
export async function runDotnetTests(
  responseCode: string,
  testDir: string,
  implFileName: string,
): Promise<CodeRunResult> {
  const implPath = path.join(testDir, implFileName);

  try {
    const code = extractCodeFromResponse(responseCode);
    fs.writeFileSync(implPath, code, 'utf-8');

    const result = spawnSync(
      'dotnet',
      ['test', '--nologo', '--verbosity', 'quiet'],
      {
        cwd: testDir,
        timeout: TEST_TIMEOUT_MS,
        encoding: 'utf-8',
        env: { ...process.env, CI: 'true', DOTNET_CLI_TELEMETRY_OPTOUT: '1' },
      },
    );

    const stdout = result.stdout ?? '';
    const stderr = result.stderr ?? '';

    if (result.status === null) {
      return { passed: false, output: stderr, errorMessage: 'Test execution timeout' };
    }

    // Try to parse dotnet test summary output
    const combined = stdout + '\n' + stderr;
    try {
      // Format: "Passed: X, Failed: Y, Skipped: Z, Total: T"
      const summaryMatch = combined.match(/Passed[:\s]+(\d+).*Failed[:\s]+(\d+).*Total[:\s]+(\d+)/i);
      if (summaryMatch) {
        const passedCount = parseInt(summaryMatch[1]);
        const failedCount = parseInt(summaryMatch[2]);
        const totalCount = parseInt(summaryMatch[3]);
        const passed = failedCount === 0 && totalCount > 0;
        const notes = passed
          ? `All ${passedCount} tests passed`
          : `${failedCount}/${totalCount} tests failed`;
        return { passed, output: notes };
      }

      // Alternative format: "Total tests: X. Passed: Y. Failed: Z."
      const altMatch = combined.match(/Total tests:\s*(\d+)\.\s*Passed:\s*(\d+)\.\s*Failed:\s*(\d+)/i);
      if (altMatch) {
        const totalCount = parseInt(altMatch[1]);
        const passedCount = parseInt(altMatch[2]);
        const failedCount = parseInt(altMatch[3]);
        const passed = failedCount === 0 && totalCount > 0;
        const notes = passed
          ? `All ${passedCount} tests passed`
          : `${failedCount}/${totalCount} tests failed`;
        return { passed, output: notes };
      }
    } catch {
      // fall through to raw output
    }

    const passed = result.status === 0;
    return {
      passed,
      output: stdout.slice(0, 2000),
      errorMessage: passed ? undefined : (stderr || stdout).slice(0, 500),
    };
  } catch (err) {
    return {
      passed: false,
      output: '',
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  } finally {
    try { fs.unlinkSync(implPath); } catch { /* ignore */ }
  }
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
      return runJavaTests(responseCode, testDir, implFileName);
    case 'dotnet':
      return runDotnetTests(responseCode, testDir, implFileName);
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
