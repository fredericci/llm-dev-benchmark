/**
 * Job Registry — single source of truth for all benchmark jobs.
 * To add a new job: create src/jobs/jNN-name/index.ts and add an import here.
 * No other file needs to change.
 */
import { Job } from './base.job';

import j01 from './j01-code-generation';
import j02 from './j02-refactoring';
import j03 from './j03-bug-fix';
import j04 from './j04-test-generation';
import j05 from './j05-security-review';
import j06 from './j06-architecture';
import j07 from './j07-documentation';
import j08 from './j08-migration';
import j09 from './j09-debugging';
import j10 from './j10-performance';
import j11 from './j11-scaffold';
import j12 from './j12-codebase-explain';
import j13 from './j13-feature-from-issue';
import j14 from './j14-cicd-pipeline';
import j15 from './j15-pr-impact';
import j16 from './j16-sync-to-async';
import j17 from './j17-db-migration';
import j18 from './j18-performance-diagnosis';
import j19 from './j19-seed-data';
import j20 from './j20-ci-failure';
import j21 from './j21-accessible-dropdown';
import j22 from './j22-debounce-search';
import j23 from './j23-multistep-form';
import j24 from './j24-optimistic-update';
import j25 from './j25-async-state';
import j26 from './j26-login-page';
import j27 from './j27-avatar-menu';
import j28 from './j28-dark-mode';
import j29 from './j29-data-table';
import j30 from './j30-toast-notifications';
import j31 from './j31-form-validation';

const ALL_JOBS: Job[] = [
  j01, j02, j03, j04, j05,
  j06, j07, j08, j09, j10,
  j11, j12, j13, j14, j15,
  j16, j17, j18, j19, j20,
  j21, j22, j23, j24, j25,
  j26, j27, j28, j29, j30, j31,
];

const JOB_MAP = new Map<string, Job>(ALL_JOBS.map((j) => [j.id, j]));

export function getJob(id: string): Job | undefined {
  return JOB_MAP.get(id);
}

export function getAllJobs(): Job[] {
  return ALL_JOBS;
}

export function resolveJobs(ids: string[]): Job[] {
  if (ids.length === 1 && ids[0] === 'all') {
    return ALL_JOBS;
  }
  return ids.map((id) => {
    const job = JOB_MAP.get(id);
    if (!job) throw new Error(`Unknown job: ${id}. Run 'list-jobs' to see available jobs.`);
    return job;
  });
}
