/**
 * 画像書き込みポート
 * 依存性逆転のためのインターフェース定義
 */
export interface ImageWriterPort {
  /**
   * 画像をファイルに書き込み
   * @param buffer 画像データ
   * @param filePath 出力ファイルパス
   */
  write(buffer: Buffer, filePath: string): Promise<void>;

  /**
   * 出力ディレクトリの準備（存在しなければ作成）
   * @param dirPath ディレクトリパス
   */
  ensureDir(dirPath: string): Promise<void>;
}
