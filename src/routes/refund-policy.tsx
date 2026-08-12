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
      title: "레슨 예약 취소",
      content: (
        <p>
          이용자는 예약 내역 또는 고객센터를 통해 취소를 요청할 수 있습니다. 취소 가능 시점과 환불
          금액은 신청 전에 상품 화면에 표시된 조건, 취소 요청 시점, 실제 제공 여부 및 관계 법령에
          따라 결정됩니다. 요청이 접수되면 예약 상태와 처리 결과를 안내합니다.
        </p>
      ),
    },
    {
      title: "레슨 시작 전 취소",
      content: (
        <p>
          레슨 제공이 시작되기 전에는 관계 법령과 신청 당시 고지된 상품별 취소 조건에 따라 결제를
          취소하거나 환불합니다. 별도의 취소 시한이나 공제 기준이 적용되는 상품은 결제 전에 명확히
          표시하고 동의를 받습니다.
          {refundPolicyConfig.cancellationDeadline
            ? ` 현재 공통 취소 신청 기준은 ${refundPolicyConfig.cancellationDeadline}입니다.`
            : " 공통 취소 시한은 운영 정책 확정 후 이 페이지와 신청 화면에 반영합니다."}
        </p>
      ),
    },
    {
      title: "레슨 진행 후 환불",
      content: (
        <p>
          이미 정상적으로 제공된 레슨은 제공된 부분에 대해 환불이 제한될 수 있습니다. 여러 회차
          상품이 일부 진행된 경우 제공된 회차 또는 이용분을 반영해 환불 금액을 산정하며, 표시·광고
          또는 계약 내용과 다르게 제공된 경우에는 관계 법령에 따른 권리를 보장합니다.
        </p>
      ),
    },
    {
      title: "클럽 또는 코치 사정에 의한 취소",
      content: (
        <p>
          클럽·코치의 사정, 시설 문제 등 이용자에게 책임 없는 사유로 레슨을 제공할 수 없으면 대체
          일정을 제안하거나 이용하지 못한 금액을 환불합니다. 이용자가 대체 일정에 동의하지 않으면
          환불 절차를 안내합니다.
        </p>
      ),
    },
    {
      title: "결제 취소 처리",
      content: (
        <p>
          결제 전 예약은 예약 취소로 종료하며, 결제가 완료된 예약은 이용한 결제수단의 취소 또는 환불
          방식으로 처리합니다. 결제대행사를 통한 실결제가 시작되면 해당 결제수단의 취소 상태를
          확인해 결과를 안내하며, 중복 환불이나 부정 이용이 확인되면 처리가 보류될 수 있습니다.
        </p>
      ),
    },
    {
      title: "환불 처리 기간",
      content: (
        <p>
          회사는 환불 사유와 결제 내역을 확인한 뒤 지체 없이 취소 또는 환불을 요청합니다. 실제 입금
          또는 한도 복구 시점은 카드사·은행 등 결제수단 제공자의 처리 일정에 따라 달라질 수
          있습니다.
          {refundPolicyConfig.expectedRefundPeriod
            ? ` 예상 처리 기간은 ${refundPolicyConfig.expectedRefundPeriod}입니다.`
            : " 운영 결제수단별 예상 기간은 실결제 도입 전에 이 페이지와 결제 화면에 표시합니다."}
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
      notice="상품별 취소 시한·공제 기준이 있는 경우 반드시 신청 화면에서 결제 전에 별도로 확인할 수 있도록 표시합니다."
      sections={sections}
    />
  );
}
