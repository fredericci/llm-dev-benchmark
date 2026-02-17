import { scoreWithRubric, normalizeScore } from '../../utils/rubric-scorer';
import { Job, JobInput, Language } from '../base.job';

const CURRENT_SCHEMA = `CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);`;

const CHANGE_DESCRIPTION = `Add a subscriptions table with:
- id: UUID primary key
- user_id: foreign key referencing users.id (cascade delete)
- plan: enum ('free', 'pro', 'enterprise')
- status: enum ('active', 'cancelled', 'expired')
- starts_at: timestamp
- ends_at: nullable timestamp
- cancelled_at: nullable timestamp (soft delete field)
- created_at: timestamp with default NOW()
Add index on user_id for fast user subscription lookups.
Add index on (status, ends_at) for expiration queries.`;

const RUBRIC = [
  {
    name: 'UP Migration',
    maxPoints: 2,
    description: 'Complete UP migration that creates subscriptions table with all required columns, FK, enums, and indexes',
  },
  {
    name: 'DOWN Migration',
    maxPoints: 1,
    description: 'Complete DOWN migration that reverses all changes (drops table, types, indexes) in correct order',
  },
  {
    name: 'Entity/Model',
    maxPoints: 1,
    description: 'Updated entity or model definition reflecting the new table structure',
  },
  {
    name: 'Index Justification',
    maxPoints: 1,
    description: 'Each index added includes a brief justification explaining the query pattern it optimizes',
  },
];

export class DBMigrationJob implements Job {
  id = 'j17';
  name = 'DB Migration - Subscriptions Table';
  description = 'Generate a PostgreSQL migration for a new subscriptions table';
  supportedLanguages: Language[] = ['nodejs', 'java', 'dotnet'];
  evaluationType = 'rubric' as const;
  maxTurns = 1;

  systemPrompt =
    'You are a database engineer. Provide complete, runnable migration files.';

  buildPrompt(input: JobInput): string {
    const ormMap: Record<Language, string> = {
      nodejs: 'Knex.js',
      java: 'Flyway',
      dotnet: 'Entity Framework Core Migrations',
    };
    const orm = ormMap[input.language];

    return `Generate a database migration for the change described below.

CURRENT SCHEMA:
${CURRENT_SCHEMA}

CHANGE REQUIRED:
${CHANGE_DESCRIPTION}

ORM: ${orm}
LANGUAGE: ${input.language}
DATABASE: PostgreSQL

Provide:
1. UP migration file (complete SQL or ORM migration)
2. DOWN migration file (complete rollback)
3. Updated entity/model definition
4. Any necessary index additions with justification`;
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

export default new DBMigrationJob();
