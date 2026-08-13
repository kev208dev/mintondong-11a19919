import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  cancellationDecision,
  checkoutPaymentAccess,
  executeCancellationDecision,
  PAYMENT_REVIEW_MESSAGE,
  paymentFactsMatch,
  verificationReviewStatus,
} from "../src/lib/portone/payment-core.ts";

const verifiedPayment = {
  paymentId: "md_1234567890123456",
  internalAmount: 30_000,
  internalOrderName: "민턴동 코치 레슨",
  internalStoreId: "store-a",
  internalChannelKey: "channel-a",
  remote: {
    status: "PAID",
    id: "md_1234567890123456",
    total: 30_000,
    paid: 30_000,
    currency: "KRW",
    orderName: "민턴동 코치 레슨",
    storeId: "store-a",
    channelKey: "channel-a",
    pgProvider: "INICIS_V2",
  },
};

test("PAID 검증 mismatch는 FAILED가 아닌 PENDING review 상태가 된다", () => {
  assert.equal(
    paymentFactsMatch({
      ...verifiedPayment,
      remote: { ...verifiedPayment.remote, total: 1 },
    }),
    false,
  );
  assert.equal(verificationReviewStatus("PENDING"), "PENDING");
  assert.notEqual(verificationReviewStatus("FAILED"), "FAILED");
  assert.match(PAYMENT_REVIEW_MESSAGE, /다시 결제하지 말고/);
});

test("PAID 상점 mismatch는 검증을 거부하고 재결제 금지 안내를 사용한다", () => {
  assert.equal(
    paymentFactsMatch({
      ...verifiedPayment,
      remote: { ...verifiedPayment.remote, storeId: "other-store" },
    }),
    false,
  );
  assert.match(PAYMENT_REVIEW_MESSAGE, /다시 결제하지 말고 고객센터에 문의/);
});

test("PAID 채널 mismatch를 거부한다", () => {
  assert.equal(
    paymentFactsMatch({
      ...verifiedPayment,
      remote: { ...verifiedPayment.remote, channelKey: "other-channel" },
    }),
    false,
  );
});

test("PAID KG이니시스 provider mismatch를 거부한다", () => {
  assert.equal(
    paymentFactsMatch({
      ...verifiedPayment,
      remote: { ...verifiedPayment.remote, pgProvider: "TOSSPAYMENTS" },
    }),
    false,
  );
});

test("취소 전 검증 mismatch에서는 취소 callback을 호출하지 않는다", async () => {
  let calls = 0;
  const decision = cancellationDecision({
    factsMatch: false,
    remoteStatus: "PAID",
    total: 30_000,
    cancelled: 0,
  });
  await assert.rejects(
    executeCancellationDecision(decision, async () => {
      calls += 1;
    }),
    /PAYMENT_VERIFICATION_MISMATCH/,
  );
  assert.equal(calls, 0);
});

test("정상 취소는 서버가 계산한 취소 가능 전액으로 한 번만 요청한다", async () => {
  const amounts: number[] = [];
  const decision = cancellationDecision({
    factsMatch: true,
    remoteStatus: "PARTIAL_CANCELLED",
    total: 30_000,
    cancelled: 10_000,
  });
  const result = await executeCancellationDecision(decision, async (amount) => {
    amounts.push(amount);
    return "ok";
  });
  assert.deepEqual(amounts, [20_000]);
  assert.deepEqual(result, { called: true, response: "ok" });
});

test("이미 전액 취소된 결제의 중복 취소는 외부 API를 다시 호출하지 않는다", async () => {
  let calls = 0;
  const decision = cancellationDecision({
    factsMatch: true,
    remoteStatus: "CANCELLED",
    total: 30_000,
    cancelled: 30_000,
  });
  const result = await executeCancellationDecision(decision, async () => {
    calls += 1;
  });
  assert.equal(calls, 0);
  assert.deepEqual(result, { called: false });
});

