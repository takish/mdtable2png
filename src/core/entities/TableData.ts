/**
 * テーブルデータを表すエンティティ
 * ドメイン層の純粋なデータ構造（外部依存なし）
 */
export interface TableData {
  /** 出現順序（1始まり） */
  index: number;
  /** 直前見出し（キャプション） */
  caption?: string;
  /** ヘッダー行 */
  headers: string[];
  /** データ行 */
  rows: string[][];
}

/**
 * レンダリングオプション
 */
export interface RenderOptions {
  /** 画像幅（px） */
  width: number;
  /** deviceScaleFactor */
  scale: number;
  /** テーマカラー（HEX） */
  color: string;
}

/**
 * アプリケーション設定
 */
export interface AppConfig {
  /** Markdown ファイルパス */
  input: string;
  /** 出力ディレクトリ */
  outDir: string;
  /** レンダリングオプション */
  render: RenderOptions;
}

/**
 * デフォルト設定
 */
export const DEFAULT_CONFIG: Omit<AppConfig, "input"> = {
  outDir: "./out",
  render: {
    width: 1200,
    scale: 2,
    color: "#E91E63",
  },
};
