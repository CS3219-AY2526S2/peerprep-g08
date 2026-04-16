declare module "y-monaco" {
  import type * as Y from "yjs";
  import type * as monaco from "monaco-editor";
  import type { Awareness } from "y-protocols/awareness";
  export class MonacoBinding {
    constructor(
      ytext: Y.Text,
      model: monaco.editor.ITextModel,
      editors: Set<monaco.editor.IStandaloneCodeEditor>,
      awareness?: Awareness,
    );
    destroy(): void;
  }
}
