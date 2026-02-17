import { scoreWithRubric, normalizeScore } from '../../utils/rubric-scorer';
import { Job, JobInput, Language } from '../base.job';

const RUBRIC = [
  {
    name: 'SQL Injection',
    maxPoints: 1,
    description: 'Identify SQL injection via string concatenation with correct location and valid fix',
  },
  {
    name: 'JWT Expiration',
    maxPoints: 1,
    description: 'Identify JWT without expiration verification, correct location and valid fix',
  },
  {
    name: 'Hardcoded Secret',
    maxPoints: 1,
    description: 'Identify hardcoded API key or secret, correct location and valid fix',
  },
  {
    name: 'Missing Authentication',
    maxPoints: 1,
    description: 'Identify admin endpoint with no authentication check, correct location and valid fix',
  },
  {
    name: 'PII Logging',
    maxPoints: 1,
    description: 'Identify PII logged in plaintext, correct location and valid fix',
  },
];

export class SecurityReviewJob implements Job {
  id = 'j05';
  name = 'Security Review - Planted Vulnerabilities';
  description = 'Find all 5 planted security vulnerabilities in the code';
  supportedLanguages: Language[] = ['nodejs', 'java', 'dotnet'];
  evaluationType = 'rubric' as const;
  maxTurns = 1;

  systemPrompt = 'You are a security engineer performing a code audit.';

  buildPrompt(input: JobInput): string {
    return `Perform a security review. Find ALL vulnerabilities in the code below.

For each vulnerability, respond with:

VULNERABILITY #N
- SEVERITY: Critical | High | Medium | Low
- TYPE: <e.g., SQL Injection, Hardcoded Secret>
- LOCATION: <function name and approximate line>
- RISK: <what an attacker can do, one sentence>
- FIX: <corrected code snippet>

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

export default new SecurityReviewJob();
