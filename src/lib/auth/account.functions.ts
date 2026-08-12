import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import {
  normalizeUsername,
  validateDisplayName,
  validateEmail,
  validatePassword,
  validateUsername,
} from "./username";

const GENERIC_LOGIN_ERROR = "아이디 또는 비밀번호를 확인해주세요.";

export type SessionTokens = { access_token: string; refresh_token: string };

/** 아이디 사용 가능 여부 (비밀번호/이메일은 다루지 않는다) */
export const checkUsernameAvailable = createServerFn({ method: "POST" })
  .inputValidator((input: { username: string }) => input)
  .handler(async ({ data }): Promise<{ available: boolean }> => {
    const message = validateUsername(data.username);
    if (message) return { available: false };
    const { anonAuthClient, clientKey, rateLimit } = await import("./account.server");
    const headers = getRequest().headers;
    if (!rateLimit(clientKey(headers, "username-check"), 60, 60_000)) {
      throw new Error("아이디 확인 요청이 너무 많아요. 잠시 후 다시 시도해 주세요.");
    }
    const { data: available, error } = await anonAuthClient().rpc("is_username_available", {
      p_username: normalizeUsername(data.username),
    });
    if (error) {
      console.error("[auth] username availability check failed", error);
      throw new Error("아이디 중복 확인 서버에 문제가 있어요. 잠시 후 다시 시도해 주세요.");
    }
    return { available: available === true };
  });

/** 아이디 + 비밀번호 회원가입. 실패 시 auth user 를 되돌려 orphan 을 남기지 않는다. */
export const signUpWithUsername = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { username: string; password: string; displayName: string; email: string }) => input,
  )
  .handler(async ({ data }): Promise<SessionTokens> => {
    const problem =
      validateUsername(data.username) ||
      validatePassword(data.password) ||
      validateDisplayName(data.displayName) ||
      validateEmail(data.email);
    if (problem) throw new Error(problem);

    const { adminClient, anonAuthClient, clientKey, rateLimit } = await import("./account.server");
    const headers = getRequest().headers;
    if (!rateLimit(clientKey(headers, "signup"), 10, 10 * 60_000)) {
      throw new Error("잠시 후 다시 시도해 주세요.");
    }

    const username = normalizeUsername(data.username);
    const email = data.email.trim().toLowerCase();
    const displayName = data.displayName.trim();

    let admin;
    try {
      admin = adminClient();
    } catch {
      throw new Error("회원가입 서버 설정이 완료되지 않았어요. 잠시 후 다시 시도해 주세요.");
    }

    const { data: available, error: availabilityError } = await admin.rpc("is_username_available", {
      p_username: username,
    });
    if (availabilityError) {
      console.error("[auth] signup username availability check failed", availabilityError);
      throw new Error("아이디 중복 확인 서버에 문제가 있어요. 잠시 후 다시 시도해 주세요.");
    }
    if (available !== true) throw new Error("이미 사용 중인 아이디예요.");

    const created = await admin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { username, display_name: displayName },
    });
    if (created.error || !created.data.user) {
      const code = created.error?.message ?? "";
      if (/already|registered|exists/i.test(code)) {
        throw new Error("이미 가입된 정보가 있어요. 로그인 또는 비밀번호 찾기를 이용해 주세요.");
      }
      throw new Error("회원가입에 실패했어요. 잠시 후 다시 시도해 주세요.");
    }

    const userId = created.data.user.id;
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !profile || normalizeUsername(String(profile.username ?? "")) !== username) {
      // 프로필/아이디 확보 실패 → 방금 만든 계정을 롤백한다.
      await admin.auth.admin.deleteUser(userId);
      throw new Error("아이디를 저장하지 못했어요. 다른 아이디로 다시 시도해 주세요.");
    }

    const signIn = await anonAuthClient().auth.signInWithPassword({
      email,
      password: data.password,
    });
    if (signIn.error || !signIn.data.session) {
      throw new Error("가입은 완료됐어요. 로그인 화면에서 로그인해 주세요.");
    }
    return {
      access_token: signIn.data.session.access_token,
      refresh_token: signIn.data.session.refresh_token,
    };
  });

/** 아이디 + 비밀번호 로그인. username -> 계정 조회는 서버(service_role)에서만 수행. */
export const signInWithUsername = createServerFn({ method: "POST" })
  .inputValidator((input: { username: string; password: string }) => input)
  .handler(async ({ data }): Promise<SessionTokens> => {
    const { adminClient, anonAuthClient, clientKey, rateLimit } = await import("./account.server");
    const headers = getRequest().headers;
    const username = normalizeUsername(data.username);
    if (!rateLimit(clientKey(headers, "login"), 10, 10 * 60_000)) {
      throw new Error("로그인 시도가 너무 많아요. 잠시 후 다시 시도해 주세요.");
    }
    if (!username || !data.password) throw new Error(GENERIC_LOGIN_ERROR);
    if (!rateLimit(`user:${username}`, 10, 10 * 60_000)) {
      throw new Error("로그인 시도가 너무 많아요. 잠시 후 다시 시도해 주세요.");
    }

    let admin;
    try {
      admin = adminClient();
    } catch {
      throw new Error("로그인 서버 설정이 완료되지 않았어요. 잠시 후 다시 시도해 주세요.");
    }

    const { data: email, error: lookupError } = await admin.rpc("auth_email_for_username", {
      p_username: username,
    });
    if (lookupError) {
      console.error("[auth] username login lookup failed", lookupError);
      throw new Error("로그인 서버에 문제가 있어요. 잠시 후 다시 시도해 주세요.");
    }
    if (!email || typeof email !== "string") throw new Error(GENERIC_LOGIN_ERROR);

    const signIn = await anonAuthClient().auth.signInWithPassword({
      email,
      password: data.password,
    });
    if (signIn.error || !signIn.data.session) throw new Error(GENERIC_LOGIN_ERROR);

    return {
      access_token: signIn.data.session.access_token,
      refresh_token: signIn.data.session.refresh_token,
    };
  });
