import * as path from 'path';
import { runTests } from '../../utils/code-runner';
import { Job, JobInput, Language } from '../base.job';

export class OptimisticUpdateJob implements Job {
  id = 'j24';
  name = 'Optimistic Update - Task List';
  description = 'Create a React task list with optimistic UI updates that revert on API failure';
  supportedLanguages: Language[] = ['nodejs'];
  evaluationType = 'test-execution' as const;
  maxTurns = 1;

  systemPrompt =
    'You are a senior frontend engineer. Respond with code only. No explanations, no markdown prose.';

  buildPrompt(input: JobInput): string {
    return `Create a React task list component with optimistic updates.

Props:
- initialTasks: Array<{ id: number, title: string, completed: boolean }>
- onToggle: (id: number) => Promise<void> — API call to toggle task, resolves on success, rejects on failure

OPTIMISTIC UPDATE BEHAVIOR:
1. Render each task with a checkbox (checked = completed) and the task title
2. When user clicks a checkbox:
   a. IMMEDIATELY update the UI — toggle the completed state without waiting
   b. Call onToggle(id) to notify the server
   c. If onToggle resolves (success): keep the updated UI state
   d. If onToggle rejects (failure): REVERT the checkbox to its previous state
3. On failure: display the error message text somewhere visible

TECHNICAL REQUIREMENTS:
- Each task must render a checkbox input and a label with the task title
- The checkbox checked state must reflect the task's completed status
- Use React hooks (useState)
- Export the component as default
- Component name: TaskList
- No external libraries beyond React

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

    const testDir = path.join(process.cwd(), 'fixtures', 'nodejs', 'j24', 'tests');
    const result = await runTests(response, input.language, testDir, 'task-list.jsx');

    return {
      passed: result.passed,
      score: result.passed ? 5 : 1,
      notes: result.output || result.errorMessage || '',
    };
  }
}

export default new OptimisticUpdateJob();
