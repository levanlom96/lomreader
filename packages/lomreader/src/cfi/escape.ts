const ESCAPE_MAP: Record<string, string> = {
  '^': '^^',
  '[': '^[',
  ']': '^]',
  '(': '^(',
  ')': '^)',
  ',': '^,',
  ';': '^;',
  '=': '^=',
};

const UNESCAPE_PATTERN = /\^\^|\^\[|\^\]|\^\(|\^\)|\^,|\^;|\^=/g;

const UNESCAPE_MAP: Record<string, string> = {
  '^^': '^',
  '^[': '[',
  '^]': ']',
  '^(': '(',
  '^)': ')',
  '^,': ',',
  '^;': ';',
  '^=': '=',
};

export function escapeCfiValue(value: string): string {
  return value.replace(/[\^[\](),;=]/g, (char) => ESCAPE_MAP[char] ?? char);
}

export function unescapeCfiValue(value: string): string {
  return value.replace(UNESCAPE_PATTERN, (match) => UNESCAPE_MAP[match] ?? match);
}

export function stripCfiFragment(input: string): string {
  const trimmed = input.trim();
  const hashIndex = trimmed.lastIndexOf('#');

  if (hashIndex >= 0) {
    return trimmed.slice(hashIndex + 1);
  }

  return trimmed;
}

export function normalizeCfiInput(input: string): string {
  const fragment = stripCfiFragment(input);

  if (fragment.startsWith('epubcfi(') && fragment.endsWith(')')) {
    return fragment;
  }

  if (fragment.startsWith('(') && fragment.endsWith(')')) {
    return `epubcfi${fragment}`;
  }

  throw new Error(`Invalid EPUB CFI: expected epubcfi(...) fragment, got "${input}"`);
}
