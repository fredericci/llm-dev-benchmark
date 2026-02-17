import { scoreWithRubric, normalizeScore } from '../../utils/rubric-scorer';
import { Job, JobInput, Language } from '../base.job';

const RUBRIC = [
  {
    name: 'All Models Covered',
    maxPoints: 1,
    description: 'Factory code is provided for all 5 models: User, Product, Order, OrderItem, Category',
  },
  {
    name: 'Variants Implemented',
    maxPoints: 2,
    description: 'Each factory has .valid(), .invalid(), and .minimal() variants with semantically correct data',
  },
  {
    name: 'Relationship Handling',
    maxPoints: 1,
    description: 'Relationships are auto-wired without manual ID setup (factories create related records automatically)',
  },
  {
    name: 'Edge Case Instances',
    maxPoints: 1,
    description: 'At least one edge case instance per model: max-length string, boundary number, or special characters',
  },
];

export class SeedDataJob implements Job {
  id = 'j19';
  name = 'Seed Data / Test Factories';
  description = 'Create test factories for 5 related data models with variants and edge cases';
  supportedLanguages: Language[] = ['nodejs', 'java', 'dotnet'];
  evaluationType = 'rubric' as const;
  maxTurns = 1;

  systemPrompt =
    'You are a test engineer. Respond with factory/fixture code only.';

  buildPrompt(input: JobInput): string {
    const factoryLibMap: Record<Language, string> = {
      nodejs: 'factory-girl / @faker-js/faker',
      java: 'EasyRandom / Instancio',
      dotnet: 'Bogus',
    };
    const factoryLib = factoryLibMap[input.language];

    return `Create test factories for the following data models.

REQUIREMENTS:
- Sensible defaults for all required fields
- Every field overridable via parameter
- Automatic handling of relationships (no manual ID wiring)
- Variants: .valid() for happy path, .invalid() for negative tests, .minimal() for required fields only
- Edge case instances: max-length strings, boundary numbers, special characters in text fields

MODELS: User, Product, Order, OrderItem, Category
RELATIONSHIPS: User hasMany Orders; Order hasMany OrderItems; OrderItem belongsTo Product; Product belongsTo Category

LANGUAGE: ${input.language}
FACTORY LIBRARY: ${factoryLib}`;
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

export default new SeedDataJob();
