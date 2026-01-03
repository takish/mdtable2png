import { join } from "node:path";
import type { ImageWriterPort } from "../../ports/ImageWriterPort.js";
import type { MarkdownReaderPort } from "../../ports/MarkdownReaderPort.js";
import type { TableRendererPort } from "../../ports/TableRendererPort.js";
import type { RenderOptions, TableData } from "../entities/TableData.js";

/**
 * テーブル抽出・レンダリングユースケース
 * アプリケーションの中心となるビジネスロジック
 */
export class ExtractAndRenderTables {
  constructor(
    private readonly reader: MarkdownReaderPort,
    private readonly renderer: TableRendererPort,
    private readonly writer: ImageWriterPort,
  ) {}

  /**
   * Markdown からテーブルを抽出し、PNG 画像として出力
   * @param input Markdown ファイルパス
   * @param outDir 出力ディレクトリ
   * @param options レンダリングオプション
   * @returns 出力ファイル名の配列
   */
  async execute(input: string, outDir: string, options: RenderOptions): Promise<string[]> {
    // 出力ディレクトリを準備
    await this.writer.ensureDir(outDir);

    // Markdown からテーブルを抽出
    const tables = await this.reader.read(input);

    if (tables.length === 0) {
      console.log("No tables found in the input file.");
      return [];
    }

    const results: string[] = [];

    // 各テーブルをレンダリング
    for (const table of tables) {
      const filename = this.generateFilename(table);
      const filePath = join(outDir, filename);

      const buffer = await this.renderer.render(table, options);
      await this.writer.write(buffer, filePath);

      results.push(filename);
      console.log(`Generated: ${filename}`);
    }

    return results;
  }

  /**
   * テーブルデータからファイル名を生成
   * 形式: table-{index}-{caption}.png
   */
  private generateFilename(table: TableData): string {
    const index = String(table.index).padStart(2, "0");

    if (table.caption) {
      // キャプションをファイル名に使用可能な形式に変換
      const safeCaption = this.sanitizeFilename(table.caption);
      return `table-${index}-${safeCaption}.png`;
    }

    return `table-${index}.png`;
  }

  /**
   * ファイル名として安全な文字列に変換
   */
  private sanitizeFilename(text: string): string {
    return text
      .replace(/[\/\\:*?"<>|]/g, "") // 禁止文字を除去
      .replace(/\s+/g, "-") // 空白をハイフンに
      .substring(0, 50); // 長すぎる場合は切り詰め
  }
}
