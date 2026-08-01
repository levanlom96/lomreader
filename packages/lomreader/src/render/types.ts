export type BeforeNavigateHook = (context: NavigateContext) => void | Promise<void>;

export interface NavigateContext {
  fromSpineIndex: number;
  toSpineIndex: number;
  fromPath: string;
  toPath: string;
}

export interface ChapterChangeDetail {
  spineIndex: number;
  path: string;
  href: string;
  idref: string;
}

export interface ReaderHostOptions {
  container: HTMLElement;
  /** iframe sandbox flags; default allow-same-origin only */
  sandbox?: string;
}

export interface ReaderHostEventMap {
  chapterchange: CustomEvent<ChapterChangeDetail>;
  navigate: CustomEvent<NavigateContext>;
  error: CustomEvent<{ message: string; cause?: unknown }>;
}

export type ReaderHostEventName = keyof ReaderHostEventMap;
