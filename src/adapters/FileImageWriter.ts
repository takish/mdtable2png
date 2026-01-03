import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { ImageWriterPort } from "../ports/ImageWriterPort.js";

/**
 * ファイルシステムへの画像書き込みアダプター
 */
export class FileImageWriter implements ImageWriterPort {
  async write(buffer: Buffer, filePath: string): Promise<void> {
    // ディレクトリが存在しない場合は作成
    await this.ensureDir(dirname(filePath));
    await writeFile(filePath, buffer);
  }

  async ensureDir(dirPath: string): Promise<void> {
    await mkdir(dirPath, { recursive: true });
  }
}
