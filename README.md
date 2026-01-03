# mdtable2png

Markdown テーブルを高品質 PNG 画像に変換する CLI ツール

## 特徴

- GFM（GitHub Flavored Markdown）テーブルを自動抽出
- note.com 向けに最適化されたデザイン
- テーマカラーをカスタマイズ可能
- 直前の見出しをキャプションとして自動取得
- 高解像度出力（deviceScaleFactor 対応）

## インストール

```bash
pnpm install
pnpm build
```

## 使用方法

### 基本

```bash
pnpm start --input article.md
```

### オプション

```bash
pnpm start --input article.md \
  --outDir ./out \
  --width 1200 \
  --scale 2 \
  --color "#E91E63"
```

| オプション | 短縮 | 説明 | デフォルト |
|-----------|------|------|-----------|
| `--input` | `-i` | Markdown ファイルパス | 必須 |
| `--outDir` | `-o` | 出力ディレクトリ | `./out` |
| `--width` | `-w` | 画像幅（px） | `1200` |
| `--scale` | `-s` | deviceScaleFactor | `2` |
| `--color` | `-c` | テーマカラー（HEX） | `#E91E63` |
| `--config` | - | 設定ファイルパス | - |

### 設定ファイル

`mdtable2png.config.json`:

```json
{
  "width": 1200,
  "scale": 2,
  "color": "#E91E63",
  "outDir": "./out"
}
```

優先順位: CLI オプション > 設定ファイル > デフォルト値

## 出力例

### 入力（Markdown）

```markdown
## 判断軸

| 項目 | 説明 |
|------|------|
| 優先度 | 高/中/低 |
| 難易度 | 簡単/普通/難しい |
```

### 出力

- `out/table-01-判断軸.png`

## アーキテクチャ

Shell Architecture（Hexagonal Architecture）を採用:

```
┌─────────────────────────────────────┐
│              CLI                     │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│           Use Cases                  │
│     ExtractAndRenderTables           │
└──────────────┬──────────────────────┘
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐
│ Reader │ │Renderer│ │ Writer │
│ (Port) │ │ (Port) │ │ (Port) │
└────┬───┘ └────┬───┘ └────┬───┘
     │          │          │
     ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐
│  File  │ │Puppeteer││  File  │
│Adapter │ │Adapter │ │Adapter │
└────────┘ └────────┘ └────────┘
```

## 開発

```bash
# 型チェック
pnpm typecheck

# Lint
pnpm lint

# Lint + 自動修正
pnpm lint:fix

# ビルド
pnpm build

# 開発モード（watch）
pnpm dev
```

## ライセンス

MIT
