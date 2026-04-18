# 🎬 쉬운 동영상 만들기 (Easy Video Maker)

브라우저에서 바로 쓸 수 있는 **한국어 동영상 제작 웹앱**입니다.
사진 여러 장과 배경음악으로 멋진 슬라이드쇼 동영상을 만들어 다운로드할 수 있어요.

👉 **[바로 사용하기 (GitHub Pages)](https://yimss1803-cmd.github.io/easy-video-maker/)**

---

## ✨ 주요 기능

- 📷 **사진 업로드** — 드래그 & 드롭 또는 파일 선택 (여러 장 동시)
- 🔀 **순서 변경** — 드래그로 재배치 / 좌우 버튼 / 삭제
- ⚙️ **세부 설정**
  - 사진당 표시 시간 (1~10초)
  - 전환 효과: 페이드 / 슬라이드 / 줌 / 없음
  - 해상도: 480p / 720p / 1080p / 정사각형 / 세로 (9:16)
  - 프레임레이트: 24 / 30 / 60 fps
  - 배경색 커스터마이징
  - 켄 번즈 효과 (사진이 살짝 움직이는 고급 효과)
- 🎵 **배경음악** 추가 (MP3 / WAV / M4A 등)
- ✍️ **제목 / 자막** 오버레이 (위치·색상 지정 가능)
- ▶ **실시간 미리보기**
- 💾 **MP4 / WebM** 형식으로 저장

---

## 🚀 사용 방법

### 온라인에서 바로 사용 (추천)

👉 https://yimss1803-cmd.github.io/easy-video-maker/

### 내 컴퓨터에서 실행

```bash
# 1. 레포지토리 클론
git clone https://github.com/yimss1803-cmd/easy-video-maker.git
cd easy-video-maker

# 2. 로컬 서버 실행 (Python 필요)
python3 -m http.server 8000

# 3. 브라우저에서 접속
# → http://localhost:8000
```

또는 `index.html` 파일을 브라우저로 직접 열어도 동작합니다.

---

## 🖥️ 권장 브라우저

| 브라우저 | 동영상 형식 | 호환성 |
|---|---|---|
| **Chrome / Edge** (최신) | MP4 ✅ | ⭐⭐⭐ 최고 |
| Firefox | WebM | ⭐⭐ 양호 |
| Safari | WebM | ⭐⭐ 양호 |

---

## 💡 사용 팁

1. **사진 비율이 다를 때**: 배경색이 빈 공간을 채워줍니다. 색상을 조정해보세요.
2. **MP4가 나오지 않을 때**: 브라우저 지원이 없으면 WebM으로 저장됩니다.
   변환이 필요하면 [CloudConvert](https://cloudconvert.com/webm-to-mp4) 같은 서비스 이용 가능.
3. **긴 동영상**: 30초 이상은 메모리 소모가 커집니다. 해상도를 낮추면 더 안정적입니다.
4. **음악 길이**: 동영상보다 길면 중간에 잘리고, 짧으면 그대로 끝납니다.

---

## 📂 프로젝트 구조

```
easy-video-maker/
├── index.html      # 메인 페이지
├── style.css       # 다크 테마 반응형 디자인
├── app.js          # Canvas + MediaRecorder 로직
├── favicon.svg     # 앱 아이콘
├── README.md       # 이 문서
└── .github/
    └── workflows/
        └── deploy.yml  # GitHub Pages 자동 배포
```

---

## 🔧 기술 스택

- **HTML5 Canvas** — 프레임 렌더링
- **MediaRecorder API** — 동영상 인코딩
- **Web Audio API** — 배경음악 병합
- **Vanilla JavaScript** — 빌드 툴 불필요
- **GitHub Pages** — 정적 호스팅

---

## 🔒 개인정보 & 안전성

모든 처리는 **여러분의 브라우저 안에서만** 이루어집니다.
사진·음악·동영상은 어떤 서버로도 전송되지 않아요. 완전히 오프라인에서도 동작합니다.

---

## 📄 라이선스

MIT License — 자유롭게 사용, 수정, 배포 가능합니다.

---

## 🙏 만든이

AI 개발자 도우미와 함께 제작 🤖✨

이슈/피드백은 [Issues](https://github.com/yimss1803-cmd/easy-video-maker/issues) 탭에 남겨주세요!
