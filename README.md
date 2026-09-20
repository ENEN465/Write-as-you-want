# write-as-you-want

개인용 글쓰기 프로그램입니다. 화면에는 제목과 본문만 남기는 것을 목표로 합니다.

## 실행 방법

`index.html`을 브라우저로 열면 됩니다. (별도 설치·서버 불필요)

## 폴더 구조

```
write-as-you-want/
├─ index.html          화면 뼈대
├─ css/
│  ├─ base.css         디자인 토큰(색·글꼴·크기)과 리셋
│  ├─ layout.css       화면 골격 (topbar / workspace / page)
│  └─ editor.css       제목·본문 스타일
└─ js/
   ├─ editor.js        에디터 코어 (입력 처리, 공개 API)
   └─ main.js          진입점 (요소 연결)
```

## 에디터 코어 공개 API (`WAYW.editor`)

| 항목 | 설명 |
| --- | --- |
| `on('change', fn)` / `off` | 제목·본문이 바뀔 때 호출됩니다. `{ source: 'title' \| 'body' \| 'data' }` |
| `getData()` | `{ title, html, text }` 반환 |
| `setData({ title, html })` | 제목과 본문 채우기 |
| `focus(where)` | `'title'`, `'body-start'`, `'body-end'` |

## 진행 현황

- [x] 0. 기반 구조 (HTML/CSS/JS 뼈대 + 에디터 코어)
- [ ] 1. 기본 서식 (볼드/이탤릭/취소선)
- [ ] 2. 추가 서식 (h1/h2/h3, 구분선, 글자 색깔, 인용문)
- [ ] 3. 글자 수 세기
- [ ] 4. 폰트 4종 + 글자 크기 조절
- [ ] 5. 사이드바
- [ ] 6. 자동 저장 (데이터 구조 확정)
- [ ] 7. 문서 목록 기능
- [ ] 8. 버전 관리
- [ ] 9. 글 내부 찾기
- [ ] 10. 단축키
- [ ] 11. 글 내보내기
- [ ] 12. 모바일 대응
- [ ] 13. GitHub 동기화
- [ ] 14. 동기화 충돌 처리
- [ ] 15. PWA

## GitHub에 올리기

```bash
cd write-as-you-want
git init
git add .
git commit -m "step 0: 기반 구조"
git branch -M main
git remote add origin https://github.com/<계정명>/write-as-you-want.git
git push -u origin main
```
