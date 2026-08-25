// examples/01-login-otp.js
// 1. CIBA authorization 요청 → 서버가 매니저 이메일로 6자리 OTP 발송
// 2. 콘솔에 OTP 입력 → /ciba/signInRequest 로 제출해 auth_req_id 승인
// 3. access_token / refresh_token 발급 → .tokens.json 저장

import "dotenv/config";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { requestCibaAuthorization, submitCibaOtp, pollCibaToken, saveTokens } from "../src/auth.js";

async function main() {
  console.log(`[login] Requesting OTP for ${process.env.MANAGER_EMAIL}...`);
  const { auth_req_id, expires_in } = await requestCibaAuthorization();
  console.log(`[login] OTP sent. 이메일을 확인하세요. (auth_req_id는 ${expires_in ?? 300}초 내 유효)`);

  const rl = readline.createInterface({ input, output });
  const code = (await rl.question("[login] 이메일로 받은 6자리 OTP를 입력하세요: ")).trim();
  rl.close();

  console.log(`[login] Submitting OTP...`);
  await submitCibaOtp(auth_req_id, code);

  console.log(`[login] Exchanging for tokens...`);
  const tokens = await pollCibaToken(auth_req_id, {
    interval: 1000,
    timeout: (expires_in ?? 300) * 1000,
  });

  await saveTokens(tokens);

  console.log(`[login] ✓ Success.`);
  console.log(`[login]   access_token length: ${tokens.access_token.length}`);
  console.log(`[login]   expires_at: ${new Date(tokens.expires_at * 1000).toISOString()}`);
  console.log(`[login]   refresh_token: ${tokens.refresh_token ? "yes" : "no"}`);
  console.log(`[login]   Tokens cached to ${process.env.TOKEN_CACHE_FILE ?? ".tokens.json"}`);
}

main().catch((err) => {
  console.error(`[login] ✗ ${err.message}`);
  process.exit(1);
});
