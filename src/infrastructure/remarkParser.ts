import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import type {
  BlockData,
  BlockType,
  DegBlockData,
  ProgBlockData,
  ScoreBlockData,
  SourceLocation,
  TableBlockData,
} from "../core/entities/BlockData.js";
import type { TableData } from "../core/entities/TableData.js";

type MdastNode = {
  type: string;
  children?: MdastNode[];
  value?: string;
  position?: {
    start: { line: number; column: number; offset: number };
    end: { line: number; column: number; offset: number };
  };
};

type CodeNode = MdastNode & {
  type: "code";
  lang?: string;
  value: string;
};

type TableNode = MdastNode & {
  type: "table";
  children: TableRowNode[];
};

type TableRowNode = MdastNode & {
  type: "tableRow";
  children: TableCellNode[];
};

type TableCellNode = MdastNode & {
  type: "tableCell";
  children: MdastNode[];
};

type HeadingNode = MdastNode & {
  type: "heading";
  depth: number;
  children: MdastNode[];
};

type RootNode = MdastNode & {
  type: "root";
  children: MdastNode[];
};

/**
 * AST ノードからテキストを再帰的に抽出
 */
function extractText(node: MdastNode): string {
  if (node.value) {
    return node.value;
  }
  if (node.children) {
    return node.children.map(extractText).join("");
  }
  return "";
}

/**
 * テーブルノードを TableData に変換
 */
function tableNodeToData(node: TableNode, index: number, caption?: string): TableData {
  const rows = node.children;
  if (rows.length === 0) {
    return { index, caption, headers: [], rows: [] };
  }

  const headerRow = rows[0];
  const headers = (headerRow.children ?? []).map((cell) => extractText(cell));

  const dataRows = rows.slice(1).map((row) => {
    return (row.children ?? []).map((cell) => extractText(cell));
  });

  return { index, caption, headers, rows: dataRows };
}

/**
 * Markdown テキストを解析してテーブルデータを抽出
 */
export function parseMarkdown(markdown: string): TableData[] {
  const processor = unified().use(remarkParse).use(remarkGfm);

  const tree = processor.parse(markdown) as RootNode;
  const tables: TableData[] = [];
  let tableIndex = 1;

  visit(tree, "table", (node: TableNode, index: number | undefined, parent: MdastNode | null) => {
    let caption: string | undefined;

    // 直前のノードが heading なら caption として取得
    if (parent?.children && typeof index === "number" && index > 0) {
      const prevNode = parent.children[index - 1];
      if (prevNode.type === "heading") {
        caption = extractText(prevNode as HeadingNode);
      }
    }

    tables.push(tableNodeToData(node, tableIndex, caption));
    tableIndex++;
  });

  return tables;
}

/**
 * 有効なブロックタイプかチェック
 */
const VALID_BLOCK_TYPES: BlockType[] = ["prog", "deg", "table", "score"];

function isValidBlockType(lang: string | undefined): lang is BlockType {
  return lang !== undefined && VALID_BLOCK_TYPES.includes(lang as BlockType);
}

/**
 * フロントマター形式のブロック内容を解析
 * 形式:
 *   title: xxx
 *   key: C
 *   note: yyy
 *   ---
 *   本文
 */
interface ParsedBlockContent {
  title?: string;
  key?: string;
  note?: string;
  body: string;
}

function parseBlockContent(value: string): ParsedBlockContent {
  const lines = value.split("\n");
  const result: ParsedBlockContent = { body: "" };

  let i = 0;
  let hasFrontmatter = false;

  // フロントマター部分を解析
  while (i < lines.length) {
    const line = lines[i].trim();

    // 区切り線で本文開始
    if (line === "---") {
      hasFrontmatter = true;
      i++;
      break;
    }

    // key: value 形式を解析
    const match = line.match(/^(title|key|note):\s*(.*)$/i);
    if (match) {
      const [, key, val] = match;
      const normalizedKey = key.toLowerCase() as "title" | "key" | "note";
      result[normalizedKey] = val.trim();
      i++;
    } else if (line === "") {
      // 空行はスキップ
      i++;
    } else {
      // フロントマター以外の行が来たら本文開始
      break;
    }
  }

  // 残りは本文
  result.body = lines.slice(i).join("\n").trim();

  return result;
}

