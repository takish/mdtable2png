import { join, resolve } from "node:path";
import { BrowserWindow, app, dialog, ipcMain, shell } from "electron";
import { FileImageWriter } from "../adapters/FileImageWriter.js";
import { FileMarkdownReader } from "../adapters/FileMarkdownReader.js";
import { PuppeteerRenderer } from "../adapters/PuppeteerRenderer.js";
import { DEFAULT_CONFIG } from "../core/entities/TableData.js";
import { ExtractAndRenderTables } from "../core/useCases/ExtractAndRenderTables.js";

let mainWindow: BrowserWindow | null = null;
let renderer: PuppeteerRenderer | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 600,
    minWidth: 400,
    minHeight: 500,
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    titleBarStyle: "hiddenInset",
    vibrancy: "under-window",
  });

  mainWindow.loadFile(join(__dirname, "../src/electron/renderer/index.html"));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", async () => {
  if (renderer) {
    await renderer.dispose();
    renderer = null;
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// IPC: ファイル選択ダイアログ
ipcMain.handle("select-file", async () => {
  if (!mainWindow) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

// IPC: 出力ディレクトリ選択
ipcMain.handle("select-output-dir", async () => {
  if (!mainWindow) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory", "createDirectory"],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

// IPC: テーブル変換実行
ipcMain.handle(
  "convert-tables",
  async (
    _event,
    options: {
      inputPath: string;
      outputDir: string;
      color: string;
      width: number;
      scale: number;
    },
  ) => {
    try {
      const reader = new FileMarkdownReader();
      renderer = renderer || new PuppeteerRenderer();
      const writer = new FileImageWriter();

      const useCase = new ExtractAndRenderTables(reader, renderer, writer);

      const results = await useCase.execute(options.inputPath, options.outputDir, {
        color: options.color || DEFAULT_CONFIG.render.color,
        width: options.width || DEFAULT_CONFIG.render.width,
        scale: options.scale || DEFAULT_CONFIG.render.scale,
      });

      return { success: true, files: results, outputDir: options.outputDir };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  },
);

// IPC: 出力ディレクトリを Finder で開く
ipcMain.handle("open-output-dir", async (_event, dirPath: string) => {
  const absolutePath = resolve(process.cwd(), dirPath);
  await shell.openPath(absolutePath);
});
