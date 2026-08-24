// examples/01-login-otp.js
// 1. CIBA authorization 요청 → 서버가 매니저 이메일로 OTP 발송
// 2. 콘솔에서 OTP 수신 대기 (승인 시 자동 폴링)
// 3. access_token / refresh_token 발급 → .tokens.json 저장

import "dotenv/config";
import { requestCibaAuthorization, pollCibaToken, saveTokens } from "../src/auth.js";

async function main() {
  console.log(`[login] Requesting OTP for ${process.env.MANAGER_EMAIL}...`);
  const bindingMessage = `Login-${Date.now().toString().slice(-6)}`;
  const { auth_req_id, expires_in, interval } = await requestCibaAuthorization({ bindingMessage });

  console.log(`[login] OTP sent. binding_message="${bindingMessage}"`);
  console.log(`[login]   auth_req_id expires in ${expires_in}s, poll every ${interval}s`);
  console.log(`[login] 이메일에서 OTP를 확인하고 승인해주세요. 승인되면 자동으로 토큰을 발급받습니다.`);

  const tokens = await pollCibaToken(auth_req_id, {
    interval: interval * 1000,
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
