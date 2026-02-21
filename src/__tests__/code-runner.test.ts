import { extractCodeFromResponse, runTests } from '../utils/code-runner';

describe('extractCodeFromResponse', () => {
  describe('fenced code block extraction', () => {
    it('extracts from javascript block', () => {
      const response = '```javascript\nconsole.log("hello");\n```';
      expect(extractCodeFromResponse(response)).toBe('console.log("hello");');
    });

    it('extracts from typescript block', () => {
      const response = '```typescript\nconst x: number = 42;\n```';
      expect(extractCodeFromResponse(response)).toBe('const x: number = 42;');
    });

    it('extracts from js shorthand block', () => {
      const response = '```js\nconst x = 1;\n```';
      expect(extractCodeFromResponse(response)).toBe('const x = 1;');
    });

    it('extracts from ts shorthand block', () => {
      const response = '```ts\nconst x = 1;\n```';
      expect(extractCodeFromResponse(response)).toBe('const x = 1;');
    });

    it('extracts from jsx block', () => {
      const response = '```jsx\nreturn <div />;\n```';
      expect(extractCodeFromResponse(response)).toBe('return <div />;');
    });

    it('extracts from tsx block', () => {
      const response = '```tsx\nreturn <div className="x" />;\n```';
      expect(extractCodeFromResponse(response)).toBe('return <div className="x" />;');
    });

    it('extracts from java block', () => {
      const response = '```java\npublic class Foo {}\n```';
      expect(extractCodeFromResponse(response)).toBe('public class Foo {}');
    });

    it('extracts from csharp block', () => {
      const response = '```csharp\npublic class Foo {}\n```';
      expect(extractCodeFromResponse(response)).toBe('public class Foo {}');
    });

    it('extracts from cs block', () => {
      const response = '```cs\npublic class Bar {}\n```';
      expect(extractCodeFromResponse(response)).toBe('public class Bar {}');
    });

    it('extracts from c# block', () => {
      const response = '```c#\npublic class Baz {}\n```';
      expect(extractCodeFromResponse(response)).toBe('public class Baz {}');
    });

    it('extracts from unlabeled fenced block', () => {
      const response = '```\nconst x = 1;\n```';
      expect(extractCodeFromResponse(response)).toBe('const x = 1;');
    });

    it('trims whitespace inside the code block', () => {
      const response = '```typescript\n  const x = 1;\n  \n```';
      expect(extractCodeFromResponse(response)).toBe('const x = 1;');
    });

    it('handles multiline code inside block', () => {
      const response = '```typescript\nfunction add(a: number, b: number): number {\n  return a + b;\n}\n```';
      expect(extractCodeFromResponse(response)).toBe(
        'function add(a: number, b: number): number {\n  return a + b;\n}'
      );
    });

    it('extracts first block when multiple blocks exist', () => {
      const response = '```javascript\nconst x = 1;\n```\nSome text\n```javascript\nconst y = 2;\n```';
      expect(extractCodeFromResponse(response)).toBe('const x = 1;');
    });
  });

  describe('plain text fallback', () => {
    it('returns trimmed response when no fenced block found', () => {
      const response = '  const x = 1;  ';
      expect(extractCodeFromResponse(response)).toBe('const x = 1;');
    });

    it('returns empty string for empty input', () => {
      expect(extractCodeFromResponse('')).toBe('');
    });

    it('returns full response trimmed when no code fence present', () => {
      const response = 'Here is the implementation:\nconst x = 1;\nreturn x;';
      expect(extractCodeFromResponse(response)).toBe(
        'Here is the implementation:\nconst x = 1;\nreturn x;'
      );
    });

    it('handles whitespace-only input', () => {
      expect(extractCodeFromResponse('   \n\t  ')).toBe('');
    });
  });
});

describe('runTests', () => {
  it('returns error for unsupported language', async () => {
    const result = await runTests('code', 'unknown' as never, '/tmp', 'file.txt');
    expect(result.passed).toBe(false);
    expect(result.errorMessage).toMatch(/unsupported language/i);
  });
});
