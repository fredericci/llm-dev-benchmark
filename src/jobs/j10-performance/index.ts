import { scoreWithRubric, normalizeScore } from '../../utils/rubric-scorer';
import { Job, JobInput, Language } from '../base.job';

const RUBRIC = [
  {
    name: 'Problem Identification',
    maxPoints: 2,
    description: 'Correctly identifies N+1 query pattern with accurate formula (1 + N + N for orders, items, and customers) and explains why it happens',
  },
  {
    name: 'Optimized Solution',
    maxPoints: 2,
    description: 'Provides a working implementation using eager loading, joins, or DataLoader that reduces queries to ≤3 regardless of N',
  },
  {
    name: 'Quantified Improvement',
    maxPoints: 1,
    description: 'States concrete query count before vs after at N=100 (e.g., "201 → 3 queries")',
  },
];

export class PerformanceJob implements Job {
  id = 'j10';
  name = 'Performance - N+1 Query';
  description = 'Identify and fix the N+1 query problem in ORM code';
  supportedLanguages: Language[] = ['nodejs', 'java', 'dotnet'];
  evaluationType = 'hybrid' as const;
  maxTurns = 1;

  systemPrompt = 'You are a database performance expert.';

  buildPrompt(input: JobInput): string {
    const ormMap: Record<Language, string> = {
      nodejs: 'Sequelize',
      java: 'Hibernate/JPA',
      dotnet: 'Entity Framework Core',
    };
    const orm = ormMap[input.language];

    return `The following code causes excessive database queries due to the N+1 problem.

Respond with:
PROBLEM: <how many queries execute for N orders, with formula>
SOLUTION: <optimized implementation using eager loading / joins>
QUERY COUNT AFTER FIX: <new formula>
ESTIMATED IMPROVEMENT: <at N=100 orders, queries before vs after>

ORM: ${orm}
LANGUAGE: ${input.language}

CODE:
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

export default new PerformanceJob();
