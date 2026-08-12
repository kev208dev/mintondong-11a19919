/**
 * Node/local과 Cloudflare Workers(nodejs_compat, 2025-04-01 이후)에서 공통으로 쓰는
 * 서버 전용 환경변수 접근점. 호출 시점에 읽으며 브라우저 코드에서 import하지 않는다.
 */
export function serverEnv(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

export function requireServerEnv(name: string): string {
  const value = serverEnv(name);
  if (!value) throw new Error(`${name}_MISSING`);
  return value;
}