test("checkout 접근 상태는 로그인·PortOne·환불 설정을 모두 구분한다", () => {
  assert.equal(
    checkoutPaymentAccess({
      authenticated: false,
      integrationReady: true,
      refundPolicyReady: true,
    }),
    "LOGIN_REQUIRED",
  );
  assert.equal(
    checkoutPaymentAccess({
      authenticated: true,
      integrationReady: false,
      refundPolicyReady: true,
    }),
    "PORTONE_DISABLED",
  );
  assert.equal(
    checkoutPaymentAccess({
      authenticated: true,
      integrationReady: true,
      refundPolicyReady: false,
    }),
    "REFUND_MISSING",
  );
  assert.equal(
    checkoutPaymentAccess({
      authenticated: true,
      integrationReady: true,
      refundPolicyReady: true,
    }),
    "READY",
  );
});

test("비로그인 checkout은 상품·가격·정책을 유지하고 PortOne 대신 로그인 CTA를 표시한다", () => {
  const source = readFileSync("src/routes/clubs.$clubId.lessons_.$lessonId.checkout.tsx", "utf8");
  for (const label of ["클럽", "코치", "장소", "운영 시간", "1회 수업", "최종 결제금액"]) {
    assert.match(source, new RegExp(`label="${label}"`));
  }
  assert.match(source, /전체 취소 및 환불 정책 보기/);
  assert.match(source, /로그인 후 결제하기/);
  assert.doesNotMatch(source, /if \(!user\) return null/);
  assert.match(source, /access !== "READY" \|\| !user/);
});

test("API secret 없이 주문을 만들거나 결제창을 열지 않는다", () => {
  const server = readFileSync("src/lib/portone/portone.server.ts", "utf8");
  const configurationCheck = server.indexOf('throw new Error("PORTONE_NOT_CONFIGURED")');
  const secretCheck = server.indexOf("secret();", configurationCheck);
  const orderInsert = server.indexOf('.from("payments").insert', secretCheck);
  assert.ok(configurationCheck >= 0);
  assert.ok(secretCheck > configurationCheck);
  assert.ok(orderInsert > secretCheck);
});

test("서버 secret 환경변수 이름을 checkout 오류 코드로 노출하지 않는다", () => {
  const checkout = readFileSync("src/routes/clubs.$clubId.lessons_.$lessonId.checkout.tsx", "utf8");
  assert.match(checkout, /PORTONE_SERVER_NOT_CONFIGURED/);
  assert.doesNotMatch(checkout, /PORTONE_API_SECRET/);
});

test("환불 정책 기본값이 존재하여 결제 준비 조건을 충족한다", () => {
  const policy = readFileSync("src/config/refund-policy.ts", "utf8");
  assert.match(policy, /결제 후 7일 이내/);
  assert.match(policy, /승인 후 3영업일 이내/);
  assert.match(policy, /export const isRefundPolicyReady = Boolean/);
});

test("확정된 공개 Store ID와 KG이니시스 V2 Channel Key를 공통 설정으로 사용한다", () => {
  const config = readFileSync("src/config/portone.ts", "utf8");
  const checkout = readFileSync("src/routes/clubs.$clubId.lessons_.$lessonId.checkout.tsx", "utf8");
  const server = readFileSync("src/lib/portone/portone.server.ts", "utf8");
  assert.match(config, /store-81345dbd-4a7e-49ce-b68f-f1c9465294c2/);
  assert.match(config, /channel-key-f8da7be3-4a42-4e83-a7a9-f5926b6fec7d/);
  assert.match(config, /VITE_PORTONE_ENABLED/);
  assert.match(config, /publicEnv\("VITE_PORTONE_ENABLED"\) !== "false"/);
  assert.match(checkout, /portOnePublicConfig/);
  assert.match(server, /portOnePublicConfig/);
  assert.doesNotMatch(config, /PORTONE_API_SECRET|PORTONE_WEBHOOK_SECRET/);
});
