/**
 * Game generation utility functions
 * Adapted from DreamCore's utils.ts
 */

/**
 * diffで生成された差分を既存のコンテンツに適用する関数
 * @param existingContent 既存のHTML内容
 * @param diffObject diff形式でパースされた変更内容
 * @returns 更新されたHTML内容
 */
export function applyDiffToContent(
  existingContent: string,
  diffObject: { oldDiff: string; newDiff: string }[]
): string {
  try {
    // パッチが存在しない場合は既存のコンテンツをそのまま返す
    if (diffObject.length === 0) {
      return existingContent;
    }

    // 各パッチを順番に適用
    let updatedContent = existingContent;
    for (const patch of diffObject) {
      // パッチの適用に成功したかどうかのフラグ
      let patchApplied = false;

      // 方法1: 完全一致で置換を試みる
      if (updatedContent.includes(patch.oldDiff)) {
        updatedContent = updatedContent.replace(patch.oldDiff, patch.newDiff);
        patchApplied = true;
      } else {
        // 方法2: トリミングして再試行
        const trimmedOldDiff = patch.oldDiff.trim();
        const trimmedNewDiff = patch.newDiff.trim();

        if (trimmedOldDiff && updatedContent.includes(trimmedOldDiff)) {
          updatedContent = updatedContent.replace(trimmedOldDiff, trimmedNewDiff);
          patchApplied = true;
        } else {
          // 方法3: 空白を正規化して再試行
          const normalizedOldDiff = patch.oldDiff.replace(/\s+/g, " ").trim();
          const normalizedContent = updatedContent.replace(/\s+/g, " ");

          if (normalizedOldDiff && normalizedContent.includes(normalizedOldDiff)) {
            // 正規化されたコンテンツで位置を特定
            const startIndex = normalizedContent.indexOf(normalizedOldDiff);
            if (startIndex >= 0) {
              // 元のコンテンツでの対応する位置を探す
              let originalIndex = 0;
              let normalizedIndex = 0;

              // 正規化インデックスと元のインデックスのマッピングを取得
              while (normalizedIndex < startIndex && originalIndex < updatedContent.length) {
                if (
                  !/\s/.test(updatedContent[originalIndex]) ||
                  (updatedContent[originalIndex] === " " &&
                    normalizedContent[normalizedIndex] === " ")
                ) {
                  normalizedIndex++;
                }
                originalIndex++;
              }

              // 元のコンテンツから対応する部分を抽出
              let originalMatchLength = 0;
              const testContent = updatedContent.substring(originalIndex);

              // 正規化された場合に一致する最短の部分を見つける
              for (let i = 1; i <= testContent.length; i++) {
                const testSlice = testContent.substring(0, i);
                const normalizedSlice = testSlice.replace(/\s+/g, " ").trim();

                if (normalizedSlice === normalizedOldDiff) {
                  originalMatchLength = i;
                  break;
                }
              }

              if (originalMatchLength > 0) {
                // 見つかった部分を置換
                const before = updatedContent.substring(0, originalIndex);
                const after = updatedContent.substring(originalIndex + originalMatchLength);
                updatedContent = before + patch.newDiff + after;
                patchApplied = true;
              }
            }
          }

          // 方法4: 行ごとに分解して比較
          if (!patchApplied) {
            const oldLines = patch.oldDiff.split("\n");
            const newLines = patch.newDiff.split("\n");
            const contentLines = updatedContent.split("\n");

            // 連続する行のパターンを探す
            for (let i = 0; i <= contentLines.length - oldLines.length; i++) {
              let matchCount = 0;

              for (let j = 0; j < oldLines.length; j++) {
                // 空行はスキップ
                if (oldLines[j].trim() === "") continue;

                const contentLine = contentLines[i + j];
                const oldLine = oldLines[j];

                // 行が一致するか、トリミング後に一致する場合はカウント
                if (contentLine === oldLine || contentLine.trim() === oldLine.trim()) {
                  matchCount++;
                } else {
                  break;
                }
              }

              // 十分な行数が一致した場合（80%以上の一致）
              const nonEmptyLines = oldLines.filter((line) => line.trim() !== "").length;
              if (matchCount > 0 && matchCount >= nonEmptyLines * 0.8) {
                // 一致した行を置換
                const before = contentLines.slice(0, i).join("\n");
                const after = contentLines.slice(i + oldLines.length).join("\n");
                updatedContent =
                  before + (before ? "\n" : "") + newLines.join("\n") + (after ? "\n" : "") + after;
                patchApplied = true;
                break;
              }
            }
          }
        }
      }

      if (!patchApplied) {
        console.warn("パッチを適用できませんでした:", patch);
        // デバッグ情報を追加
        console.debug("既存コンテンツの一部:", updatedContent.substring(0, 200) + "...");
        console.debug("oldDiffの長さ:", patch.oldDiff.length);
        console.debug("oldDiffの最初の部分:", patch.oldDiff.substring(0, 100) + "...");
      }
    }

    return updatedContent;
  } catch (error) {
    console.error("Error applying diff:", error);
    return existingContent; // エラーが発生した場合は既存のコンテンツを返す
  }
}

