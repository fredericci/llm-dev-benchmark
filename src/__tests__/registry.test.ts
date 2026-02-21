import { getJob, getAllJobs, resolveJobs } from '../jobs/registry';

describe('getJob', () => {
  it('returns the job for a valid ID', () => {
    const job = getJob('j01');
    expect(job).toBeDefined();
    expect(job?.id).toBe('j01');
  });

  it('returns undefined for an unknown job ID', () => {
    expect(getJob('j99')).toBeUndefined();
    expect(getJob('unknown')).toBeUndefined();
    expect(getJob('')).toBeUndefined();
  });

  it('returns jobs for all IDs j01 through j31', () => {
    for (let i = 1; i <= 31; i++) {
      const id = `j${String(i).padStart(2, '0')}`;
      const job = getJob(id);
      expect(job).toBeDefined();
      expect(job?.id).toBe(id);
    }
  });

  it('returns a job with required fields', () => {
    const job = getJob('j01');
    expect(job).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      description: expect.any(String),
      supportedLanguages: expect.any(Array),
      evaluationType: expect.any(String),
      maxTurns: expect.any(Number),
    });
  });
});

describe('getAllJobs', () => {
  it('returns an array of exactly 31 jobs', () => {
    const jobs = getAllJobs();
    expect(jobs).toHaveLength(31);
  });

  it('contains jobs with IDs from j01 to j31', () => {
    const jobs = getAllJobs();
    const ids = jobs.map((j) => j.id);
    for (let i = 1; i <= 31; i++) {
      expect(ids).toContain(`j${String(i).padStart(2, '0')}`);
    }
  });

  it('returns jobs with valid evaluationType values', () => {
    const validTypes = ['test-execution', 'rubric', 'hybrid', 'e2e'];
    const jobs = getAllJobs();
    jobs.forEach((job) => {
      expect(validTypes).toContain(job.evaluationType);
    });
  });

  it('returns jobs where supportedLanguages is non-empty', () => {
    const jobs = getAllJobs();
    jobs.forEach((job) => {
      expect(job.supportedLanguages.length).toBeGreaterThan(0);
    });
  });

  it('returns jobs with maxTurns of at least 1', () => {
    const jobs = getAllJobs();
    jobs.forEach((job) => {
      expect(job.maxTurns).toBeGreaterThanOrEqual(1);
    });
  });

  it('returns jobs with buildPrompt and evaluate functions', () => {
    const jobs = getAllJobs();
    jobs.forEach((job) => {
      expect(typeof job.buildPrompt).toBe('function');
      expect(typeof job.evaluate).toBe('function');
    });
  });
});

describe('resolveJobs', () => {
  it("returns all jobs when ids is ['all']", () => {
    const jobs = resolveJobs(['all']);
    expect(jobs).toHaveLength(31);
  });

  it('returns the specified job for a single valid ID', () => {
    const jobs = resolveJobs(['j01']);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].id).toBe('j01');
  });

  it('returns multiple jobs for multiple valid IDs', () => {
    const jobs = resolveJobs(['j01', 'j05', 'j10']);
    expect(jobs).toHaveLength(3);
    expect(jobs.map((j) => j.id)).toEqual(['j01', 'j05', 'j10']);
  });

  it('throws for an unknown job ID', () => {
    expect(() => resolveJobs(['j99'])).toThrow(/unknown job/i);
  });

  it('throws with a helpful message including the unknown ID', () => {
    expect(() => resolveJobs(['xyz'])).toThrow('xyz');
  });

  it('throws when one ID in a list is invalid', () => {
    expect(() => resolveJobs(['j01', 'invalid', 'j03'])).toThrow(/unknown job/i);
  });

  it('preserves order of requested IDs', () => {
    const jobs = resolveJobs(['j05', 'j01', 'j03']);
    expect(jobs.map((j) => j.id)).toEqual(['j05', 'j01', 'j03']);
  });

  it('handles empty array', () => {
    const jobs = resolveJobs([]);
    expect(jobs).toEqual([]);
  });
});
