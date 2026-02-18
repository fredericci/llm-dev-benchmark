import { scoreWithRubric, normalizeScore } from '../../utils/rubric-scorer';
import { Job, JobInput, Language } from '../base.job';

const RUBRIC = [
  {
    name: 'Required Endpoints',
    maxPoints: 1,
    description: 'POST /notifications (returns 202) and GET /health (returns {status, timestamp}) are both implemented',
  },
  {
    name: 'Configuration from Env',
    maxPoints: 1,
    description: 'No hardcoded values — all configuration (port, host, etc.) comes from environment variables',
  },
  {
    name: 'Structured Logging',
    maxPoints: 1,
    description: 'JSON logging with at least one log line per request, not plain console.log strings',
  },
  {
    name: 'Docker Setup',
    maxPoints: 1,
    description: 'Dockerfile with multi-stage build AND docker-compose.yml with hot reload for local dev',
  },
  {
    name: 'Tests and README',
    maxPoints: 1,
    description: 'At least one unit test present AND README includes setup, run, and env var docs',
  },
];

export class ScaffoldJob implements Job {
  id = 'j11';
  name = 'Scaffold - New Microservice';
  description = 'Create a complete, production-ready Notification Service microservice from scratch';
  supportedLanguages: Language[] = ['nodejs', 'java', 'dotnet'];
  evaluationType = 'rubric' as const;
  maxTurns = 1;

  systemPrompt =
    'You are a backend engineer. Create all files. No explanations, just code.';

  buildPrompt(input: JobInput): string {
    const frameworkMap: Record<Language, string> = {
      nodejs: 'Express.js',
      java: 'Spring Boot',
      dotnet: 'ASP.NET Core',
    };
    const framework = frameworkMap[input.language];

    return `Create a complete, production-ready Notification Service microservice.

REQUIREMENTS:
- POST /notifications — accepts { userId, type, message }, returns 202
- GET /health — returns { status: "ok", timestamp: ISO8601 }
- Configuration from environment variables only (no hardcoded values)
- Structured JSON logging (one log line per request)
- Dockerfile with multi-stage build
- docker-compose.yml for local development with hot reload
- README.md with: setup, running locally, environment variables reference
- At least one unit test demonstrating test setup

LANGUAGE: ${input.language}
FRAMEWORK: ${framework}
PROJECT NAME: notification-service`;
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

export default new ScaffoldJob();
