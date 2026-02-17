import * as path from 'path';
import { runTests } from '../../utils/code-runner';
import { Job, JobInput, Language } from '../base.job';

const STACK_TRACE_NODEJS = `TypeError: Cannot read properties of undefined (reading 'id')
    at processOrder (order-service.js:34:38)
    at async POST /orders (server.js:58:5)
    at Layer.handle [as handle_request] (express/lib/router/layer.js:95:5)
    at next (express/lib/router/route.js:137:13)

Request: POST /orders { productId: "abc-123", quantity: 2 }
Environment: production, Node.js 20.x`;

export class DebuggingJob implements Job {
  id = 'j09';
  name = 'Debugging - Stack Trace Analysis';
  description = 'Diagnose a production bug from a stack trace and fix the root cause';
  supportedLanguages: Language[] = ['nodejs', 'java', 'dotnet'];
  evaluationType = 'test-execution' as const;
  maxTurns = 1;

  systemPrompt = 'You are a production debugging expert.';

  buildPrompt(input: JobInput): string {
    const stackTraceMap: Record<Language, string> = {
      nodejs: STACK_TRACE_NODEJS,
      java: `java.lang.NullPointerException: Cannot invoke method getId() on null
    at com.example.OrderService.processOrder(OrderService.java:45)
    at com.example.OrderController.createOrder(OrderController.java:32)`,
      dotnet: `System.NullReferenceException: Object reference not set to an instance of an object.
   at OrderService.ProcessOrder(Order order) in OrderService.cs:line 38
   at OrderController.Post([FromBody] OrderRequest request) in OrderController.cs:line 24`,
    };

    return `A bug was reported in production. The stack trace and relevant code are below.
The root cause is somewhere in the provided code — find and fix it.

Respond with:
ROOT CAUSE: <exact explanation of what triggers the error>
LOCATION: <file and method/function where the fix should be applied>
FIXED CODE: <complete corrected file>
PREVENTION: <one practice to avoid this class of bug>

STACK TRACE:
${stackTraceMap[input.language]}

RELEVANT CODE:
${input.fixtureCode}

LANGUAGE: ${input.language}`;
  }

  async evaluate(
    response: string,
    input: JobInput,
  ): Promise<{ passed: boolean; score: number; notes: string }> {
    if (input.language !== 'nodejs') {
      return { passed: false, score: 0, notes: `${input.language} test execution not supported (stub)` };
    }

    // Extract FIXED CODE section
    const fixedMatch = response.match(/FIXED CODE:\s*\n([\s\S]+?)(?:\nPREVENTION:|$)/);
    const fixedCode = fixedMatch ? fixedMatch[1].trim() : response;

    const testDir = path.join(process.cwd(), 'fixtures', 'nodejs', 'j09', 'tests');
    const result = await runTests(fixedCode, input.language, testDir, 'order-service.js');

    const hasRootCause = /ROOT CAUSE:/i.test(response);
    const hasLocation = /LOCATION:/i.test(response);

    return {
      passed: result.passed,
      score: result.passed ? 5 : (hasRootCause && hasLocation ? 2 : 1),
      notes: result.output || result.errorMessage || '',
    };
  }
}

export default new DebuggingJob();
