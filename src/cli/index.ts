import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { FileImageWriter } from "../adapters/FileImageWriter.js";
import { FileMarkdownReader } from "../adapters/FileMarkdownReader.js";
import { PuppeteerRenderer } from "../adapters/PuppeteerRenderer.js";
import { type AppConfig, DEFAULT_CONFIG, type RenderOptions } from "../core/entities/TableData.js";
import { ExtractAndRenderTables } from "../core/useCases/ExtractAndRenderTables.js";

interface ConfigFile {
  width?: number;
  scale?: number;
  color?: string;
  outDir?: string;
}

/**
 * 設定ファイルを読み込む
 */
async function loadConfigFile(configPath: string | undefined): Promise<ConfigFile> {
  if (!configPath) {
    return {};
  }

  try {
    const content = await readFile(configPath, "utf-8");
    return JSON.parse(content) as ConfigFile;
  } catch {
    console.warn(`Warning: Could not load config file: ${configPath}`);
    return {};
  }
}

/**
 * CLI 引数と設定ファイルをマージ
 */
function mergeConfig(
  args: {
    input: string;
    outDir?: string;
    width?: number;
    scale?: number;
    color?: string;
  },
  fileConfig: ConfigFile,
): AppConfig {
  return {
    input: args.input,
    outDir: args.outDir ?? fileConfig.outDir ?? DEFAULT_CONFIG.outDir,
    render: {
      width: args.width ?? fileConfig.width ?? DEFAULT_CONFIG.render.width,
      scale: args.scale ?? fileConfig.scale ?? DEFAULT_CONFIG.render.scale,
      color: args.color ?? fileConfig.color ?? DEFAULT_CONFIG.render.color,
    },
  };
}

/**
 * メイン処理
 */
async function main() {
  const argv = await yargs(hideBin(process.argv))
    .usage("Usage: $0 --input <file> [options]")
    .option("input", {
      alias: "i",
      type: "string",
      description: "Markdown ファイルパス",
      demandOption: true,
    })
    .option("outDir", {
      alias: "o",
      type: "string",
      description: "出力ディレクトリ",
      default: DEFAULT_CONFIG.outDir,
    })
    .option("width", {
      alias: "w",
      type: "number",
      description: "画像幅（px）",
    })
    .option("scale", {
      alias: "s",
      type: "number",
      description: "deviceScaleFactor",
    })
    .option("color", {
      alias: "c",
      type: "string",
      description: "テーマカラー（HEX）",
    })
    .option("config", {
      type: "string",
      description: "設定ファイルパス",
    })
    .example("$0 --input article.md", "基本的な使用方法")
    .example('$0 -i article.md -c "#3498db"', "テーマカラーを変更")
    .example("$0 -i article.md --config mdtable2png.config.json", "設定ファイルを使用")
    .help()
    .alias("help", "h")
    .version()
    .alias("version", "v")
    .parse();

  // 設定ファイルを読み込み
  const fileConfig = await loadConfigFile(argv.config);

  // 設定をマージ
  const config = mergeConfig(
    {
      input: resolve(argv.input),
      outDir: argv.outDir,
      width: argv.width,
      scale: argv.scale,
      color: argv.color,
    },
    fileConfig,
  );

  console.log("mdtable2png - Markdown Table to PNG Converter");
  console.log("─".repeat(50));
  console.log(`Input:  ${config.input}`);
  console.log(`Output: ${config.outDir}`);
  console.log(`Theme:  ${config.render.color}`);
  console.log("─".repeat(50));

  // 依存関係を注入してユースケースを実行
  const reader = new FileMarkdownReader();
  const renderer = new PuppeteerRenderer();
  const writer = new FileImageWriter();

  const useCase = new ExtractAndRenderTables(reader, renderer, writer);

  try {
    const results = await useCase.execute(config.input, config.outDir, config.render);

    console.log("─".repeat(50));
    console.log(`Completed: ${results.length} table(s) generated.`);
  } finally {
    await renderer.dispose();
  }
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
