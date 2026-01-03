import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import type { TableData } from "../core/entities/TableData.js";

type MdastNode = {
  type: string;
  children?: MdastNode[];
  value?: string;
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
