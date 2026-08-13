# Store Review Account

실제 credential은 이 파일이나 GitHub에 입력하지 않고 App Store Connect/Google Play Console의
심사 정보에만 저장한다.

- Review account email: `<Store Console에만 입력>`
- Review password: `<Store Console에만 입력>`

심사 계정은 Production에서 onboarding과 실제 클럽 연결을 완료하되 결제 승인을 요구하지 않는
상태로 준비한다. 심사 확인 경로:

1. 로그인
2. 홈과 동호회
3. 공개 레슨 및 checkout(결제 정보 확인, 승인 불필요)
4. 대회 목록/상세
5. 마이 → 계정 설정 → 계정 삭제 위치

심사 계정이 클럽 owner이면 계정 삭제가 소유권 이전 안내로 차단된다. 직접 삭제 흐름을 검증할
계정은 owner가 아니어야 한다.