/**
 * コード進行文字列をコード配列に分割
 * 例: "Dm7 → G7 → Cmaj7" => ["Dm7", "G7", "Cmaj7"]
 */
function parseChordProgression(body: string): string[] {
  // 矢印（→, ->, -, |）で分割
  return body
    .split(/\s*(?:→|->|–|—|\|)\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * 度数進行文字列を度数配列に分割
 * 例: "3m - 4 - 5 - 6m" => ["3m", "4", "5", "6m"]
 */
function parseDegreeProgression(body: string): string[] {
  return body
    .split(/\s*[-–—]\s*/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * 楽譜ブロックの bass/chords を解析
 */
function parseScoreContent(content: ParsedBlockContent): {
  chords?: string[];
  bass?: string[];
} {
  const result: { chords?: string[]; bass?: string[] } = {};

  const lines = content.body.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    const bassMatch = trimmed.match(/^bass:\s*(.+)$/i);
    if (bassMatch) {
      result.bass = bassMatch[1].split(/\s+/).filter((s) => s.length > 0);
      continue;
    }
    const chordsMatch = trimmed.match(/^chords:\s*(.+)$/i);
    if (chordsMatch) {
      result.chords = chordsMatch[1].split(/\s+/).filter((s) => s.length > 0);
    }
  }

  return result;
}

/**
 * コードノードを ProgBlockData に変換
 */
function codeNodeToProgData(node: CodeNode, index: number, filePath: string): ProgBlockData {
  const content = parseBlockContent(node.value);
  const source: SourceLocation | undefined = node.position
    ? { file: filePath, startLine: node.position.start.line, endLine: node.position.end.line }
    : undefined;

  return {
    type: "prog",
    index,
    title: content.title,
    key: content.key,
    chords: parseChordProgression(content.body),
    note: content.note,
    source,
  };
}

/**
 * コードノードを DegBlockData に変換
 */
function codeNodeToDegData(node: CodeNode, index: number, filePath: string): DegBlockData {
  const content = parseBlockContent(node.value);
  const source: SourceLocation | undefined = node.position
    ? { file: filePath, startLine: node.position.start.line, endLine: node.position.end.line }
    : undefined;

  return {
    type: "deg",
    index,
    title: content.title,
    key: content.key,
    degrees: parseDegreeProgression(content.body),
    note: content.note,
    source,
  };
}

/**
 * コードノードを ScoreBlockData に変換
 */
function codeNodeToScoreData(node: CodeNode, index: number, filePath: string): ScoreBlockData {
  const content = parseBlockContent(node.value);
  const scoreContent = parseScoreContent(content);
  const source: SourceLocation | undefined = node.position
    ? { file: filePath, startLine: node.position.start.line, endLine: node.position.end.line }
    : undefined;

  return {
    type: "score",
    index,
    title: content.title,
    key: content.key,
    chords: scoreContent.chords,
    bass: scoreContent.bass,
    note: content.note,
    source,
  };
}

/**
 * テーブルノードを TableBlockData に変換
 */
function tableNodeToBlockData(
  node: TableNode,
  index: number,
  caption: string | undefined,
  filePath: string,
): TableBlockData {
  const rows = node.children;
  const source: SourceLocation | undefined = node.position
    ? { file: filePath, startLine: node.position.start.line, endLine: node.position.end.line }
    : undefined;

  if (rows.length === 0) {
    return { type: "table", index, title: caption, caption, headers: [], rows: [], source };
  }

  const headerRow = rows[0];
  const headers = (headerRow.children ?? []).map((cell) => extractText(cell));

  const dataRows = rows.slice(1).map((row) => {
    return (row.children ?? []).map((cell) => extractText(cell));
  });

  return { type: "table", index, title: caption, caption, headers, rows: dataRows, source };
}

/**
 * fenced code block 内のテーブルを解析
 * table ブロック内に Markdown テーブルが記述されている場合
 */
function parseFencedTableBlock(node: CodeNode, index: number, filePath: string): TableBlockData {
  const content = parseBlockContent(node.value);
  const source: SourceLocation | undefined = node.position
    ? { file: filePath, startLine: node.position.start.line, endLine: node.position.end.line }
    : undefined;

  // 本文を再パースしてテーブルを抽出
  const innerTables = parseMarkdown(content.body);
  if (innerTables.length > 0) {
    const firstTable = innerTables[0];
    return {
      type: "table",
      index,
      title: content.title || firstTable.caption,
      caption: content.title || firstTable.caption,
      headers: firstTable.headers,
      rows: firstTable.rows,
      source,
    };
  }

  // テーブルが見つからない場合は空のテーブルを返す
  return {
    type: "table",
    index,
    title: content.title,
    caption: content.title,
    headers: [],
    rows: [],
    source,
  };
}

// ============================================
// プレーンテキスト自動検出機能
// ============================================

/**
 * コードネームの正規表現パターン
 * 例: Dm7, G7, Cmaj7, F#m7, Bb7, C/E, A♭7
 */
const CHORD_PATTERN =
  /^[A-G][#♯b♭]?(m|maj|min|dim|aug|sus|add|M|7|9|11|13|6)*(\([^)]*\))?(\/[A-G][#♯b♭]?)?$/;

/**
 * 音名の正規表現パターン
 * 例: ド, レ♭, ソ#
 */
const NOTE_NAME_PATTERN = /^(ド|レ|ミ|ファ|ソ|ラ|シ)[♭♯#b]?$/;

/**
 * 矢印区切りパターン
 */
const ARROW_SEPARATOR = /\s*(?:→|->)\s*/;

/**
 * テキストがコード進行かどうかを判定
 */
function isChordProgression(text: string): boolean {
  // 矢印で分割
  const parts = text.split(ARROW_SEPARATOR);
  if (parts.length < 2) return false;

  // すべてのパーツがコードネームにマッチするか確認
  const validChords = parts.filter((p) => CHORD_PATTERN.test(p.trim()));

  // 80%以上がコードネームにマッチすること
  return validChords.length >= 2 && validChords.length / parts.length >= 0.8;
}

/**
 * テキストが音名進行かどうかを判定
 */
function isNoteNameProgression(text: string): boolean {
  // 矢印で分割
  const parts = text.split(ARROW_SEPARATOR);
  if (parts.length < 2) return false;

  // すべてのパーツが音名にマッチするか確認
  const validNotes = parts.filter((p) => NOTE_NAME_PATTERN.test(p.trim()));

  // 80%以上が音名にマッチすること
  return validNotes.length >= 2 && validNotes.length / parts.length >= 0.8;
}

/**
 * コード進行テキストからコード配列を抽出
 */
function extractChordsFromText(text: string): string[] {
  return text
    .split(ARROW_SEPARATOR)
    .map((s) => s.trim())
    .filter((s) => CHORD_PATTERN.test(s));
}

/**
 * 音名進行テキストから音名配列を抽出
 */
function extractNoteNamesFromText(text: string): string[] {
  return text
    .split(ARROW_SEPARATOR)
    .map((s) => s.trim())
    .filter((s) => NOTE_NAME_PATTERN.test(s));
}

/**
 * 直前のノードからタイトルを推定
 * 見出しまたは太字テキストを探す
 */
function findPrecedingTitle(parent: MdastNode, currentIndex: number): string | undefined {
  if (!parent.children || currentIndex <= 0) return undefined;

  // 直前のノードをチェック
  for (let i = currentIndex - 1; i >= 0 && i >= currentIndex - 3; i--) {
    const prevNode = parent.children[i];

    // 見出しの場合
    if (prevNode.type === "heading") {
      return extractText(prevNode);
    }

    // 段落の場合、太字を探す
    if (prevNode.type === "paragraph" && prevNode.children) {
      for (const child of prevNode.children) {
        if (child.type === "strong") {
          return extractText(child);
        }
      }
    }
  }

  return undefined;
}

type ParagraphNode = MdastNode & {
  type: "paragraph";
  children: MdastNode[];
};

type TextNode = MdastNode & {
  type: "text";
  value: string;
};

/**
 * プレーンテキストからコード進行・音名進行を自動検出
 */
function detectPlainTextBlocks(
  tree: RootNode,
  filePath: string,
  startIndex: number,
  targetTypes: BlockType[],
): BlockData[] {
  const blocks: BlockData[] = [];
  let blockIndex = startIndex;

  // 段落ノードを走査
  visit(
    tree,
    "paragraph",
    (node: ParagraphNode, index: number | undefined, parent: MdastNode | null) => {
      if (!node.children) return;

      // テキストノードを探す
      for (const child of node.children) {
        if (child.type !== "text") continue;

        const textNode = child as TextNode;
        const text = textNode.value.trim();

        // 空行やコードブロック内は除外
        if (!text || text.length < 5) continue;

        // 行ごとに処理（リスト項目の説明部分対応）
        const lines = text.split("\n");
        for (const line of lines) {
          let targetText = line.trim();

          // "- 通常: レ → ソ → ド" のような形式から進行部分を抽出
          const colonMatch = targetText.match(/^[-*]?\s*[^:：]+[：:]\s*(.+)$/);
          if (colonMatch) {
            targetText = colonMatch[1].trim();
          }

          // コード進行の検出
          if (targetTypes.includes("prog") && isChordProgression(targetText)) {
            const source: SourceLocation | undefined = node.position
              ? {
                  file: filePath,
                  startLine: node.position.start.line,
                  endLine: node.position.end.line,
                }
              : undefined;

            const title = parent ? findPrecedingTitle(parent, index ?? 0) : undefined;

            blocks.push({
              type: "prog",
              index: blockIndex++,
              title,
              chords: extractChordsFromText(targetText),
              source,
            });
            continue;
          }

          // 音名進行の検出（degタイプとして扱う）
          if (targetTypes.includes("deg") && isNoteNameProgression(targetText)) {
            const source: SourceLocation | undefined = node.position
              ? {
                  file: filePath,
                  startLine: node.position.start.line,
                  endLine: node.position.end.line,
                }
              : undefined;

            const title = parent ? findPrecedingTitle(parent, index ?? 0) : undefined;

            blocks.push({
              type: "deg",
              index: blockIndex++,
              title,
              degrees: extractNoteNamesFromText(targetText),
              source,
            });
          }
        }
      }
    },
  );

  return blocks;
}

/**
 * Markdown テキストを解析して全ブロックデータを抽出
 * @param markdown Markdown テキスト
 * @param filePath ファイルパス（ソース位置情報用）
 * @param types 抽出対象のブロックタイプ（省略時は全タイプ）
 * @param autoDetect プレーンテキストからの自動検出を有効にする（デフォルト: true）
 */
export function parseMarkdownBlocks(
  markdown: string,
  filePath = "",
  types?: BlockType[],
  autoDetect = true,
): BlockData[] {
  const processor = unified().use(remarkParse).use(remarkGfm);
  const tree = processor.parse(markdown) as RootNode;
  const blocks: BlockData[] = [];
  let blockIndex = 1;

  const targetTypes = types ?? VALID_BLOCK_TYPES;

  // fenced code block を走査（prog, deg, score, table ブロック）
  visit(tree, "code", (node: CodeNode) => {
    if (!isValidBlockType(node.lang) || !targetTypes.includes(node.lang)) {
      return;
    }

    switch (node.lang) {
      case "prog":
        blocks.push(codeNodeToProgData(node, blockIndex++, filePath));
        break;
      case "deg":
        blocks.push(codeNodeToDegData(node, blockIndex++, filePath));
        break;
      case "score":
        blocks.push(codeNodeToScoreData(node, blockIndex++, filePath));
        break;
      case "table":
        blocks.push(parseFencedTableBlock(node, blockIndex++, filePath));
        break;
    }
  });

  // 通常の GFM テーブルも走査（types に table が含まれる場合）
  if (targetTypes.includes("table")) {
    visit(tree, "table", (node: TableNode, index: number | undefined, parent: MdastNode | null) => {
      let caption: string | undefined;

      if (parent?.children && typeof index === "number" && index > 0) {
        const prevNode = parent.children[index - 1];
        if (prevNode.type === "heading") {
          caption = extractText(prevNode as HeadingNode);
        }
      }

      blocks.push(tableNodeToBlockData(node, blockIndex++, caption, filePath));
    });
  }

  // プレーンテキストからの自動検出（autoDetect が true の場合）
  if (autoDetect) {
    const plainTextBlocks = detectPlainTextBlocks(tree, filePath, blockIndex, targetTypes);
    blocks.push(...plainTextBlocks);
  }

  return blocks;
}
