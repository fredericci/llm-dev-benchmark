import { scoreWithRubric, normalizeScore } from '../../utils/rubric-scorer';
import { Job, JobInput, Language } from '../base.job';

const RUBRIC = [
  {
    name: 'All Parameters Documented',
    maxPoints: 2,
    description: 'Every parameter of every public function has @param with name, type, and description',
  },
  {
    name: 'Executable Examples',
    maxPoints: 2,
    description: 'Each function has a @example snippet that would actually run without modification',
  },
  {
    name: 'No Hallucinated Parameters',
    maxPoints: 1,
    description: 'No @param or @returns references parameters that do not exist in the original code (penalty: -1 per hallucination, floor 0)',
  },
];

export class DocumentationJob implements Job {
  id = 'j07';
  name = 'Documentation Generation';
  description = 'Add complete JSDoc/JavaDoc documentation to all public functions';
  supportedLanguages: Language[] = ['nodejs', 'java', 'dotnet'];
  evaluationType = 'rubric' as const;
  maxTurns = 1;

  systemPrompt = 'You are a technical writer. Respond with documented code only.';

  buildPrompt(input: JobInput): string {
    const docFormatMap: Record<Language, string> = {
      nodejs: 'JSDoc',
      java: 'JavaDoc',
      dotnet: 'XML Documentation Comments',
    };
    const docFormat = docFormatMap[input.language];

    return `Add complete documentation to all public functions in the module below.

For each public function include:
- Summary: what it does (not how)
- @param: name, type, description for every parameter
- @returns: type and description
- @throws: condition for each possible exception/error
- @example: realistic usage snippet

DOC FORMAT: ${docFormat}
LANGUAGE: ${input.language}

MODULE:
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

export default new DocumentationJob();
