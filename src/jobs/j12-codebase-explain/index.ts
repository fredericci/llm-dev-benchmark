import { scoreWithRubric, normalizeScore } from '../../utils/rubric-scorer';
import { Job, JobInput, Language } from '../base.job';

const RUBRIC = [
  {
    name: 'System Overview',
    maxPoints: 1,
    description: 'Accurately describes what the system does and who uses it in 3-4 sentences',
  },
  {
    name: 'Architecture',
    maxPoints: 1,
    description: 'Lists main components (auth, products, cart, checkout), their responsibilities, and how they communicate',
  },
  {
    name: 'Request Lifecycle',
    maxPoints: 1,
    description: 'Traces a typical API request from entry point through middleware to DB and back with correct details',
  },
  {
    name: 'Auth & Authorization',
    maxPoints: 1,
    description: 'Correctly describes JWT-based authentication and role-based authorization as present in the codebase',
  },
  {
    name: 'Technical Debt',
    maxPoints: 1,
    description: 'Identifies at least 2 real technical debt items present in the codebase (not generic)',
  },
];

export class CodebaseExplainJob implements Job {
  id = 'j12';
  name = 'Codebase Explanation - E-commerce API';
  description = 'Provide a comprehensive technical overview of an e-commerce codebase for a new team member';
  supportedLanguages: Language[] = ['nodejs', 'java', 'dotnet'];
  evaluationType = 'rubric' as const;
  maxTurns = 1;

  systemPrompt =
    'You are a senior engineer onboarding a new team member.';

  buildPrompt(input: JobInput): string {
    return `Analyze the following codebase and provide a comprehensive technical overview.

Cover ALL of these sections:

1. SYSTEM OVERVIEW
What does this system do? Who uses it? (3-4 sentences)

2. ARCHITECTURE
Main components, their responsibilities, and how they communicate

3. REQUEST LIFECYCLE
Trace a typical API request from entry point to database and back

4. AUTHENTICATION & AUTHORIZATION
How identity is verified and permissions are enforced

5. KEY ABSTRACTIONS
The 5 most important interfaces/classes and why they exist

6. TECHNICAL DEBT
Top 3 issues a new engineer should know about before making changes

CODEBASE:
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

export default new CodebaseExplainJob();
