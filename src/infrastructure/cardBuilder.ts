import type { DegBlockData, ProgBlockData } from "../core/entities/BlockData.js";
import type { RenderOptions } from "../core/entities/TableData.js";

/**
 * HTMLエスケープ
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
 * コード進行カードのHTML生成
 */
export function buildProgCardHtml(data: ProgBlockData, options: RenderOptions): string {
  const { color } = options;

  // コード進行を矢印で連結
  const chordsHtml = data.chords
    .map((chord) => `<span class="chord">${escapeHtml(chord)}</span>`)
    .join('<span class="arrow">→</span>');

  const titleHtml = data.title ? `<div class="title">${escapeHtml(data.title)}</div>` : "";

  const keyHtml = data.key ? `<div class="key">Key: ${escapeHtml(data.key)}</div>` : "";

  const noteHtml = data.note ? `<div class="note">${escapeHtml(data.note)}</div>` : "";

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap');

    :root {
      --theme-color: ${color};
      --bg-color: #FFFFFF;
      --text-color: #333333;
      --note-color: #666666;
      --border-radius: 12px;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: "Noto Sans JP", system-ui, -apple-system, sans-serif;
      color: var(--text-color);
      background: transparent;
    }

    .container {
      display: inline-block;
      background: var(--bg-color);
      border-radius: var(--border-radius);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .title {
      background: var(--theme-color);
      color: #FFFFFF;
      padding: 16px 48px;
      font-size: 18px;
      font-weight: 700;
    }

    .content {
      padding: 32px 48px;
    }

    .progression {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .chord {
      font-size: 28px;
      font-weight: 700;
      color: var(--text-color);
    }

    .arrow {
      font-size: 24px;
      color: var(--theme-color);
      font-weight: 400;
    }

    .note {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #E0E0E0;
      font-size: 14px;
      color: var(--note-color);
      text-align: center;
    }

    .key {
      margin-top: 16px;
      font-size: 13px;
      color: var(--note-color);
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    ${titleHtml}
    <div class="content">
      <div class="progression">
        ${chordsHtml}
      </div>
      ${noteHtml}
      ${keyHtml}
    </div>
  </div>
</body>
</html>`;
}

/**
 * 度数進行カードのHTML生成
 */
export function buildDegCardHtml(data: DegBlockData, options: RenderOptions): string {
  const { color } = options;

  // 度数進行をハイフンで連結
  const degreesHtml = data.degrees
    .map((deg) => `<span class="degree">${escapeHtml(deg)}</span>`)
    .join('<span class="separator">–</span>');

  const titleHtml = data.title ? `<div class="title">${escapeHtml(data.title)}</div>` : "";

  const keyHtml = data.key ? `<div class="key">Key: ${escapeHtml(data.key)}</div>` : "";

  const noteHtml = data.note ? `<div class="note">${escapeHtml(data.note)}</div>` : "";

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap');

    :root {
      --theme-color: ${color};
      --bg-color: #FFFFFF;
      --text-color: #333333;
      --note-color: #666666;
      --border-radius: 12px;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: "Noto Sans JP", system-ui, -apple-system, sans-serif;
      color: var(--text-color);
      background: transparent;
    }

    .container {
      display: inline-block;
      background: var(--bg-color);
      border-radius: var(--border-radius);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .title {
      background: var(--theme-color);
      color: #FFFFFF;
      padding: 16px 48px;
      font-size: 18px;
      font-weight: 700;
    }

    .content {
      padding: 32px 48px;
    }

    .progression {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .degree {
      font-size: 32px;
      font-weight: 700;
      color: var(--text-color);
      min-width: 48px;
      text-align: center;
    }

    .separator {
      font-size: 24px;
      color: #CCCCCC;
      font-weight: 300;
    }

    .note {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #E0E0E0;
      font-size: 14px;
      color: var(--note-color);
      text-align: center;
    }

    .key {
      margin-top: 16px;
      font-size: 13px;
      color: var(--note-color);
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    ${titleHtml}
    <div class="content">
      <div class="progression">
        ${degreesHtml}
      </div>
      ${noteHtml}
      ${keyHtml}
    </div>
  </div>
</body>
</html>`;
}
