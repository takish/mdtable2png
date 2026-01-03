import type { ScoreBlockData } from "../core/entities/BlockData.js";
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
 * 音名をVexFlow形式に変換
 * 例: "D" -> "d/4", "C#" -> "c#/4"
 */
function noteToVexFlow(note: string, octave = 4): string {
  const cleaned = note.trim().toLowerCase();
  return `${cleaned}/${octave}`;
}

/**
 * 楽譜ブロックのHTML生成（VexFlow SVG埋め込み）
 */
export function buildScoreHtml(data: ScoreBlockData, options: RenderOptions): string {
  const { color } = options;

  const titleHtml = data.title ? `<div class="title">${escapeHtml(data.title)}</div>` : "";

  const keyHtml = data.key ? `<div class="key">Key: ${escapeHtml(data.key)}</div>` : "";

  const noteHtml = data.note ? `<div class="note">${escapeHtml(data.note)}</div>` : "";

  // VexFlow用のデータを準備
  const bassNotes = data.bass ?? [];
  const chordNames = data.chords ?? [];
  const measureCount = Math.max(bassNotes.length, chordNames.length, 1);

  // VexFlowでの描画用にJSON形式でデータを埋め込み
  const scoreData = JSON.stringify({
    bass: bassNotes,
    chords: chordNames,
    key: data.key ?? "C",
    measureCount,
  });

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.jsdelivr.net/npm/vexflow@4.2.3/build/cjs/vexflow.js"></script>
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

    #score {
      display: flex;
      justify-content: center;
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
      <div id="score"></div>
      ${noteHtml}
      ${keyHtml}
    </div>
  </div>

  <script>
    const scoreData = ${scoreData};

    // VexFlowを使用して楽譜を描画
    const { Renderer, Stave, StaveNote, Voice, Formatter, Annotation } = Vex.Flow;

    const div = document.getElementById('score');
    const measureWidth = 120;
    const totalWidth = measureWidth * scoreData.measureCount + 80;
    const renderer = new Renderer(div, Renderer.Backends.SVG);
    renderer.resize(totalWidth, 150);
    const context = renderer.getContext();
    context.setFont('Arial', 10);

    // 各小節を描画
    for (let i = 0; i < scoreData.measureCount; i++) {
      const x = 10 + i * measureWidth;
      const stave = new Stave(x, 40, measureWidth);

      // 最初の小節にのみ音部記号を表示
      if (i === 0) {
        stave.addClef('bass');
      }

      stave.setContext(context).draw();

      // ベース音がある場合は音符を描画
      if (scoreData.bass[i]) {
        const noteName = scoreData.bass[i].toLowerCase();
        const note = new StaveNote({
          clef: 'bass',
          keys: [noteName + '/3'],
          duration: 'w',
        });

        // コード名をアノテーションとして追加
        if (scoreData.chords[i]) {
          note.addModifier(
            new Annotation(scoreData.chords[i])
              .setVerticalJustification(Annotation.VerticalJustify.TOP)
              .setFont('Arial', 14, 'bold'),
            0
          );
        }

        const voice = new Voice({ num_beats: 4, beat_value: 4 });
        voice.addTickables([note]);

        new Formatter().joinVoices([voice]).format([voice], measureWidth - 20);
        voice.draw(context, stave);
      } else if (scoreData.chords[i]) {
        // ベース音がなくてコードのみの場合はテキストで表示
        context.fillText(scoreData.chords[i], x + measureWidth / 2 - 20, 30);
      }
    }
  </script>
</body>
</html>`;
}
