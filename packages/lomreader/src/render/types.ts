export type SpreadLayout = '1-up' | '2-up';

export type BeforeNavigateHook = (context: NavigateContext) => void | Promise<void>;

export interface NavigateContext {
  fromSpineIndex: number;
  toSpineIndex: number;
  fromPath: string;
  toPath: string;
  layout: SpreadLayout;
}

export interface ChapterChangeDetail {
  spineIndex: number;
  path: string;
  href: string;
  idref: string;
  slot: 'single' | 'left' | 'right';
}

export interface SpreadChangeDetail {
  layout: SpreadLayout;
  spreadStartLinearIndex: number;
  slots: ChapterChangeDetail[];
}

export interface ReaderHostOptions {
  container: HTMLElement;
  /** iframe sandbox flags; default allow-same-origin only */
  sandbox?: string;
  /** Reading layout: one page or two-page spread. Default `1-up`. */
  layout?: SpreadLayout;
}

export interface ReaderHostEventMap {
  chapterchange: CustomEvent<ChapterChangeDetail>;
  spreadchange: CustomEvent<SpreadChangeDetail>;
  navigate: CustomEvent<NavigateContext>;
  error: CustomEvent<{ message: string; cause?: unknown }>;
}

export type ReaderHostEventName = keyof ReaderHostEventMap;
