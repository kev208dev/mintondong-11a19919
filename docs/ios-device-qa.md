# iPhone 실기기 QA — 10분 체크

TestFlight 또는 Xcode 설치본에서 아래 순서대로 확인한다. 실제 결제 승인은 하지 않는다.

- [ ] 앱 설치 → cold start 후 홈 표시, 흰 화면/브라우저 오류 없음
- [ ] 이메일 로그인 → 앱 종료/재실행 후 세션 유지
- [ ] Google 로그인 → 앱 복귀 및 원래 경로 이동
- [ ] Apple 로그인 → 앱 복귀 및 원래 경로 이동
- [ ] 클럽과 공개 레슨 화면 열기
- [ ] 카드 checkout → 결제창 진입 → 취소 → 민턴동 checkout 복귀
- [ ] 간편결제 checkout → 결제창 진입 → 취소 → 민턴동 checkout 복귀
- [ ] 마이 → 계정 설정 → 계정 삭제 화면과 Apple 재인증 안내 확인
- [ ] 대회 외부 링크가 시스템 브라우저로 열리는지 확인
- [ ] 네트워크 끄기 → 연결 안내 → 켜기 → 다시 시도

화면이 잘리지 않는지 iPhone 390×844 계열과 가능한 큰 화면 기기에서 status bar, 하단 navigation,
checkout sticky CTA, 로그인/checkout 키보드를 함께 확인한다.
