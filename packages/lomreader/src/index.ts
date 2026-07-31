export const VERSION = '0.0.1' as const;

export interface Reader {
  version: typeof VERSION;
}

export function createReader(): Reader {
  return {
    version: VERSION,
  };
}
