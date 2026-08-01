import { unescapeCfiValue } from './escape';
import type {
  CfiAssertion,
  CfiLocalPath,
  CfiOffset,
  CfiPath,
  CfiRedirect,
  CfiStep,
  ParsedCfi,
} from './types';

class CfiParser {
  private index = 0;

  constructor(private readonly input: string) {}

  parse(): ParsedCfi {
    this.expectString('epubcfi(');
    const first = this.parseLocalPath();

    if (this.peek() === ',') {
      this.consume(',');
      const start = this.parseLocalPath();
      this.expect(',');
      const end = this.parseLocalPath();
      this.expectString(')');

      return {
        range: {
          parent: first,
          start,
          end,
        },
      };
    }

    const path: CfiPath = {
      steps: first.steps,
      tail: first.tail,
    };

    this.expectString(')');

    return { path };
  }

  private parseLocalPath(): CfiLocalPath {
    const steps: CfiStep[] = [];

    while (this.peek() === '/') {
      steps.push(this.parseStep());
    }

    let tail: CfiRedirect | CfiOffset | undefined;

    if (this.peek() === '!') {
      tail = this.parseRedirect();
    } else if (this.hasOffsetStart()) {
      tail = this.parseOffset();
    }

    return { steps, tail };
  }

  private parseStep(): CfiStep {
    this.expect('/');
    const index = this.parseInteger();
    const assertion = this.peek() === '[' ? this.parseAssertion('step') : undefined;

    return { index, assertion };
  }

  private parseRedirect(): CfiRedirect {
    this.expect('!');

    if (this.hasOffsetStart()) {
      return { kind: 'offset', offset: this.parseOffset() };
    }

    return { kind: 'path', path: this.parseLocalPath() };
  }

  private parseOffset(): CfiOffset {
    if (this.peek() === ':') {
      this.consume(':');
      const offset = this.parseInteger();
      const assertion = this.peek() === '[' ? this.parseAssertion('offset') : undefined;

      return { type: 'character', offset, assertion };
    }

    if (this.peek() === '~') {
      this.consume('~');
      const seconds = this.parseNumber();
      let spatial: { x: number; y: number } | undefined;

      if (this.peek() === '@') {
        spatial = this.parseSpatialPair();
      }

      const assertion = this.peek() === '[' ? this.parseAssertion('offset') : undefined;

      return spatial
        ? { type: 'temporal', seconds, spatial, assertion }
        : { type: 'temporal', seconds, assertion };
    }

    if (this.peek() === '@') {
      const spatial = this.parseSpatialPair();
      const assertion = this.peek() === '[' ? this.parseAssertion('offset') : undefined;

      return { type: 'spatial', ...spatial, assertion };
    }

    throw new Error(`Invalid CFI offset at position ${this.index}`);
  }

  private parseSpatialPair(): { x: number; y: number } {
    this.expect('@');
    const x = this.parseNumber();
    this.expect(':');
    const y = this.parseNumber();

    return { x, y };
  }

  private parseAssertion(context: 'step' | 'offset'): CfiAssertion {
    this.expect('[');
    const raw = this.readUntil(']');
    this.expect(']');

    return parseAssertionContent(unescapeCfiValue(raw), context);
  }

  private parseInteger(): number {
    const match = /^([1-9][0-9]*|0)/.exec(this.input.slice(this.index));

    if (!match) {
      throw new Error(`Expected integer at position ${this.index}`);
    }

    this.index += match[1]!.length;

    return Number.parseInt(match[1]!, 10);
  }

  private parseNumber(): number {
    const match = /^(0|[1-9][0-9]*)(?:\.[0-9]*[1-9])?/.exec(this.input.slice(this.index));

    if (!match) {
      throw new Error(`Expected number at position ${this.index}`);
    }

    this.index += match[0].length;

    return Number.parseFloat(match[0]);
  }

  private hasOffsetStart(): boolean {
    const char = this.peek();

    return char === ':' || char === '~' || char === '@';
  }

  private peek(): string {
    return this.input[this.index] ?? '';
  }

  private consume(expected: string): void {
    if (this.peek() !== expected) {
      throw new Error(`Expected "${expected}" at position ${this.index}, got "${this.peek()}"`);
    }

    this.index += 1;
  }

  private expect(expected: string): void {
    this.consume(expected);
  }

  private expectString(expected: string): void {
    if (!this.input.startsWith(expected, this.index)) {
      throw new Error(`Expected "${expected}" at position ${this.index}`);
    }

    this.index += expected.length;
  }

  private readUntil(_terminator: string): string {
    const start = this.index;
    let depth = 0;

    while (this.index < this.input.length) {
      const char = this.input[this.index]!;

      if (char === '^') {
        this.index += 2;
        continue;
      }

      if (char === '[') {
        depth += 1;
      } else if (char === ']' && depth === 0) {
        return this.input.slice(start, this.index);
      } else if (char === ']') {
        depth -= 1;
      }

      this.index += 1;
    }

    throw new Error(`Unterminated assertion starting at ${start}`);
  }
}

