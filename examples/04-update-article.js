// examples/04-update-article.js
// 기존 아티클을 수정(PUT)한다. PUT 은 전체 덮어쓰기라 본문에서 빠뜨린 필드는 기본값이 된다.
// 일부 필드만 고칠 거라면 PATCH(src/articles.js 의 patchArticle)가 더 안전하다.
// 사용법: node examples/04-update-article.js <articleId>
//
// languageCode 는 수정할 번역(언어)을 가리킨다. 생성 때 쓴 언어와 맞춰야 해당 번역이 갱신된다.
// 없는 언어를 주면 수정이 아니라 그 언어 번역이 새로 생기므로 주의.

import "dotenv/config";
import { updateArticle, revalidateArticle, ArticleStatus } from "../src/articles.js";
import { describeError } from "../src/http.js";

const HOSPITAL_ID = process.env.HOSPITAL_ID;
const LANGUAGE_CODE = process.env.ARTICLE_LANGUAGE_CODE || "en-US";
const articleId = process.argv[2];

async function main() {
  if (!articleId) {
    throw new Error(
      "수정할 아티클 id 를 인자로 주세요. 예: node examples/04-update-article.js <articleId>",
    );
  }
  if (!HOSPITAL_ID) {
    throw new Error("HOSPITAL_ID 환경변수가 필요합니다. .env 에 병원 ID(GUID)를 설정하세요.");
  }

  const now = new Date().toISOString();
  const update = {
    languageCode: LANGUAGE_CODE,
    name: "Sample Article — Updated via API",
    title: "Sample Article (updated)",
    description: "Updated sample example article",
    content: `<p>This article was updated at ${now}.</p>`,
    markdown: `This article was updated at **${now}**.`,
    hospitalId: HOSPITAL_ID,
    articleType: "Blog",
    status: ArticleStatus.Active,
    // 지우지 말 것: 생략하면 서버가 IsConfirmed=false 로 덮어써서 아티클이 공개 사이트에서 사라진다.
    // 공개 조건은 status=Active "그리고" confirmed=true 다. (src/articles.js updateArticle 주석 참고)
    confirmed: true,
  };

  console.log(`[update-article] Updating ${articleId} ...`);
  const updated = await updateArticle(articleId, update, {
    onNeedsOtp: () => {
      throw new Error("Tokens missing/expired. Run: node examples/01-login-otp.js");
    },
  });
  console.log(`[update-article] ✓ Updated. id=${updated.id} status=${updated.status}`);

  // 발행(Active) 상태일 때만 SaaS 반영.
  if (updated.status === ArticleStatus.Active) {
    console.log(`[update-article] status=Active → revalidate (SaaS 반영)...`);
    await revalidateArticle(updated.id);
    console.log(`[update-article] ✓ Revalidate 요청 완료.`);
  } else {
    console.log(`[update-article] status=${updated.status} → 미발행이므로 revalidate 생략.`);
  }
}

main().catch((err) => {
  console.error(`[update-article] ✗ ${describeError(err)}`);
  if (err.body) console.error(err.body);
  process.exit(1);
});
