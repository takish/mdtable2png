import puppeteer, { type Browser, type Page } from "puppeteer";
import type {
  BlockData,
  DegBlockData,
  ProgBlockData,
  ScoreBlockData,
  TableBlockData,
} from "../core/entities/BlockData.js";
import type { RenderOptions } from "../core/entities/TableData.js";
import { buildDegCardHtml, buildProgCardHtml } from "../infrastructure/cardBuilder.js";
import { buildHtml } from "../infrastructure/htmlBuilder.js";
import { buildScoreHtml } from "../infrastructure/scoreBuilder.js";
import type { BlockRendererPort } from "../ports/BlockRendererPort.js";

/**
 * 全ブロックタイプを Puppeteer でレンダリングするアダプター
 */
export class BlockRenderer implements BlockRendererPort {
  private browser: Browser | null = null;

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
      });
    }
    return this.browser;
  }

  /**
   * ブロックタイプに応じた HTML を生成
   */
  private buildHtmlForBlock(block: BlockData, options: RenderOptions): string {
    switch (block.type) {
      case "table":
        // TableBlockData を TableData 形式に変換
        return buildHtml(
          {
            index: block.index,
            caption: (block as TableBlockData).caption,
            headers: (block as TableBlockData).headers,
            rows: (block as TableBlockData).rows,
          },
          options,
        );
      case "prog":
        return buildProgCardHtml(block as ProgBlockData, options);
      case "deg":
        return buildDegCardHtml(block as DegBlockData, options);
      case "score":
        return buildScoreHtml(block as ScoreBlockData, options);
      default:
        throw new Error(`Unknown block type: ${(block as BlockData).type}`);
    }
  }

  async render(block: BlockData, options: RenderOptions): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page: Page = await browser.newPage();

    try {
      const html = this.buildHtmlForBlock(block, options);

      // viewport 設定
      await page.setViewport({
        width: options.width,
        height: 100, // 初期値（後で実際の高さに調整）
        deviceScaleFactor: options.scale,
      });

      // score タイプの場合は VexFlow のロードを待つ
      const waitUntil = block.type === "score" ? "networkidle0" : "domcontentloaded";
      await page.setContent(html, { waitUntil });

      // VexFlow の描画が完了するまで少し待機（score の場合）
      if (block.type === "score") {
        await page.waitForSelector("#score svg", { timeout: 5000 }).catch(() => {
          // SVG が見つからなくても続行（コードのみの場合もある）
        });
      }

      // コンテンツの実際のサイズを取得
      const clip = await page.evaluate(() => {
        const container = document.querySelector(".container");
        if (!container) {
          throw new Error("Container not found");
        }
        const rect = container.getBoundingClientRect();
        return {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        };
      });

      // スクリーンショット取得
      const buffer = await page.screenshot({
        type: "png",
        clip,
        omitBackground: true,
      });

      return Buffer.from(buffer);
    } finally {
      await page.close();
    }
  }

  async dispose(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
