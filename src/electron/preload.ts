import { contextBridge, ipcRenderer } from "electron";

type BlockType = "table" | "prog" | "deg" | "score";

interface ConvertOptions {
  inputPath: string;
  outputDir: string;
  color: string;
  width: number;
  scale: number;
}

interface ConvertBlocksOptions extends ConvertOptions {
  types?: BlockType[];
  autoDetect?: boolean;
}

interface ConvertResult {
  success: boolean;
  files?: string[];
  outputDir?: string;
  error?: string;
}

interface RegenerateOptions {
  manifestPath: string;
  color: string;
  width: number;
  scale: number;
}

contextBridge.exposeInMainWorld("api", {
  selectFile: (): Promise<string | null> => ipcRenderer.invoke("select-file"),

  selectOutputDir: (): Promise<string | null> => ipcRenderer.invoke("select-output-dir"),

  selectManifest: (defaultPath?: string): Promise<string | null> =>
    ipcRenderer.invoke("select-manifest", defaultPath),

  // 新しい汎用ブロック変換API
  convertBlocks: (options: ConvertBlocksOptions): Promise<ConvertResult> =>
    ipcRenderer.invoke("convert-blocks", options),

  // manifest.json から再生成
  regenerateFromManifest: (options: RegenerateOptions): Promise<ConvertResult> =>
    ipcRenderer.invoke("regenerate-from-manifest", options),

  // 後方互換性のためtable専用APIも維持
  convertTables: (options: ConvertOptions): Promise<ConvertResult> =>
    ipcRenderer.invoke("convert-tables", options),

  openOutputDir: (dirPath: string): Promise<void> => ipcRenderer.invoke("open-output-dir", dirPath),
});
