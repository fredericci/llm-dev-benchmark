import { scoreWithRubric, normalizeScore } from '../../utils/rubric-scorer';
import { Job, JobInput, Language } from '../base.job';

const RUBRIC = [
  {
    name: 'Triggers',
    maxPoints: 1,
    description: 'Pipeline triggers on push to main AND pull_request to main',
  },
  {
    name: 'Job Chain with Fail-fast',
    maxPoints: 1,
    description: 'Jobs run in order: install → lint → test → build → deploy (staging on main only), with fail-fast configured',
  },
  {
    name: 'Caching',
    maxPoints: 1,
    description: 'Dependency caching implemented (actions/cache or setup-node with cache option)',
  },
  {
    name: 'Coverage Comment',
    maxPoints: 1,
    description: 'Test coverage percentage is posted as a PR comment using an action',
  },
  {
    name: 'Docker Build and Push',
    maxPoints: 1,
    description: 'Docker image is built and pushed to ghcr.io on merge to main',
  },
];

export class CICDPipelineJob implements Job {
  id = 'j14';
  name = 'CI/CD Pipeline - GitHub Actions';
  description = 'Create a complete GitHub Actions CI/CD pipeline with all required stages';
  supportedLanguages: Language[] = ['nodejs', 'java', 'dotnet'];
  evaluationType = 'rubric' as const;
  maxTurns = 1;

  systemPrompt =
    'You are a DevOps engineer. Provide complete, working GitHub Actions YAML.';

  buildPrompt(input: JobInput): string {
    const frameworkMap: Record<Language, string> = {
      nodejs: 'Express.js',
      java: 'Spring Boot',
      dotnet: 'ASP.NET Core',
    };
    const framework = frameworkMap[input.language];

    return `Create a GitHub Actions CI/CD pipeline for this project.

PIPELINE REQUIREMENTS:
- Triggers: push to main, pull_request to main
- Jobs: install → lint → test → build → (on main only) deploy to staging
- Dependency caching between runs
- Fail fast: stop all jobs if tests fail
- Post test coverage percentage as PR comment
- Docker build and push to ghcr.io on merge to main

PROJECT:
LANGUAGE: ${input.language}
FRAMEWORK: ${framework}
REGISTRY: ghcr.io/myorg/my-service

Generate all required files under .github/workflows/`;
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

export default new CICDPipelineJob();
