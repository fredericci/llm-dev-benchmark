import * as path from 'path';
import { runTests } from '../../utils/code-runner';
import { Job, JobInput, Language } from '../base.job';

export class MultistepFormJob implements Job {
  id = 'j23';
  name = 'Multi-step Checkout Form';
  description = 'Create a 3-step checkout form with conditional validation, navigation, and state persistence';
  supportedLanguages: Language[] = ['nodejs'];
  evaluationType = 'test-execution' as const;
  maxTurns = 1;

  systemPrompt =
    'You are a senior frontend engineer. Respond with code only. No explanations, no markdown prose.';

  buildPrompt(input: JobInput): string {
    return `Create a multi-step checkout form React component with 3 steps and conditional validation.

Props:
- onSubmit: (data: FormData) => void — called with all collected data on final submit

STEP 1 — Personal Info:
- Fields: name (label "Name"), email (label "Email"), phone (label "Phone")
- All required (non-empty to proceed)
- "Next" button advances to step 2

STEP 2 — Address:
- Fields: street (label "Street"), city (label "City"), zip (label "Zip") — all required
- Checkbox "Same as billing" (label must contain "same as billing", default: checked)
- When unchecked: show billingStreet (label "Billing Street"), billingCity (label "Billing City"), billingZip (label "Billing Zip") — all required when visible
- "Back" and "Next" buttons

STEP 3 — Payment:
- Radio buttons for paymentType: "Card" (default) and "Boleto"
- If Card: show cardNumber (label "Card Number"), cardExpiry (label "Expiry"), cardCvv (label "CVV") — all required
- If Boleto: show cpf (label "CPF") — required
- "Back" button and "Submit" button
- Submit is disabled until all required fields for current payment type are filled

NAVIGATION RULES:
- Show step indicator (text containing "Step N" where N is current step number)
- Going back preserves all entered data
- "Next" only advances if current step's required fields are filled
- All inputs should use label elements associated via htmlFor/id

DATA FORMAT on submit:
{ name, email, phone, street, city, zip, sameAsBilling, billingStreet, billingCity, billingZip, paymentType, cardNumber, cardExpiry, cardCvv, cpf }

TECHNICAL REQUIREMENTS:
- Use React hooks
- Export the component as default
- Component name: CheckoutForm
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

    const testDir = path.join(process.cwd(), 'fixtures', 'nodejs', 'j23', 'tests');
    const result = await runTests(response, input.language, testDir, 'checkout-form.jsx');

    return {
      passed: result.passed,
      score: result.passed ? 5 : 1,
      notes: result.output || result.errorMessage || '',
    };
  }
}

export default new MultistepFormJob();
