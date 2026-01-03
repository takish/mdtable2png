import type { RenderOptions, TableData } from "../core/entities/TableData.js";

/**
 * テーブルレンダリングポート
 * 依存性逆転のためのインターフェース定義
 */
export interface TableRendererPort {
  /**
   * テーブルデータを PNG 画像にレンダリング
   * @param table テーブルデータ
   * @param options レンダリングオプション
   * @returns PNG 画像のバッファ
   */
  render(table: TableData, options: RenderOptions): Promise<Buffer>;

  /**
   * リソースの解放
   */
  dispose(): Promise<void>;
}
