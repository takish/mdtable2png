import type { BlockData, Manifest, ManifestItem } from "../core/entities/BlockData.js";

/**
 * ファイル名を生成（タイプ別プレフィックス）
 * 例: prog-01-通常のII-V-I.png
 */
export function generateBlockFilename(block: BlockData): string {
  const { type, index } = block;
  const paddedIndex = String(index).padStart(2, "0");

  // タイトルを取得（type に応じて）
  let title = "";
  if ("title" in block && block.title) {
    title = block.title;
  } else if ("caption" in block && block.caption) {
    title = block.caption;
  }

  // ファイル名をサニタイズ
  const sanitized = sanitizeFilename(title);

  if (sanitized) {
    return `${type}-${paddedIndex}-${sanitized}.png`;
  }
  return `${type}-${paddedIndex}.png`;
}

/**
 * ファイル名のサニタイズ
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\?%*:|"<>]/g, "") // 禁止文字を削除
    .replace(/\s+/g, "-") // スペースをハイフンに
    .substring(0, 50) // 最大50文字
    .trim();
}

/**
 * BlockData から ManifestItem を生成（完全データを保持）
 */
function blockToManifestItem(block: BlockData, filename: string): ManifestItem {
  const item: ManifestItem = {
    index: block.index,
    type: block.type,
    output: filename,
  };

  // タイトルを追加
  if ("title" in block && block.title) {
    item.title = block.title;
  } else if ("caption" in block && block.caption) {
    item.title = block.caption;
  }

  // キーを追加
  if ("key" in block && block.key) {
    item.key = block.key;
  }

  // 注釈を追加
  if ("note" in block && block.note) {
    item.note = block.note;
  }

  // ソース位置を追加
  if (block.source) {
    item.source = block.source;
  }

  // タイプ別データを追加
  switch (block.type) {
    case "table":
      item.headers = block.headers;
      item.rows = block.rows;
      break;
    case "prog":
      item.chords = block.chords;
      break;
    case "deg":
      item.degrees = block.degrees;
      break;
    case "score":
      item.chords = block.chords;
      item.bass = block.bass;
      break;
  }

  return item;
}

/**
 * Manifest を生成
 */
export function buildManifest(
  inputPath: string,
  blocks: BlockData[],
  filenames: string[],
): Manifest {
  const items = blocks.map((block, i) => blockToManifestItem(block, filenames[i]));

  return {
    input: inputPath,
    generatedAt: new Date().toISOString(),
    items,
  };
}

/**
 * Manifest を JSON 文字列に変換
 */
export function manifestToJson(manifest: Manifest): string {
  return JSON.stringify(manifest, null, 2);
}
