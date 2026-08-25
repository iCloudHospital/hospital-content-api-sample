// examples/02-create-article.js
// 01번에서 발급받은 토큰(.tokens.json)을 재사용하여 아티클 하나를 생성한다.
// 발행 상태(status="Active")로 생성 후 SaaS 반영을 위해 revalidate 요청.
// 토큰이 만료됐으면 refresh 시도, refresh도 실패하면 안내 후 종료.

import "dotenv/config";
import { createArticle, revalidateArticle, ArticleStatus } from "../src/articles.js";
import { describeError } from "../src/http.js";

const HOSPITAL_ID = process.env.HOSPITAL_ID;
// 아티클 언어 (.env ARTICLE_LANGUAGE_CODE, 기본 en-US). admin UI/목록이 이 언어로 필터링됩니다.
// admin UI 기본 언어가 en-US 라 기본값을 en-US 로 둠. 한국어 콘텐츠면 ko / ko-KR 로 바꾸세요.
const LANGUAGE_CODE = process.env.ARTICLE_LANGUAGE_CODE || "en-US";

async function main() {
  if (!HOSPITAL_ID) {
    throw new Error("HOSPITAL_ID 환경변수가 필요합니다. .env 에 병원 ID(GUID)를 설정하세요.");
  }

  const article = {
    languageCode: LANGUAGE_CODE, // .env ARTICLE_LANGUAGE_CODE (기본 en-US). "en-US" 또는 "ko" 등
    name: "샘플 아티클 — API로 등록",
    title: "샘플 아티클",
    description: "샘플 예제 아티클",
    content: "<p>이 아티클은 hospital-content-api-sample 예제로 생성되었습니다.</p>",
    markdown: "이 아티클은 hospital-content-api-sample 예제로 생성되었습니다.",
    hospitalId: HOSPITAL_ID,
    articleType: "Blog", // ArticleType enum (Blog, News, MedicalContent, Press, Insights ...)
    status: ArticleStatus.Active, // 발행 상태로 생성
  };

  console.log(`[create-article] Creating "${article.name}"...`);
  const created = await createArticle(article, {
    onNeedsOtp: () => {
      throw new Error("Tokens missing/expired. Run: node examples/01-login-otp.js");
    },
  });

  console.log(`[create-article] ✓ Created.`);
  console.log(`[create-article]   id: ${created.id}`);
  console.log(`[create-article]   slug: ${created.slug ?? "(pending)"}`);
  console.log(`[create-article]   status: ${created.status}`);

  // 발행(Active) 상태일 때만 SaaS 반영. Draft/Archived 는 색인 대상이 아니므로 생략한다.
  if (created.status === ArticleStatus.Active) {
    console.log(`[create-article] status=Active → revalidate (SaaS 반영)...`);
    await revalidateArticle(created.id);
    console.log(`[create-article] ✓ Revalidate 요청 완료.`);
  } else {
    console.log(`[create-article] status=${created.status} → 미발행이므로 revalidate 생략.`);
  }
}

main().catch((err) => {
  console.error(`[create-article] ✗ ${describeError(err)}`);
  if (err.body) console.error(err.body);
  process.exit(1);
});
