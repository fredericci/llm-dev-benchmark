import { scoreWithRubric, normalizeScore } from '../../utils/rubric-scorer';
import { Job, JobInput, Language } from '../base.job';

const RUBRIC = [
  {
    name: 'Scenario Coherence',
    maxPoints: 2,
    description: 'Recommendation aligns with the stated constraints (50k DAU, 95:5 read/write, strong consistency for orders, eventual for catalog)',
  },
  {
    name: 'Realistic Trade-offs',
    maxPoints: 1,
    description: 'Trade-offs section honestly describes what is sacrificed with the chosen pattern',
  },
  {
    name: 'Scenario-specific Risks',
    maxPoints: 1,
    description: 'Top 3 risks are specific to this e-commerce flash-sale scenario, not generic risks',
  },
  {
    name: 'Viable Implementation',
    maxPoints: 1,
    description: 'Implementation sketch shows concrete, actionable components (not just buzzwords)',
  },
];

export class ArchitectureJob implements Job {
  id = 'j06';
  name = 'Architecture Decision - E-commerce Scaling';
  description = 'Recommend the best architectural pattern for an e-commerce system with flash sales';
  supportedLanguages: Language[] = ['nodejs', 'java', 'dotnet'];
  evaluationType = 'rubric' as const;
  maxTurns = 1;

  systemPrompt = 'You are a software architect. Be direct and opinionated.';

  buildPrompt(_input: JobInput): string {
    return `Recommend the best architectural pattern for the scenario below.

SCENARIO:
- E-commerce, 50k DAU, peak 10k req/s during flash sales
- Read:Write = 95:5
- Eventual consistency acceptable for catalog, strong consistency required for inventory/orders
- Current bottleneck: single PostgreSQL becoming overwhelmed

EVALUATE:
1. CQRS with read replicas
2. Event Sourcing + CQRS
3. CRUD with aggressive caching

Respond with:
RECOMMENDATION: <pattern number and name>
RATIONALE: <3-5 sentences why this fits>
TRADE-OFFS: <what you're giving up with this choice>
IMPLEMENTATION SKETCH: <key components in ASCII diagram or pseudocode>
TOP 3 RISKS: <and their mitigations>`;
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

export default new ArchitectureJob();
