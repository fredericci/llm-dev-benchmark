import Anthropic from '@anthropic-ai/sdk';

export interface RubricCriterion {
  name: string;
  maxPoints: number;
  description: string;
}

export interface RubricScore {
  criterion: string;
  points: number;
  reason: string;
}

export interface RubricResult {
  scores: RubricScore[];
  total: number;
  maxTotal: number;
  summary: string;
}

/**
 * Score a model response against a rubric using Claude Haiku as judge.
 * Temperature is 0 for deterministic scoring.
 */
export async function scoreWithRubric(
  jobId: string,
  jobName: string,
  response: string,
  rubric: RubricCriterion[],
): Promise<RubricResult> {
  const judgeModelId = process.env.JUDGE_MODEL_ID ?? 'claude-haiku-4-5-20251001';
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const rubricText = rubric
    .map((r) => `- ${r.name} [0–${r.maxPoints} pts]: ${r.description}`)
    .join('\n');

  const maxTotal = rubric.reduce((sum, r) => sum + r.maxPoints, 0);

  const judgePrompt = `You are evaluating an AI response for a software engineering task.

TASK: ${jobId} — ${jobName}

RUBRIC (score each criterion independently):
${rubricText}

RESPONSE TO EVALUATE:
${response.slice(0, 8000)}

Return JSON only — no markdown, no explanation:
{
  "scores": [{ "criterion": "...", "points": N, "reason": "..." }],
  "total": N,
  "summary": "one sentence overall assessment"
}`;

  try {
    const judgeResponse = await client.messages.create({
      model: judgeModelId,
      max_tokens: 1024,
      temperature: 0,
      messages: [{ role: 'user', content: judgePrompt }],
    });

    const judgeText = judgeResponse.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const jsonMatch = judgeText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Judge did not return valid JSON');

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      scores: parsed.scores ?? [],
      total: parsed.total ?? 0,
      maxTotal,
      summary: parsed.summary ?? '',
    };
  } catch (err) {
    // If judge fails, return zero score with error note
    return {
      scores: rubric.map((r) => ({ criterion: r.name, points: 0, reason: 'Judge error' })),
      total: 0,
      maxTotal,
      summary: `Judge error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Normalize a rubric total to 0–5 scale.
 */
export function normalizeScore(total: number, maxTotal: number): number {
  if (maxTotal === 0) return 0;
  return Math.round((total / maxTotal) * 5 * 10) / 10;
}
