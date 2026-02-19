import * as path from 'path';
import { FullstackJob, JobInput, Language } from '../base.job';
import { runE2ETests } from '../../utils/e2e-runner';

export class FormValidationJob implements FullstackJob {
  id = 'j31';
  name = 'Fullstack - Form Validation';
  description = 'Implement contact form with client-side validation';
  supportedLanguages: Language[] = ['nodejs'];
  evaluationType = 'e2e' as const;
  maxTurns = 3;
  baseProjectPath = 'fullstack/base-project';
  playwrightTestFile = 'e2e/tests/j31-form-validation.spec.ts';

  systemPrompt =
    'You are a senior fullstack developer. Implement the requested feature by directly modifying project files. Do not explain — just implement.';

  buildPrompt(_input: JobInput): string {
    return `You are working on a NestJS + React (Vite) fullstack application. The project structure is:

- backend/ — NestJS API server (TypeScript)
- frontend/ — React app with Vite (TypeScript, React Router)

TASK: Implement a contact form page with client-side validation and a backend endpoint.

BACKEND:
1. Create a contact module at \`backend/src/contact/\`:
   - \`contact.module.ts\`
   - \`contact.controller.ts\` — POST /api/contact endpoint
2. The endpoint accepts \`{ name, email, message }\` and returns \`{ success: true, message: "Message sent successfully" }\`
3. Validate on the backend as well:
   - name: required, minimum 2 characters
   - email: required, must be valid email format
   - message: required, minimum 10 characters
4. On validation failure, return HTTP 400 with \`{ message: "Validation failed", errors: [...] }\`
5. Register the ContactModule in \`app.module.ts\`

FRONTEND:
1. Create a Contact page at \`frontend/src/pages/Contact.tsx\`
2. Add a route for /contact in \`frontend/src/App.tsx\`
3. Add a "Contact" link in the Header navigation

4. The contact form must have:
   - Name input (type="text") with a visible label "Name"
   - Email input (type="email") with a visible label "Email"
   - Message textarea with a visible label "Message"
   - Submit button with text "Send" or "Submit"

5. Client-side validation (validate on blur and on submit):
   - Name: required (show "Name is required" if empty), minimum 2 characters (show "Name must be at least 2 characters")
   - Email: required (show "Email is required" if empty), valid email format (show "Please enter a valid email" or "Invalid email format")
   - Message: required (show "Message is required" if empty), minimum 10 characters (show "Message must be at least 10 characters")

6. Validation error display:
   - Show error messages inline, directly below or near the corresponding input field
   - Error messages should be visible (red text or similar visual indicator)
   - Do NOT submit the form if there are validation errors

7. On successful submission:
   - POST to /api/contact
   - Display a success message (e.g., "Message sent successfully" or "Thank you for your message")
   - Clear all form fields after success

8. On API error:
   - Display the error message from the API

IMPORTANT:
- Do NOT use any form library (no formik, react-hook-form, etc.) — implement validation manually
- The frontend must build successfully
- The backend must compile without TypeScript errors`;
  }

  async evaluate(
    _response: string,
    _input: JobInput,
  ): Promise<{ passed: boolean; score: number; notes: string }> {
    return { passed: false, score: 0, notes: 'e2e evaluation required' };
  }

  async evaluateE2E(
    projectDir: string,
    _input: JobInput,
  ): Promise<{ passed: boolean; score: number; notes: string }> {
    const testFile = path.join(projectDir, this.playwrightTestFile);
    const result = await runE2ETests(projectDir, testFile);
    const score = result.passed
      ? 5
      : Math.round((result.passedTests / Math.max(result.totalTests, 1)) * 5);
    return {
      passed: result.passed,
      score: Math.min(score, 5),
      notes:
        result.errorMessage ||
        result.output ||
        (result.passed
          ? 'All e2e tests passed'
          : `${result.passedTests}/${result.totalTests} tests passed`),
    };
  }
}

export default new FormValidationJob();
