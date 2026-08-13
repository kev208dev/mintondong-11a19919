# Store Metadata Draft

## App Store

- 앱 이름: 민턴동
- Subtitle 후보: 배드민턴 동호회와 대회를 한곳에서
- Category 후보: Sports
- Support URL: `https://mintondong-11a19919.kev208dev.workers.dev/support`
- Privacy Policy URL: `https://mintondong-11a19919.kev208dev.workers.dev/privacy`
- Account Deletion URL: `https://mintondong-11a19919.kev208dev.workers.dev/account-deletion`

Description 초안:

> 민턴동에서 배드민턴 동호회를 만들고 가입해 보세요. 회원과 출석, 경기 기록을 관리하고,
> 공개된 오프라인 레슨의 일정과 가격을 확인할 수 있습니다. 전국 배드민턴 대회 정보도 한곳에서
> 살펴볼 수 있습니다.

Keywords 후보: `배드민턴,동호회,클럽,출석,경기,레슨,대회`

## Google Play

- 앱 이름: 민턴동
- Short description 후보: 배드민턴 동호회 운영, 레슨과 대회 정보를 한곳에서 확인하세요.
- Category 후보: Sports
- Contact email: `kev208dev@gmail.com`
- Privacy Policy: `https://mintondong-11a19919.kev208dev.workers.dev/privacy`
- Account deletion: `https://mintondong-11a19919.kev208dev.workers.dev/account-deletion`

Full description은 App Store 설명을 바탕으로 실제 공개 기능만 기재한다. “1위”, “최고”, 이용자
수처럼 증명하지 않은 표현을 쓰지 않는다.

## Privacy / Data Inventory

이 표는 코드와 현재 schema 기준 초안이다. Store Console 답변은 실기기 SDK 트래픽과 실제
운영 설정을 다시 확인한 뒤 제출한다.

| Data                               | Collected      | Purpose                 | Stored where                | Processor / recipient         | Deletion                                                   |
| ---------------------------------- | -------------- | ----------------------- | --------------------------- | ----------------------------- | ---------------------------------------------------------- |
| 이메일, OAuth 계정 식별자          | 예             | 가입, 로그인, 계정 복구 | Supabase Auth               | Supabase, 활성 OAuth provider | Auth user 삭제. Apple 로그인은 삭제 직전 token revoke      |
| 표시 이름, username, 프로필 이미지 | 선택/예        | 프로필, 서비스 식별     | Supabase `profiles`/Storage | Supabase                      | 계정 삭제 시 profile 삭제                                  |
| 클럽 가입, 역할, 등급              | 예             | 클럽 운영과 권한        | Supabase `club_members`     | Supabase                      | 예약/경기 참조 보존을 위해 식별 link와 이름 익명화         |
| 출석·경기·일정 기록                | 기능 이용 시   | 클럽 운영               | Supabase                    | Supabase                      | 공동 클럽 기록은 관계 유지, 직접 user link는 schema별 처리 |
| 레슨 예약                          | 기능 이용 시   | 오프라인 레슨 예약      | Supabase                    | Supabase, 해당 클럽 운영자    | 익명화된 membership과 연결될 수 있음                       |
| 구매자 이름·전화, 결제 metadata    | 결제 시        | PG 결제·취소·고객지원   | Supabase/결제사             | PortOne, KG이니시스           | 직접 user link 제거, 법률·회계상 보관기간 확인 필요        |
| 대회 관심 저장                     | 선택           | 관심 대회 기능          | Supabase                    | Supabase                      | 계정 삭제 시 삭제                                          |
| IP·기기·오류/접속 기록             | 자동 생성 가능 | 보안, 안정성, 장애 분석 | 서비스/인프라 로그          | Cloudflare, Supabase          | 실제 provider 보존 설정 확인 필요                          |

현재 앱 manifest에는 카메라, 마이크, 위치, 연락처, 사진, Bluetooth 권한이 없다. 광고 SDK와
사용자 추적용 SDK는 확인되지 않았다. 결제와 인증 provider의 독립적인 정책/법적 보관은 각
계약을 기준으로 최종 확인한다.
