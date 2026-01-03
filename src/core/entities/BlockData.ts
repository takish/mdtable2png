/**
 * ブロックタイプ定義
 */
export type BlockType = "table" | "prog" | "deg" | "score";

/**
 * ソース位置情報
 */
export interface SourceLocation {
  /** ファイルパス */
  file: string;
  /** 開始行 */
  startLine: number;
  /** 終了行 */
  endLine: number;
}

/**
 * 基底ブロックデータ
 */
interface BaseBlockData {
  /** ブロックタイプ */
  type: BlockType;
  /** 出現順序（1始まり） */
  index: number;
  /** タイトル */
  title?: string;
  /** ソース位置 */
  source?: SourceLocation;
}

/**
 * テーブルブロック（既存互換）
 */
export interface TableBlockData extends BaseBlockData {
  type: "table";
  /** 直前見出し（キャプション、title と互換） */
  caption?: string;
  /** ヘッダー行 */
  headers: string[];
  /** データ行 */
  rows: string[][];
}

/**
 * コード進行ブロック
 * 例: Dm7 → G7 → Cmaj7
 */
export interface ProgBlockData extends BaseBlockData {
  type: "prog";
  /** キー（調） */
  key?: string;
  /** コード進行（矢印区切り） */
  chords: string[];
  /** 注釈 */
  note?: string;
}

/**
 * 度数進行ブロック
 * 例: 3m - 4 - 5 - 6m
 */
export interface DegBlockData extends BaseBlockData {
  type: "deg";
  /** キー（調） */
  key?: string;
  /** 度数進行（ハイフン区切り） */
  degrees: string[];
  /** 注釈 */
  note?: string;
}

/**
 * 楽譜ブロック
 */
export interface ScoreBlockData extends BaseBlockData {
  type: "score";
  /** キー（調） */
  key?: string;
  /** コード名配列 */
  chords?: string[];
  /** ベース音配列 */
  bass?: string[];
  /** 注釈 */
  note?: string;
}

/**
 * 全ブロックタイプの Union 型
 */
export type BlockData = TableBlockData | ProgBlockData | DegBlockData | ScoreBlockData;

/**
 * manifest.json の構造
 */
export interface Manifest {
  /** 入力ファイルパス */
  input: string;
  /** 生成日時（ISO8601） */
  generatedAt: string;
  /** 生成アイテム一覧 */
  items: ManifestItem[];
}

/**
 * manifest アイテム（再生成可能な完全データを保持）
 */
export interface ManifestItem {
  /** 出現順序 */
  index: number;
  /** ブロックタイプ */
  type: BlockType;
  /** タイトル */
  title?: string;
  /** キー（調） */
  key?: string;
  /** 出力ファイル名 */
  output: string;
  /** ソース位置 */
  source?: SourceLocation;
  /** 注釈 */
  note?: string;

  // ブロックタイプ別データ
  /** コード進行（prog用） */
  chords?: string[];
  /** 度数進行（deg用） */
  degrees?: string[];
  /** ベース音（score用） */
  bass?: string[];
  /** テーブルヘッダー（table用） */
  headers?: string[];
  /** テーブル行（table用） */
  rows?: string[][];
}

/**
 * タイプガード関数
 */
export function isTableBlock(block: BlockData): block is TableBlockData {
  return block.type === "table";
}

export function isProgBlock(block: BlockData): block is ProgBlockData {
  return block.type === "prog";
}

export function isDegBlock(block: BlockData): block is DegBlockData {
  return block.type === "deg";
}

export function isScoreBlock(block: BlockData): block is ScoreBlockData {
  return block.type === "score";
}

/**
 * ManifestItem から BlockData に変換（再生成用）
 */
export function manifestItemToBlockData(item: ManifestItem): BlockData {
  const base = {
    index: item.index,
    title: item.title,
    source: item.source,
  };

  switch (item.type) {
    case "table":
      return {
        ...base,
        type: "table",
        caption: item.title,
        headers: item.headers ?? [],
        rows: item.rows ?? [],
      } as TableBlockData;

    case "prog":
      return {
        ...base,
        type: "prog",
        key: item.key,
        chords: item.chords ?? [],
        note: item.note,
      } as ProgBlockData;

    case "deg":
      return {
        ...base,
        type: "deg",
        key: item.key,
        degrees: item.degrees ?? [],
        note: item.note,
      } as DegBlockData;

    case "score":
      return {
        ...base,
        type: "score",
        key: item.key,
        chords: item.chords,
        bass: item.bass,
        note: item.note,
      } as ScoreBlockData;
  }
}
