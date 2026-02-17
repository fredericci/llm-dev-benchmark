import { Job, JobInput } from './jobs/base.job';

export interface EvaluationResult {
  passed: boolean;
  score: number;
  notes: string;
  errorMessage?: string;
}

/**
 * Evaluator dispatches evaluation to the appropriate strategy based on job.evaluationType.
 * All evaluation paths go through job.evaluate(), which internally routes to
 * code-runner (test-execution), rubric-scorer (rubric), or both (hybrid).
 */
export class Evaluator {
  async evaluate(job: Job, response: string, input: JobInput): Promise<EvaluationResult> {
    try {
      const result = await job.evaluate(response, input);
      return {
        passed: result.passed,
        score: result.score,
        notes: result.notes,
      };
    } catch (err) {
      return {
        passed: false,
        score: 0,
        notes: '',
        errorMessage: `Evaluation error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}
