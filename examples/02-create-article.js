// examples/02-create-article.js
// 01번에서 발급받은 토큰(.tokens.json)을 재사용하여 아티클 하나를 생성한다.
// 토큰이 만료됐으면 refresh 시도, refresh도 실패하면 안내 후 종료.

import "dotenv/config";
import { createArticle } from "../src/articles.js";

async function main() {
  const article = {
    title: "샘플 아티클 — API로 등록",
    slug: `sample-article-${Date.now()}`,
    languageCode: "ko",
    body: "이 아티클은 hospital-content-api-sample 예제로 생성되었습니다.",
    excerpt: "샘플 예제 아티클",
    tags: ["sample", "api"],
  };

  console.log(`[create-article] Creating "${article.title}"...`);
  const created = await createArticle(article, {
    onNeedsOtp: () => {
      throw new Error("Tokens missing/expired. Run: node examples/01-login-otp.js");
    },
  });

  console.log(`[create-article] ✓ Created.`);
  console.log(`[create-article]   id: ${created.id}`);
  console.log(`[create-article]   saas_url: ${created.saasUrl ?? created.url ?? "(pending publish)"}`);
}

main().catch((err) => {
  console.error(`[create-article] ✗ ${err.message}`);
  if (err.body) console.error(err.body);
  process.exit(1);
});