function parseAssertionContent(content: string, context: 'step' | 'offset'): CfiAssertion {
  const assertion: CfiAssertion = { parameters: {} };

  if (!content) {
    return assertion;
  }

  if (content.startsWith(';')) {
    assertion.parameters = parseParameters(content.slice(1));

    return assertion;
  }

  const parameterIndex = content.indexOf(';');
  const valuePart = parameterIndex >= 0 ? content.slice(0, parameterIndex) : content;
  const parameterPart = parameterIndex >= 0 ? content.slice(parameterIndex + 1) : '';

  if (valuePart.startsWith(',')) {
    assertion.textAfter = valuePart.slice(1) || undefined;
  } else {
    const commaIndex = valuePart.indexOf(',');

    if (commaIndex >= 0) {
      assertion.textBefore = valuePart.slice(0, commaIndex) || undefined;
      assertion.textAfter = valuePart.slice(commaIndex + 1) || undefined;
    } else if (context === 'offset') {
      assertion.textBefore = valuePart || undefined;
    } else {
      assertion.id = valuePart || undefined;
    }
  }

  if (parameterPart) {
    assertion.parameters = parseParameters(parameterPart);
  }

  if (assertion.parameters?.s?.[0] === 'b') {
    assertion.sideBias = 'before';
  } else if (assertion.parameters?.s?.[0] === 'a') {
    assertion.sideBias = 'after';
  }

  if (assertion.parameters && Object.keys(assertion.parameters).length === 0) {
    delete assertion.parameters;
  }

  return assertion;
}

function parseParameters(content: string): Record<string, string[]> {
  const parameters: Record<string, string[]> = {};
  const parts = content.split(';').filter(Boolean);

  for (const part of parts) {
    const equalIndex = part.indexOf('=');

    if (equalIndex <= 0) {
      continue;
    }

    const name = part.slice(0, equalIndex);
    const values = part
      .slice(equalIndex + 1)
      .split(',')
      .map((value) => unescapeCfiValue(value));

    parameters[name] = values;
  }

  return parameters;
}

export function parseCfi(input: string): ParsedCfi {
  const parser = new CfiParser(input.trim());

  return parser.parse();
}

export function formatCfi(parsed: ParsedCfi): string {
  if (parsed.range) {
    return `epubcfi(${formatLocalPath(parsed.range.parent)},${formatLocalPath(parsed.range.start)},${formatLocalPath(parsed.range.end)})`;
  }

  if (parsed.path) {
    return `epubcfi(${formatPath(parsed.path)})`;
  }

  throw new Error('Parsed CFI has no path or range');
}

function formatPath(path: CfiPath): string {
  let output = formatSteps(path.steps);

  if (path.tail) {
    output += formatTail(path.tail);
  }

  return output;
}

function formatLocalPath(path: CfiLocalPath): string {
  let output = formatSteps(path.steps);

  if (path.tail) {
    output += formatTail(path.tail);
  }

  return output;
}

function formatSteps(steps: CfiStep[]): string {
  return steps.map((step) => `/${step.index}${formatAssertion(step.assertion)}`).join('');
}

function formatTail(tail: CfiRedirect | CfiOffset): string {
  if ('kind' in tail) {
    if (tail.kind === 'offset') {
      return `!${formatOffset(tail.offset)}`;
    }

    return `!${formatLocalPath(tail.path)}`;
  }

  return formatOffset(tail);
}

function formatOffset(offset: CfiOffset): string {
  switch (offset.type) {
    case 'character':
      return `:${offset.offset}${formatAssertion(offset.assertion)}`;
    case 'temporal': {
      let output = `~${formatNumber(offset.seconds)}`;

      if (offset.spatial) {
        output += `@${formatNumber(offset.spatial.x)}:${formatNumber(offset.spatial.y)}`;
      }

      return `${output}${formatAssertion(offset.assertion)}`;
    }
    case 'spatial':
      return `@${formatNumber(offset.x)}:${formatNumber(offset.y)}${formatAssertion(offset.assertion)}`;
  }
}

function formatAssertion(assertion?: CfiAssertion): string {
  if (!assertion) {
    return '';
  }

  const parts: string[] = [];

  if (assertion.id) {
    parts.push(escapeAssertionValue(assertion.id));
  } else if (assertion.textBefore || assertion.textAfter) {
    parts.push(
      [
        assertion.textBefore ? escapeAssertionValue(assertion.textBefore) : '',
        assertion.textAfter ? escapeAssertionValue(assertion.textAfter) : '',
      ].join(','),
    );
  } else if (assertion.sideBias && !assertion.parameters) {
    parts.push('');
  }

  if (assertion.parameters) {
    for (const [name, values] of Object.entries(assertion.parameters)) {
      if (name === 's' && assertion.sideBias) {
        parts.push(`;s=${assertion.sideBias === 'before' ? 'b' : 'a'}`);
      } else {
        parts.push(`;${name}=${values.map(escapeAssertionValue).join(',')}`);
      }
    }
  } else if (assertion.sideBias) {
    parts.push(`;s=${assertion.sideBias === 'before' ? 'b' : 'a'}`);
  }

  if (parts.length === 0) {
    return '';
  }

  return `[${parts.join('')}]`;
}

function escapeAssertionValue(value: string): string {
  return value.replace(/\^/g, '^^').replace(/\[/g, '^[').replace(/\]/g, '^]');
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return String(value).replace(/0+$/, '').replace(/\.$/, '');
}
