import * as path from 'path';
import { runTests } from '../../utils/code-runner';
import { Job, JobInput, Language } from '../base.job';

export class DebounceSearchJob implements Job {
  id = 'j22';
  name = 'Debounce Search Input';
  description = 'Create a search-as-you-type React component with debounce, cancellation, and all result states';
  supportedLanguages: Language[] = ['nodejs'];
  evaluationType = 'test-execution' as const;
  maxTurns = 1;

  systemPrompt =
    'You are a senior frontend engineer. Respond with code only. No explanations, no markdown prose.';

  buildPrompt(input: JobInput): string {
    return `Create a debounced search input component in React.

Props:
- onSearch: (query: string) => Promise<string[]> — called after debounce with the query
- debounceMs: number (default 300) — debounce delay in milliseconds

REQUIREMENTS:
- Render an input field with placeholder "Search..."
- Debounce: do NOT call onSearch on every keystroke. Only call it after the user stops typing for debounceMs milliseconds
- While waiting for results, show "Searching..." text
- On success with results: render each result as a list item
- On success with empty results: show "No results found"
- On error: show the error message
- Provide a "Clear" button that clears the input, results, and cancels any pending search
- If the user types again before previous search completes, discard the stale result — only the latest search matters

TECHNICAL REQUIREMENTS:
- Use React hooks (useState, useEffect, useRef, useCallback)
- Handle cleanup properly (clear timeouts on unmount)
- Export the component as default
- Component name: SearchInput
- Do not use any external libraries beyond React

EXISTING CODE:
${input.fixtureCode}

Return ONLY the complete component file. Tests must pass when run against it.`;
  }

  async evaluate(
    response: string,
    input: JobInput,
  ): Promise<{ passed: boolean; score: number; notes: string }> {
    if (input.language !== 'nodejs') {
      return { passed: false, score: 0, notes: `${input.language} not supported for this job` };
    }

    const testDir = path.join(process.cwd(), 'fixtures', 'nodejs', 'j22', 'tests');
    const result = await runTests(response, input.language, testDir, 'search.jsx');

    return {
      passed: result.passed,
      score: result.passed ? 5 : 1,
      notes: result.output || result.errorMessage || '',
    };
  }
}

export default new DebounceSearchJob();
