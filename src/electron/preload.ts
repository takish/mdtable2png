import { contextBridge, ipcRenderer } from "electron";

interface ConvertOptions {
  inputPath: string;
  outputDir: string;
  color: string;
  width: number;
  scale: number;
}

interface ConvertResult {
  success: boolean;
  files?: string[];
  outputDir?: string;
  error?: string;
}

contextBridge.exposeInMainWorld("api", {
  selectFile: (): Promise<string | null> => ipcRenderer.invoke("select-file"),

  selectOutputDir: (): Promise<string | null> => ipcRenderer.invoke("select-output-dir"),

  convertTables: (options: ConvertOptions): Promise<ConvertResult> =>
    ipcRenderer.invoke("convert-tables", options),

  openOutputDir: (dirPath: string): Promise<void> => ipcRenderer.invoke("open-output-dir", dirPath),
});
