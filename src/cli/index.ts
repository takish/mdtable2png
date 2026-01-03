import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { BlockRenderer } from "../adapters/BlockRenderer.js";
import { FileImageWriter } from "../adapters/FileImageWriter.js";
import type { BlockType } from "../core/entities/BlockData.js";
import { type AppConfig, DEFAULT_CONFIG } from "../core/entities/TableData.js";
import {
  ExtractAndRenderBlocks,
  FileBlockReader,
} from "../core/useCases/ExtractAndRenderBlocks.js";

const ALL_BLOCK_TYPES: BlockType[] = ["table", "prog", "deg", "score"];

interface ConfigFile {
  width?: number;
  scale?: number;
  color?: string;
  outDir?: string;
  types?: BlockType[];
  autoDetect?: boolean;
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

interface ExtendedAppConfig extends AppConfig {
  types: BlockType[];
  autoDetect: boolean;
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
    types?: string[];
    auto?: boolean;
  },
  fileConfig: ConfigFile,
): ExtendedAppConfig {
  // types の検証
  const parseTypes = (input: string[] | undefined): BlockType[] => {
    if (!input || input.length === 0) {
      return ALL_BLOCK_TYPES;
    }
    return input.filter((t): t is BlockType => ALL_BLOCK_TYPES.includes(t as BlockType));
  };

  // --auto (default true) or --no-auto to disable
  const autoDetect = args.auto ?? fileConfig.autoDetect ?? true;

  return {
    input: args.input,
    outDir: args.outDir ?? fileConfig.outDir ?? DEFAULT_CONFIG.outDir,
    render: {
      width: args.width ?? fileConfig.width ?? DEFAULT_CONFIG.render.width,
      scale: args.scale ?? fileConfig.scale ?? DEFAULT_CONFIG.render.scale,
      color: args.color ?? fileConfig.color ?? DEFAULT_CONFIG.render.color,
    },
    types: parseTypes(args.types) ?? fileConfig.types ?? ALL_BLOCK_TYPES,
    autoDetect,
  };
}

/**
 * メイン処理
 */
async function main() {
  const argv = await yargs(hideBin(process.argv))
    .usage("Usage: $0 --input <file> [options]")
    .usage("       $0 --from-manifest <manifest.json> [options]")
    .option("input", {
      alias: "i",
      type: "string",
      description: "Markdown ファイルパス",
    })
    .option("from-manifest", {
      alias: "m",
      type: "string",
      description: "manifest.json から再生成",
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
    .option("types", {
      alias: "t",
      type: "array",
      description: "抽出対象のブロックタイプ（table, prog, deg, score）",
      choices: ALL_BLOCK_TYPES,
    })
    .option("config", {
      type: "string",
      description: "設定ファイルパス",
    })
    .option("auto", {
      type: "boolean",
      description: "プレーンテキストからコード進行を自動検出",
      default: true,
    })
    .example("$0 --input article.md", "基本的な使用方法")
    .example('$0 -i article.md -c "#3498db"', "テーマカラーを変更")
    .example("$0 -i article.md -t table prog", "テーブルとコード進行のみ抽出")
    .example("$0 -i article.md --no-auto", "fenced code blockのみを処理")
    .example("$0 --from-manifest ./out/article/manifest.json", "manifest から再生成")
    .check((argv) => {
      if (!argv.input && !argv["from-manifest"]) {
        throw new Error("--input または --from-manifest のいずれかが必要です");
      }
      if (argv.input && argv["from-manifest"]) {
        throw new Error("--input と --from-manifest は同時に指定できません");
      }
      return true;
    })
    .help()
    .alias("help", "h")
    .version()
    .alias("version", "v")
    .parse();

  // 依存関係を注入
  const reader = new FileBlockReader();
  const renderer = new BlockRenderer();
  const writer = new FileImageWriter();
  const useCase = new ExtractAndRenderBlocks(reader, renderer, writer);

  try {
    // --from-manifest モード
    if (argv["from-manifest"]) {
      const manifestPath = resolve(argv["from-manifest"] as string);

      console.log("mdtable2png - Regenerate from Manifest");
      console.log("─".repeat(50));
      console.log(`Manifest: ${manifestPath}`);
      console.log("─".repeat(50));

      const result = await useCase.executeFromManifest(manifestPath, {
        color: argv.color ?? DEFAULT_CONFIG.render.color,
        width: argv.width ?? DEFAULT_CONFIG.render.width,
        scale: argv.scale ?? DEFAULT_CONFIG.render.scale,
      });

      console.log("─".repeat(50));
      console.log(`Output:   ${result.outputDir}`);
      console.log(`Completed: ${result.files.length} block(s) regenerated.`);
      return;
    }

    // 通常モード
    // 設定ファイルを読み込み
    const fileConfig = await loadConfigFile(argv.config);

    // 設定をマージ
    const config = mergeConfig(
      {
        input: resolve(argv.input as string),
        outDir: argv.outDir,
        width: argv.width,
        scale: argv.scale,
        color: argv.color,
        types: argv.types as string[] | undefined,
        auto: argv.auto,
      },
      fileConfig,
    );

    console.log("mdtable2png - Markdown to PNG Converter");
    console.log("─".repeat(50));
    console.log(`Input:  ${config.input}`);
    console.log(`Output: ${config.outDir}`);
    console.log(`Theme:  ${config.render.color}`);
    console.log(`Types:  ${config.types.join(", ")}`);
    console.log(`Auto:   ${config.autoDetect ? "enabled" : "disabled"}`);
    console.log("─".repeat(50));

    const result = await useCase.execute(
      config.input,
      config.outDir,
      config.render,
      config.types,
      config.autoDetect,
    );

    console.log("─".repeat(50));
    console.log(`Output:   ${result.outputDir}`);
    console.log(`Completed: ${result.files.length} block(s) generated.`);
  } finally {
    await renderer.dispose();
  }
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
