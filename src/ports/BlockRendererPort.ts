import type { BlockData } from "../core/entities/BlockData.js";
import type { RenderOptions } from "../core/entities/TableData.js";

/**
 * ブロックレンダリングポート
 * 全ブロックタイプを PNG 画像にレンダリングするインターフェース
 */
export interface BlockRendererPort {
  /**
   * ブロックデータを PNG 画像にレンダリング
   * @param block ブロックデータ
   * @param options レンダリングオプション
   * @returns PNG 画像のバッファ
   */
  render(block: BlockData, options: RenderOptions): Promise<Buffer>;

  /**
   * リソースの解放
   */
  dispose(): Promise<void>;
}
