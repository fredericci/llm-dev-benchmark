import { scoreWithRubric, normalizeScore } from '../../utils/rubric-scorer';
import { Job, JobInput, Language } from '../base.job';

const RUBRIC = [
  {
    name: 'Missing Error Handling',
    maxPoints: 1,
    description: 'Identifies the async operation that lacks try/catch or .catch() error handling',
  },
  {
    name: 'Missing Index',
    maxPoints: 1,
    description: 'Identifies the database query that will perform a full table scan without an index',
  },
  {
    name: 'Secret in Log',
    maxPoints: 1,
    description: 'Identifies where a secret or sensitive value is being logged to stdout/stderr',
  },
  {
    name: 'Missing Null Check',
    maxPoints: 1,
    description: 'Identifies where a null/undefined value could cause a runtime error',
  },
  {
    name: 'Actionable Suggestion',
    maxPoints: 1,
    description: 'Provides at least one concrete, specific improvement beyond the planted problems, with code example',
  },
];

export class PRImpactJob implements Job {
  id = 'j15';
  name = 'PR Impact Analysis';
  description = 'Review a PR diff and identify all planted problems plus provide actionable suggestions';
  supportedLanguages: Language[] = ['nodejs', 'java', 'dotnet'];
  evaluationType = 'rubric' as const;
  maxTurns = 1;

  systemPrompt =
    'You are a senior engineer reviewing a pull request. Be specific and actionable.';

  buildPrompt(input: JobInput): string {
    return `Review the following PR diff as a senior engineer.

Provide:
1. SUMMARY: What does this PR accomplish? (2-3 sentences)
2. PRODUCTION RISKS: Specific scenarios that could break in production
3. MISSING TEST COVERAGE: What cases are not tested that should be?
4. SECURITY CONCERNS: Any security implications?
5. PERFORMANCE IMPACT: Any operations that could degrade under load?
6. TOP 3 SUGGESTIONS: Concrete improvements with code examples
7. VERDICT: APPROVE | REQUEST_CHANGES | NEEDS_DISCUSSION — with one-sentence justification

PR DIFF:
${input.fixtureCode}`;
  }

  async evaluate(
    response: string,
    _input: JobInput,
  ): Promise<{ passed: boolean; score: number; notes: string }> {
    const result = await scoreWithRubric(this.id, this.name, response, RUBRIC);
    const score = normalizeScore(result.total, result.maxTotal);

    return {
      passed: result.total >= 3,
      score,
      notes: result.summary,
    };
  }
}

export default new PRImpactJob();
