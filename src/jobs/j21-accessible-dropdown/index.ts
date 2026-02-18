import * as path from 'path';
import { runTests } from '../../utils/code-runner';
import { Job, JobInput, Language } from '../base.job';

export class AccessibleDropdownJob implements Job {
  id = 'j21';
  name = 'Accessible Dropdown Component';
  description = 'Create a fully accessible dropdown menu React component with ARIA roles and keyboard navigation';
  supportedLanguages: Language[] = ['nodejs'];
  evaluationType = 'test-execution' as const;
  maxTurns = 1;

  systemPrompt =
    'You are a senior frontend engineer specializing in accessible React components. Respond with code only. No explanations, no markdown prose.';

  buildPrompt(input: JobInput): string {
    return `Create a fully accessible dropdown menu component in React.

Props:
- items: Array<{ id: number, label: string }> — menu items to render
- onSelect: (item: { id: number, label: string }) => void — called when an item is selected
- label: string — text for the trigger button

ACCESSIBILITY REQUIREMENTS:
- Trigger button must have aria-haspopup="true" and aria-expanded (true when open, false when closed)
- Menu container must have role="menu"
- Each menu item must have role="menuitem" and be focusable
- Arrow Down / Arrow Up navigates between items (focus moves)
- Enter selects the currently focused item and closes the menu
- Escape closes the menu and returns focus to the trigger button
- Clicking outside the menu closes it
- When menu opens, first item receives focus
- Clicking the trigger toggles the menu open/closed
- Clicking a menu item selects it and closes the menu

TECHNICAL REQUIREMENTS:
- Use React hooks (useState, useRef, useEffect)
- Export the component as default (module.exports = Dropdown or export default)
- Component name: Dropdown
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

    const testDir = path.join(process.cwd(), 'fixtures', 'nodejs', 'j21', 'tests');
    const result = await runTests(response, input.language, testDir, 'dropdown.jsx');

    return {
      passed: result.passed,
      score: result.passed ? 5 : 1,
      notes: result.output || result.errorMessage || '',
    };
  }
}

export default new AccessibleDropdownJob();
