import { readFile, unlink, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import {
  buildManifest,
  generateBlockFilename,
  manifestToJson,
} from "../../infrastructure/manifestBuilder.js";
import { parseMarkdownBlocks } from "../../infrastructure/remarkParser.js";
import type { BlockRendererPort } from "../../ports/BlockRendererPort.js";
import type { ImageWriterPort } from "../../ports/ImageWriterPort.js";
import type { BlockData, BlockType, Manifest } from "../entities/BlockData.js";
import { manifestItemToBlockData } from "../entities/BlockData.js";
import type { RenderOptions } from "../entities/TableData.js";

/**
 * 入力ファイル名から出力フォルダ名を生成
 * 例: /path/to/article.md → article
 */
function getOutputFolderName(inputPath: string): string {
  const name = basename(inputPath);
  // 拡張子を除去
  return name.replace(/\.(md|markdown)$/i, "");
}

/**
 * ブロック読み込みポート（シンプル版）
 */
export interface BlockReaderPort {
  /**
   * Markdown ファイルからブロックデータを抽出
   */
  read(path: string, types?: BlockType[], autoDetect?: boolean): Promise<BlockData[]>;
}

/**
 * ファイルベースのブロック読み込みアダプター
 */
export class FileBlockReader implements BlockReaderPort {
  async read(path: string, types?: BlockType[], autoDetect = true): Promise<BlockData[]> {
    const { readFile } = await import("node:fs/promises");
    const content = await readFile(path, "utf-8");
    return parseMarkdownBlocks(content, path, types, autoDetect);
  }
}

/**
 * ブロック抽出・レンダリングユースケース
 */
export class ExtractAndRenderBlocks {
  constructor(
    private readonly reader: BlockReaderPort,
    private readonly renderer: BlockRendererPort,
    private readonly writer: ImageWriterPort,
  ) {}

  /**
   * Markdown からブロックを抽出し、PNG 画像として出力
   * @param input Markdown ファイルパス
   * @param outDir 出力ディレクトリ
   * @param options レンダリングオプション
   * @param types 抽出対象のブロックタイプ（省略時は全タイプ）
   * @param autoDetect プレーンテキストからの自動検出（デフォルト: true）
   * @returns { outputDir, files } 出力ディレクトリとファイル名の配列
   */
  async execute(
    input: string,
    outDir: string,
    options: RenderOptions,
    types?: BlockType[],
    autoDetect = true,
  ): Promise<{ outputDir: string; files: string[] }> {
    // 入力ファイル名でサブフォルダを作成
    const folderName = getOutputFolderName(input);
    const actualOutDir = join(outDir, folderName);

    // 出力ディレクトリを準備
    await this.writer.ensureDir(actualOutDir);

    // Markdown からブロックを抽出
    const blocks = await this.reader.read(input, types, autoDetect);

    if (blocks.length === 0) {
      console.log("No blocks found in the input file.");
      return { outputDir: actualOutDir, files: [] };
    }

    const filenames: string[] = [];

    // 各ブロックをレンダリング
    for (const block of blocks) {
      const filename = generateBlockFilename(block);
      const filePath = join(actualOutDir, filename);

      const buffer = await this.renderer.render(block, options);
      await this.writer.write(buffer, filePath);

      filenames.push(filename);
      console.log(`Generated: ${filename}`);
    }

    // manifest.json を出力
    const manifest = buildManifest(input, blocks, filenames);
    const manifestPath = join(actualOutDir, "manifest.json");
    await writeFile(manifestPath, manifestToJson(manifest), "utf-8");
    console.log("Generated: manifest.json");

    return { outputDir: actualOutDir, files: filenames };
  }

  /**
   * manifest.json からブロックを再生成
   * @param manifestPath manifest.json のパス
   * @param options レンダリングオプション
   * @returns { outputDir, files } 出力ディレクトリとファイル名の配列
   */
  async executeFromManifest(
    manifestPath: string,
    options: RenderOptions,
  ): Promise<{ outputDir: string; files: string[] }> {
    // manifest.json を読み込み
    const content = await readFile(manifestPath, "utf-8");
    const manifest: Manifest = JSON.parse(content);

    // manifest.json と同じディレクトリに出力
    const actualOutDir = manifestPath.replace(/\/manifest\.json$/, "");

    // 出力ディレクトリを準備
    await this.writer.ensureDir(actualOutDir);

    // 古い出力ファイルを削除
    for (const item of manifest.items) {
      const oldFilePath = join(actualOutDir, item.output);
      try {
        await unlink(oldFilePath);
      } catch {
        // ファイルが存在しない場合は無視
      }
    }

    const filenames: string[] = [];

    // 各アイテムをレンダリング
    for (const item of manifest.items) {
      const block = manifestItemToBlockData(item);
      const filename = generateBlockFilename(block);
      const filePath = join(actualOutDir, filename);

      const buffer = await this.renderer.render(block, options);
      await this.writer.write(buffer, filePath);

      filenames.push(filename);
      console.log(`Regenerated: ${filename}`);
    }

    // manifest.json を更新（タイトル変更を反映）
    const updatedManifest: Manifest = {
      ...manifest,
      generatedAt: new Date().toISOString(),
      items: manifest.items.map((item, i) => ({
        ...item,
        output: filenames[i],
      })),
    };
    await writeFile(manifestPath, manifestToJson(updatedManifest), "utf-8");
    console.log("Updated: manifest.json");

    return { outputDir: actualOutDir, files: filenames };
  }
}
