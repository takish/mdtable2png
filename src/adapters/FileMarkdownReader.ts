import { readFile } from "node:fs/promises";
import type { TableData } from "../core/entities/TableData.js";
import { parseMarkdown } from "../infrastructure/remarkParser.js";
import type { MarkdownReaderPort } from "../ports/MarkdownReaderPort.js";

/**
 * ファイルシステムからMarkdownを読み込むアダプター
 */
export class FileMarkdownReader implements MarkdownReaderPort {
  async read(path: string): Promise<TableData[]> {
    const content = await readFile(path, "utf-8");
    return parseMarkdown(content);
  }
}
