# Baht Now

여행에 필요한 통화를 원하는 만큼 추가해 한 화면에서 비교하는 모바일 우선 PWA다.

- 공개 사이트: https://ugrowlabs-bit.github.io/fx/
- 한국어 KRW·USD·THB: https://ugrowlabs-bit.github.io/fx/ko/krw/usd/thb/
- GitHub 저장소: https://github.com/ugrowlabs-bit/fx

## 로컬 실행

```bash
npm run dev
```

같은 Wi-Fi의 모바일 기기에서는 터미널에 표시되는 네트워크 주소로 접속한다.

## 동작 방식

- 영어를 기본으로 사용하고 25개 대표 여행지의 현지화 페이지를 제공한다.
- 국가 또는 통화로 검색해 통화를 제한 없이 추가하고 정렬·삭제할 수 있다.
- URL은 `/{language}/{currency...}/` 형식으로 언어와 통화 순서를 보존한다.
- 선택한 통화만 Frankfurter v2에서 가져온다.
- 마지막 성공 갱신 후 1시간이 지나면 새 환율을 요청한다.
- 브라우저가 열린 동안에도 1분마다 만료 여부를 확인한다.
- 마지막 성공 환율은 로컬에 저장하며 오프라인일 때 재사용한다.
- 공개 환율은 참고용 중간시장 환율로 실제 카드·환전 금액과 다를 수 있다.

## 배포

GitHub Pages가 `main` 브랜치의 저장소 루트를 배포한다. `main`에 변경을 푸시하면 사이트가 자동 갱신된다. 서비스 워커와 설치 기능은 HTTPS 또는 localhost에서 동작한다.

국가별 진입 페이지는 다음 명령으로 다시 생성한다.

```bash
npm run generate:destinations
```
