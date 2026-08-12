import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { refundPolicyConfig } from "@/config/refund-policy";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "취소 및 환불 정책 – 민턴동" },
      {
        name: "description",
        content: "민턴동 레슨 예약의 취소, 환불 기준과 결제 취소 처리 원칙을 안내합니다.",
      },
      { property: "og:title", content: "취소 및 환불 정책 – 민턴동" },
      { property: "og:description", content: "레슨 예약 취소 및 환불 원칙을 확인하세요." },
    ],
  }),
  component: RefundPolicyPage,
});

function RefundPolicyPage() {
  const sections: LegalSection[] = [
    {
      title: "공통 취소 기준",
      content: (
        <p>
          결제 후 7일 이내이면서 해당 레슨의 제공이 시작되기 전이라면 전액 환불을 원칙으로 합니다.
          7일이 지난 뒤의 취소는 상품별로 결제 전에 표시한 조건, 실제 이용 여부와 관계 법령에 따라
          처리합니다. 상품별 조건보다 관계 법령이 이용자에게 더 유리하게 적용되는 경우에는 관계
          법령을 우선합니다.
        </p>
      ),
    },
    {
      title: "1회 레슨",
      content: (
        <p>
          1회 레슨은 수업 제공이 시작되기 전까지 취소를 요청할 수 있습니다. 결제 후 7일 이내이면서
          수업 시작 전인 경우 전액 환불합니다. 이미 정상적으로 제공이 완료된 회차는 해당 회차에
          대한 환불이 제한될 수 있습니다. 다만 상품 내용이 고지와 다르거나 정상적으로 제공되지 않은
          경우에는 관계 법령에 따른 권리를 보장합니다.
        </p>
      ),
    },
    {
      title: "여러 회차 · 기간형 레슨",
      content: (
        <p>
          여러 회차 또는 일정 기간 동안 이용하는 상품이 일부 진행된 뒤 취소되는 경우에는 이미
          정상적으로 제공된 회차 또는 이용분을 제외하고 남은 미이용 부분을 기준으로 환불 금액을
          산정합니다. 상품별로 별도의 공제 기준이나 취소 조건이 있는 경우에는 결제 전에 명확히
          표시하고 동의를 받습니다.
        </p>
      ),
    },
    {
      title: "클럽 또는 코치 사정에 의한 취소",
      content: (
        <p>
          클럽·코치의 사정, 시설 문제 등 이용자에게 책임이 없는 사유로 레슨을 제공할 수 없으면 대체
          일정을 제안하거나 이용하지 못한 금액을 환불합니다. 이용자가 대체 일정에 동의하지 않는
          경우에는 제공되지 않은 부분에 대한 환불 절차를 안내합니다.
        </p>
      ),
    },
    {
      title: "결제 취소 처리",
      content: (
        <p>
          결제 전 예약은 예약 취소로 종료하며, 결제가 완료된 예약은 이용한 결제수단의 취소 또는 환불
          방식으로 처리합니다. 결제대행사를 통한 실결제는 결제대행사 및 카드사·은행의 취소 상태를
          확인해 결과를 안내합니다. 중복 환불이나 부정 이용이 확인되면 필요한 범위에서 처리가 보류될
          수 있습니다.
        </p>
      ),
    },
    {
      title: "환불 처리 기간",
      content: (
        <p>
          환불 사유와 결제 내역을 확인한 뒤 취소·환불이 승인되면 3영업일 이내에 결제 취소 또는 환불
          요청을 진행합니다. 실제 카드 승인 취소, 계좌 입금 또는 이용한도 복구 시점은 카드사·은행 등
          결제수단 제공자의 처리 일정에 따라 추가 시간이 소요될 수 있습니다. 현재 결제 화면에
          표시되는 기준은 {refundPolicyConfig.expectedRefundPeriod}입니다.
        </p>
      ),
    },
    {
      title: "고객 문의",
      content: (
        <p>
          예약번호, 레슨 일시와 취소 사유를 준비해 <Link to="/business-info">고객센터</Link>로
          문의해 주세요. 신청 당시 안내와 다르게 처리되었거나 상품 내용과 다르게 제공된 경우 확인 후
          관계 법령에 따라 조치합니다.
        </p>
      ),
    },
  ];

  return (
    <LegalPage
      title="취소 및 환불 정책"
      description="레슨 예약과 결제 취소가 어떤 원칙으로 처리되는지 안내합니다."
      notice={`공통 기준: ${refundPolicyConfig.cancellationDeadline}. 상품별로 별도 조건이 있는 경우 결제 전에 추가로 표시합니다.`}
      sections={sections}
    />
  );
}