/**
 * パッチテキストを解析し、変更前と変更後のコードを配列として返す関数
 * @param patchText パッチ文字列
 * @returns {{oldDiff: string, newDiff: string}[]} 変更前と変更後のコードの配列
 */
export function DiffTextToObject(patchText: string): { oldDiff: string; newDiff: string }[] {
  // 結果を格納する配列
  const result: { oldDiff: string; newDiff: string }[] = [];

  // パッチを行ごとに分割
  const lines = patchText.split("\n");

  // 現在のハンク（変更ブロック）を追跡
  let currentHunk: { oldDiff: string[]; newDiff: string[] } | null = null;

  // 各行を処理
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ハンクヘッダー（@@ -xxx,xxx +xxx,xxx @@）の場合
    if (line.startsWith("@@")) {
      // 前のハンクがあれば結果に追加
      if (currentHunk) {
        result.push({
          oldDiff: currentHunk.oldDiff.join("\n"),
          newDiff: currentHunk.newDiff.join("\n"),
        });
      }

      // 新しいハンクを開始
      currentHunk = {
        oldDiff: [],
        newDiff: [],
      };
      continue;
    }

    // ハンク内の行を処理
    if (currentHunk) {
      if (line.startsWith("-")) {
        // 削除行
        currentHunk.oldDiff.push(line.substring(1));
      } else if (line.startsWith("+")) {
        // 追加行
        currentHunk.newDiff.push(line.substring(1));
      } else if (line.startsWith(" ")) {
        // 変更なしの行（両方に追加）
        currentHunk.oldDiff.push(line.substring(1));
        currentHunk.newDiff.push(line.substring(1));
      }
      // diffヘッダー行やその他の行は無視
    }
  }

  // 最後のハンクを追加
  if (currentHunk) {
    result.push({
      oldDiff: currentHunk.oldDiff.join("\n"),
      newDiff: currentHunk.newDiff.join("\n"),
    });
  }

  return result;
}

/**
 * diff形式の出力をパースする関数
 */
export function parseDiffContent(diffContent: string): string {
  // ```diffの位置を検索
  const diffStart = diffContent.indexOf("```diff");
  if (diffStart === -1) {
    return diffContent; // ```diffが見つからない場合は元のコンテンツを返す
  }

  // ```diffの後の内容を抽出
  const diffText = diffContent.substring(diffStart);

  // diffコードブロックを抽出
  const diffRegex = /```diff\n([\s\S]*?)```/;
  const match = diffText.match(diffRegex);

  if (!match || !match[1]) {
    return diffContent; // コードブロックが見つからない場合は元のコンテンツを返す
  }

  // diff形式のままの内容を返す
  return match[1];
}

/**
 * コンテンツがDiff形式かどうかを判定する関数
 */
export const isDiffContent = (content?: string): boolean => {
  if (!content) return false;

  const contentLines = content.trim().split("\n");

  // @@で始まる行があるかチェック（unified diff形式）
  const hasHunkHeader = contentLines.some((line) => line.startsWith("@@"));

  // -または+で始まる行があるかチェック
  const hasDiffLines = contentLines.some((line) =>
    line.startsWith("-") || line.startsWith("+")
  );

  return hasHunkHeader && hasDiffLines;
};

/**
 * HTMLコンテンツからコードブロックマーカーなどを取り除く
 */
export const parseHtmlContent = (content: string): string => {
  if (!content) return "";

  // <!DOCTYPE html>の前の文字をすべて削除
  const doctypeIndex = content.indexOf("<!DOCTYPE html>");
  const startContent = doctypeIndex >= 0 ? content.substring(doctypeIndex) : content;

  // </html>の後の文字をすべて削除
  const htmlEndIndex = startContent.indexOf("</html>");
  if (htmlEndIndex >= 0) {
    return startContent.substring(0, htmlEndIndex + 7); // 7は"</html>"の長さ
  }
  return startContent;
};
