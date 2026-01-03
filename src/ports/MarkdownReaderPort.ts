import type { TableData } from "../core/entities/TableData.js";

/**
 * Markdown 読み込みポート
 * 依存性逆転のためのインターフェース定義
 */
export interface MarkdownReaderPort {
  /**
   * Markdown ファイルからテーブルデータを抽出
   * @param path ファイルパス
   * @returns テーブルデータの配列（出現順）
   */
  read(path: string): Promise<TableData[]>;
}
