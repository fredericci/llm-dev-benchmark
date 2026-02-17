import { scoreWithRubric, normalizeScore } from '../../utils/rubric-scorer';
import { Job, JobInput, Language } from '../base.job';

const RUBRIC = [
  {
    name: 'Bottleneck Identification',
    maxPoints: 2,
    description: 'Correctly identifies DB connection pool exhaustion (98/100) as the primary bottleneck AND cites the slow query log data as evidence',
  },
  {
    name: 'Immediate Fix',
    maxPoints: 2,
    description: 'Proposes a concrete, actionable immediate fix: configuring connection pool size AND adding index to the full-scan query',
  },
  {
    name: 'Monitoring Metrics',
    maxPoints: 1,
    description: 'Specifies 3 concrete, measurable metrics to confirm the fix worked (e.g., active connections, p99 latency, query execution time)',
  },
];

export class PerformanceDiagnosisJob implements Job {
  id = 'j18';
  name = 'Performance Diagnosis';
  description = 'Diagnose a production performance problem from metrics and slow query logs';
  supportedLanguages: Language[] = ['nodejs', 'java', 'dotnet'];
  evaluationType = 'rubric' as const;
  maxTurns = 1;

  systemPrompt =
    'You are a performance engineer. Be specific — reference actual data from the logs.';

  buildPrompt(input: JobInput): string {
    return `Diagnose the performance problem based on the data below.

APPLICATION METRICS:
- p99 latency: 4.2s (SLA: 500ms)
- CPU utilization: 28% average
- Memory: 61% average
- DB connection pool: 98/100 (near exhaustion)
- Error rate: 2.3% (mostly timeouts)

SLOW QUERY LOG (queries > 500ms, last 1 hour):
${input.fixtureCode}

Provide:
PRIMARY BOTTLENECK: <what it is and evidence from the data>
CONTRIBUTING FACTORS: <other issues making it worse>
IMMEDIATE FIX: <highest-impact change, can be done today>
LONG-TERM FIX: <architectural change for sustained improvement>
MONITORING: <3 specific metrics to confirm the fix worked>`;
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

export default new PerformanceDiagnosisJob();
