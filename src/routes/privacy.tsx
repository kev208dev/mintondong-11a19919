import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { businessConfig, businessValue } from "@/config/business";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "개인정보처리방침 – 민턴동" },
      {
        name: "description",
        content: "민턴동이 처리하는 계정, 프로필, 클럽, 활동 및 레슨 관련 개인정보를 안내합니다.",
      },
      { property: "og:title", content: "개인정보처리방침 – 민턴동" },
      { property: "og:description", content: "민턴동 개인정보 처리 기준을 확인하세요." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const sections: LegalSection[] = [
    {
      title: "수집 및 이용 목적",
      content: (
        <p>
          회원 식별과 인증, 계정 복구, 프로필 제공, 클럽 개설·가입·권한 관리, 출석·경기·활동 기록,
          레슨 정보 제공·예약·결제 상태 관리, 고객 문의 대응, 부정 이용 방지와 서비스 안정성 확보를
          위해 개인정보를 처리합니다.
        </p>
      ),
    },
    {
      title: "수집 항목",
      content: (
        <ul>
          <li>
            회원가입·인증: 아이디, 이메일 주소, 비밀번호(인증 시스템에서 일방향 보호 처리), 인증
            제공자 및 제공자가 전달한 계정 식별정보
          </li>
          <li>
            현재 확인된 소셜 로그인: 카카오. Google·Apple은 운영자가 별도 설정해 활성화한 경우에만
            사용됩니다.
          </li>
          <li>프로필: 닉네임, 프로필 이미지</li>
          <li>클럽: 클럽명·소개·지역·이미지, 멤버 이름, 가입 상태·역할·등급, 게스트·초대 관계</li>
          <li>
            활동: 출석 응답·체크인, 경기 편성·점수·승패·기록, 일정 및 대기열, 업로드한 경기 영상
            정보
          </li>
          <li>
            레슨·결제 기능 이용 시: 코치와 예약 일시, 수업 시간, 가격, 예약·결제 상태, 결제수단,
            입금자명, 주문·거래 식별정보, 영수증 정보
          </li>
          <li>
            자동 생성 정보: 접속 시각, IP 주소, 브라우저·기기 정보, 쿠키 또는 로컬 저장소 식별정보,
            오류·이용 기록
          </li>
        </ul>
      ),
    },
    {
      title: "보유 및 이용기간",
      content: (
        <p>
          원칙적으로 회원 탈퇴 또는 처리 목적 달성 시 지체 없이 파기합니다. 다만 관계 법령이
          거래·소비자 보호·통신사실 확인 등을 위해 보존을 요구하는 정보는 해당 법정 기간 동안
          분리하여 보관할 수 있고, 분쟁 또는 미정산 거래가 있으면 해결에 필요한 범위에서 보관할 수
          있습니다.
        </p>
      ),
    },
    {
      title: "제3자 제공",
      content: (
        <p>
          회사는 현재 개인정보를 제3자에게 판매하거나 상시 제공하지 않습니다. 이용자가 동의한 경우,
          법령에 근거가 있는 경우 또는 생명·신체·재산 보호를 위해 긴급히 필요한 경우에만 필요한
          범위에서 제공할 수 있으며, 제공이 시작되면 제공받는 자·목적·항목·보유기간을 별도로
          알립니다.
        </p>
      ),
    },
    {
      title: "처리 위탁",
      content: (
        <p>
          회원 인증·데이터베이스·파일 저장을 위해 Supabase를, 서비스 제공과 보안·오류 대응을 위한 웹
          인프라로 Cloudflare를 이용합니다. 레슨 결제 시 PortOne을 통해 KG이니시스 등 계약된
          결제대행사에 구매자 이름·연락처, 상품·금액·주문 식별정보 등 결제 처리에 필요한 정보가
          전달됩니다. 각 수탁자가 처리하는 구체적인 범위와 보유기간은 실제 계약과 관계 법령에
          따릅니다. 저장소에 남아 있는 Toss 연동 코드는 현재 운영 결제 제공자를 의미하지 않습니다.
        </p>
      ),
    },
    {
      title: "파기",
      content: (
        <p>
          보유 목적이 끝난 전자적 개인정보는 복구하기 어려운 방법으로 삭제합니다. 법령상 보존 의무가
          있는 정보는 다른 정보와 분리하여 보관한 뒤 기간이 끝나면 파기합니다.
        </p>
      ),
    },
    {
      title: "이용자 권리",
      content: (
        <p>
          이용자는 자신의 개인정보 열람, 정정, 삭제, 처리정지 및 동의 철회를 요청할 수 있습니다.
          <Link to="/account-deletion">계정 삭제</Link> 페이지에서 로그인 후 계정을 직접 삭제할 수
          있습니다. 소유한 클럽은 고객지원을 통해 다른 관리자에게 소유권을 이전해야 하며, 법령상
          보관이 필요한 결제 기록은 계정 식별정보와 분리하여 보관될 수 있습니다. 직접 처리할 수 없는
          요청은
          <Link to="/support"> 고객지원</Link>으로 접수할 수 있습니다.
        </p>
      ),
    },
    {
      title: "개인정보 보호 담당자",
      content: (
        <dl className="space-y-1">
          <div>
            <dt className="inline font-bold text-foreground/80">담당자 </dt>
            <dd className="inline">{businessValue(businessConfig.representativeName)}</dd>
          </div>
          <div>
            <dt className="inline font-bold text-foreground/80">이메일 </dt>
            <dd className="inline break-all">
              {businessValue(businessConfig.customerServiceEmail)}
            </dd>
          </div>
          <div>
            <dt className="inline font-bold text-foreground/80">전화 </dt>
            <dd className="inline">{businessValue(businessConfig.customerServicePhone)}</dd>
          </div>
        </dl>
      ),
    },
    {
      title: "쿠키 및 서비스 이용 기록",
      content: (
        <p>
          민턴동은 로그인 세션 유지와 앱 상태 저장을 위해 브라우저 로컬 저장소 등 유사 기술을
          사용합니다. 브라우저 설정에서 저장을 차단하거나 삭제할 수 있으나 로그인 유지와 일부 기능이
          제한될 수 있습니다. 서비스 보안과 오류 분석을 위해 접속·오류 기록이 생성될 수 있습니다.
        </p>
      ),
    },
    {
      title: "변경 고지",
      content: (
        <p>
          이 방침의 내용이 변경되면 서비스 공지 등을 통해 시행 전에 알립니다. 이용자 권리에 중대한
          변경이 있는 경우 합리적인 사전 고지 기간을 두고 안내합니다. 시행일:{" "}
          {businessValue(businessConfig.policyEffectiveDate)}
        </p>
      ),
    },
  ];

  return (
    <LegalPage
      title="개인정보처리방침"
      description="현재 민턴동 코드와 외부 Supabase 데이터 구조에서 확인된 개인정보 처리 내용을 기준으로 안내합니다."
      sections={sections}
    />
  );
}
