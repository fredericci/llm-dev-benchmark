import { spawnSync, spawn, ChildProcess } from 'child_process';
import * as net from 'net';
import * as path from 'path';
import * as http from 'http';

export interface E2ERunResult {
  passed: boolean;
  output: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  errorMessage?: string;
}

const SERVER_READY_TIMEOUT_MS = 30_000;
const PLAYWRIGHT_TIMEOUT_MS = 120_000;
const NPM_INSTALL_TIMEOUT_MS = 120_000;
const BUILD_TIMEOUT_MS = 120_000;

/**
 * Find a free TCP port for the server.
 * Needed for parallel execution of multiple fullstack jobs.
 */
async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const port = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

/**
 * Wait for the HTTP server to respond at the given URL.
 */
async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise<void>((resolve, reject) => {
        const req = http.get(url, (res) => {
          res.resume();
          resolve();
        });
        req.on('error', reject);
        req.setTimeout(2000, () => {
          req.destroy();
          reject(new Error('timeout'));
        });
      });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`Server did not start within ${timeoutMs}ms`);
}

/**
 * Parse Playwright JSON output to extract test results.
 */
function parsePlaywrightResult(
  stdout: string,
  stderr: string,
  exitCode: number | null,
): E2ERunResult {
  try {
    const jsonOutput = stdout.trim();
    if (!jsonOutput) {
      return {
        passed: false,
        output: stderr || 'No Playwright output',
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        errorMessage: stderr || 'Playwright produced no output',
      };
    }

    const result = JSON.parse(jsonOutput);
    const suites = result.suites ?? [];

    let total = 0;
    let passed = 0;
    let failed = 0;
    const failedDetails: string[] = [];

    function walkSpecs(specs: any[]) {
      for (const spec of specs) {
        if (spec.tests) {
          for (const test of spec.tests) {
            total++;
            const lastResult = test.results?.[test.results.length - 1];
            if (lastResult?.status === 'passed') {
              passed++;
            } else {
              failed++;
              const error = lastResult?.error?.message ?? 'Unknown failure';
              failedDetails.push(`FAIL: ${spec.title} > ${test.title}\n  ${error}`);
            }
          }
        }
      }
    }

    for (const suite of suites) {
      if (suite.specs) walkSpecs(suite.specs);
      if (suite.suites) {
        for (const nested of suite.suites) {
          if (nested.specs) walkSpecs(nested.specs);
        }
      }
    }

    return {
      passed: failed === 0 && total > 0,
      output: failedDetails.join('\n\n') || 'All tests passed',
      totalTests: total,
      passedTests: passed,
      failedTests: failed,
    };
  } catch {
    return {
      passed: exitCode === 0,
      output: stdout || stderr || '',
      totalTests: 0,
      passedTests: exitCode === 0 ? 1 : 0,
      failedTests: exitCode === 0 ? 0 : 1,
      errorMessage: `Failed to parse Playwright JSON output: ${stderr?.slice(0, 300)}`,
    };
  }
}

/**
 * Run Playwright e2e tests against a fullstack project directory.
 *
 * Steps:
 * 1. npm install in backend and frontend (in case agent added deps)
 * 2. Build frontend
 * 3. Start backend (serves static frontend)
 * 4. Wait for server ready
 * 5. Run Playwright tests
 * 6. Parse results
 * 7. Kill server
 */
export async function runE2ETests(
  projectDir: string,
  testFile: string,
): Promise<E2ERunResult> {
  let serverProc: ChildProcess | null = null;
  let port: number;

  try {
    port = await findFreePort();
    const backendDir = path.join(projectDir, 'backend');
    const frontendDir = path.join(projectDir, 'frontend');
    const e2eDir = path.join(projectDir, 'e2e');

    // 1. npm install in backend and frontend
    // Force NODE_ENV=development so devDependencies (vite, typescript) are installed
    const installEnv = { ...process.env, NODE_ENV: 'development' };
    for (const dir of [backendDir, frontendDir]) {
      const installResult = spawnSync('npm', ['install', '--silent'], {
        cwd: dir,
        timeout: NPM_INSTALL_TIMEOUT_MS,
        encoding: 'utf-8',
        env: installEnv,
      });
      if (installResult.status !== 0 && installResult.status !== null) {
        console.log(`  npm install warning in ${path.basename(dir)}: ${installResult.stderr?.slice(0, 200)}`);
      }
    }

    // 2. Build frontend
    const buildResult = spawnSync('npx', ['vite', 'build'], {
      cwd: frontendDir,
      timeout: BUILD_TIMEOUT_MS,
      encoding: 'utf-8',
      env: { ...process.env },
    });
    if (buildResult.status !== 0) {
      return {
        passed: false,
        output: '',
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        errorMessage: `Frontend build failed:\n${buildResult.stderr?.slice(0, 1000) || buildResult.stdout?.slice(0, 1000)}`,
      };
    }

    // 3. Build backend
    const backendBuildResult = spawnSync('npx', ['nest', 'build'], {
      cwd: backendDir,
      timeout: BUILD_TIMEOUT_MS,
      encoding: 'utf-8',
      env: { ...process.env },
    });
    if (backendBuildResult.status !== 0) {
      return {
        passed: false,
        output: '',
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        errorMessage: `Backend build failed:\n${backendBuildResult.stderr?.slice(0, 1000) || backendBuildResult.stdout?.slice(0, 1000)}`,
      };
    }

    // 4. Start backend server
    serverProc = spawn('node', ['dist/main.js'], {
      cwd: backendDir,
      env: { ...process.env, PORT: String(port), NODE_ENV: 'production' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // 5. Wait for server
    await waitForServer(`http://localhost:${port}/api/health`, SERVER_READY_TIMEOUT_MS);

    // 6. Run Playwright tests
    const pwResult = spawnSync('npx', [
      'playwright', 'test', testFile,
      '--reporter=json',
    ], {
      cwd: e2eDir,
      timeout: PLAYWRIGHT_TIMEOUT_MS,
      encoding: 'utf-8',
      env: { ...process.env, BASE_URL: `http://localhost:${port}` },
    });

    // 7. Parse results
    return parsePlaywrightResult(pwResult.stdout, pwResult.stderr, pwResult.status);

  } catch (err) {
    return {
      passed: false,
      output: '',
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      errorMessage: `E2E runner error: ${err instanceof Error ? err.message : String(err)}`,
    };
  } finally {
    // 8. Kill server
    if (serverProc) {
      serverProc.kill('SIGTERM');
      // Force kill after 5s if still running
      setTimeout(() => {
        try { serverProc?.kill('SIGKILL'); } catch { /* already dead */ }
      }, 5000);
    }
  }
}
