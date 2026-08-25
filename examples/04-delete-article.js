// examples/04-delete-article.js
// 아티클을 id 로 삭제한다.
// 사용법: node examples/04-delete-article.js <articleId>
//
// 기본은 soft delete(보관 처리). 완전 삭제가 필요하면 deleteArticle 의 isPermanent 옵션을 사용한다.

import "dotenv/config";
import { deleteArticle } from "../src/articles.js";
import { describeError } from "../src/http.js";

const articleId = process.argv[2];

async function main() {
  if (!articleId) {
    throw new Error(
      "삭제할 아티클 id 를 인자로 주세요. 예: node examples/04-delete-article.js <articleId>",
    );
  }

  console.log(`[delete-article] Deleting ${articleId} ...`);
  const result = await deleteArticle(articleId, {
    onNeedsOtp: () => {
      throw new Error("Tokens missing/expired. Run: node examples/01-login-otp.js");
    },
  });

  console.log(`[delete-article] ✓ Deleted. (result=${JSON.stringify(result)})`);
}

main().catch((err) => {
  console.error(`[delete-article] ✗ ${describeError(err)}`);
  if (err.body) console.error(err.body);
  process.exit(1);
});
