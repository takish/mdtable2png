import type { RenderOptions, TableData } from "../core/entities/TableData.js";

/**
 * テーブルデータをHTML行に変換
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * テーブルデータから完全なHTML文書を生成
 */
export function buildHtml(table: TableData, options: RenderOptions): string {
  const { color } = options;

  const headerCells = table.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");

  const bodyRows = table.rows
    .map((row, i) => {
      const cells = row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("");
      const rowClass = i % 2 === 0 ? "row-odd" : "row-even";
      return `<tr class="${rowClass}">${cells}</tr>`;
    })
    .join("");

  const captionHtml = table.caption
    ? `<div class="caption">${escapeHtml(table.caption)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    :root {
      --theme-color: ${color};
      --header-bg: ${color};
      --header-text: #FFFFFF;
      --row-odd: #FFFFFF;
      --row-even: #FAFAFA;
      --border-color: #E0E0E0;
      --text-color: #333333;
      --accent-width: 6px;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: var(--text-color);
      background: transparent;
    }

    .container {
      display: inline-block;
      position: relative;
    }

    .accent-line {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: var(--accent-width);
      background: var(--theme-color);
    }

    .caption {
      background: var(--theme-color);
      color: var(--header-text);
      padding: 12px 16px 12px calc(var(--accent-width) + 16px);
      font-size: 16px;
      font-weight: bold;
    }

    table {
      border-collapse: collapse;
      width: 100%;
      margin-left: var(--accent-width);
    }

    th, td {
      padding: 12px 16px;
      text-align: center;
      border: 1px solid var(--border-color);
    }

    th {
      background: var(--header-bg);
      color: var(--header-text);
      font-size: 15px;
      font-weight: 600;
    }

    td {
      font-size: 14px;
    }

    tr.row-odd td {
      background: var(--row-odd);
    }

    tr.row-even td {
      background: var(--row-even);
    }

    /* アクセントラインの調整（キャプションなしの場合） */
    .no-caption table {
      border-left: var(--accent-width) solid var(--theme-color);
      margin-left: 0;
    }

    .no-caption th:first-child,
    .no-caption td:first-child {
      border-left: none;
    }
  </style>
</head>
<body>
  <div class="container ${table.caption ? "" : "no-caption"}">
    ${table.caption ? '<div class="accent-line"></div>' : ""}
    ${captionHtml}
    <table>
      <thead>
        <tr>${headerCells}</tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}
