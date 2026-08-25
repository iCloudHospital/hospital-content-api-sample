// src/http.js — fetch 래퍼: 일시적 네트워크 오류(특히 DNS ENOTFOUND) 자동 재시도
// 배경: 일부 로컬 환경에서 Node 의 DNS 조회가 *.icloudhospital.com 에 대해 간헐적으로
//       ENOTFOUND 로 실패한다(같은 순간 curl 은 정상). 서버가 아니라 로컬 리졸버 깜빡임이라
//       몇 번 재시도하면 대개 성공한다.
// ponytail: 근본 해결은 로컬 DNS를 안정적인 리졸버(예: 8.8.8.8)로 바꾸는 것. 여기서는 흡수만 한다.

const TRANSIENT_CODES = new Set([
  "ENOTFOUND",
  "EAI_AGAIN",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchRetry(url, init = {}, { retries = 4, baseDelayMs = 400 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, init);
    } catch (err) {
      const code = err?.cause?.code;
      if (!TRANSIENT_CODES.has(code) || attempt === retries) throw err;
      lastError = err;
      // 선형 백오프 (0.4s, 0.8s, 1.2s ...)
      await sleep(baseDelayMs * (attempt + 1));
    }
  }
  throw lastError;
}
