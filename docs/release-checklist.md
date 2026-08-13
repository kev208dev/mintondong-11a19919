# Store Release Checklist

`[x]`는 repository 구현 또는 로컬 빌드로 확인한 항목만 의미한다. 콘솔 설정과 실기기 항목은
실제 검증 전까지 체크하지 않는다.

- [x] 계정 삭제 UI/server/migration 구현
- [ ] Production DB에 계정 삭제 migration 적용 및 실제 계정 QA
- [x] 공개 계정 삭제 설명 route
- [x] 개인정보처리방침
- [x] 이용약관
- [x] 환불정책
- [x] 고객지원 route
- [x] 사업자정보 route
- [x] Capacitor iOS/Android 프로젝트
- [ ] iOS Simulator build (현재 환경에서 Swift Package resolution이 완료되지 않음)
- [ ] Apple signing 및 iOS archive
- [x] Android debug APK build
- [ ] Android release signing 및 AAB
- [ ] Google OAuth iPhone 실기기
- [ ] Google OAuth Android 실기기
- [ ] Apple OAuth iPhone 실기기 및 계정 삭제 token revoke
- [ ] PortOne 결제창 진입/취소 복귀 iPhone 실기기
- [ ] PortOne 결제창 진입/취소 복귀 Android 실기기
- [x] 앱 아이콘/splash RC asset 생성
- [ ] 공식 1024×1024 앱 아이콘 원본으로 교체
- [x] safe-area/status bar/keyboard/back/network 처리 코드
- [ ] iPhone 390×844 및 큰 화면 실기기 QA
- [ ] Android 360×800 및 412×915 실기기 QA
- [x] placeholder credential 미커밋
- [x] store metadata/review notes/data inventory 초안
- [ ] Review account를 Production에 만들고 Store Console에만 입력
- [ ] Apple/Google 정책·계약·신원 확인 완료
- [ ] TestFlight 업로드
- [ ] Google Play Internal Testing 업로드
- [ ] 실 MID 발급 후 Production 결제 설정 재확인
- [ ] legacy `/lessons` 데모 결제 및 Partner 정산 준비 문구를 스토어 노출할지 운영 결정
