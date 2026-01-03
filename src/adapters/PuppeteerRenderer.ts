import puppeteer, { type Browser, type Page } from "puppeteer";
import type { RenderOptions, TableData } from "../core/entities/TableData.js";
import { buildHtml } from "../infrastructure/htmlBuilder.js";
import type { TableRendererPort } from "../ports/TableRendererPort.js";

/**
 * Puppeteer を使用したテーブルレンダラー
 */
export class PuppeteerRenderer implements TableRendererPort {
  private browser: Browser | null = null;

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }
    return this.browser;
  }

  async render(table: TableData, options: RenderOptions): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page: Page = await browser.newPage();

    try {
      const html = buildHtml(table, options);

      // viewport 設定
      await page.setViewport({
        width: options.width,
        height: 100, // 初期値（後で実際の高さに調整）
        deviceScaleFactor: options.scale,
      });

      await page.setContent(html, { waitUntil: "networkidle0" });

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
