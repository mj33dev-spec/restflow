# RestFlow

REST API 개발 및 테스트를 위한 차세대 데스크톱 클라이언트입니다.

---

## 💻 윈도우 전용 데스크톱 앱 추출 방법 (`.exe`)

RestFlow는 Electron 기반으로 브라우저 CORS 제약 없이 동작하는 윈도우 앱으로 추출할 수 있습니다.

### 1. 패키지 추출 명령어
`front` 디렉터리로 이동한 뒤 아래 명령어를 실행합니다:

```bash
cd front
npm run electron:build:win
```

### 2. 추출된 실행 파일 위치
빌드가 완료되면 아래 경로에 윈도우 실행 파일이 생성됩니다:
- `front/dist-app/RestFlow-win32-x64/RestFlow.exe`

---

## 🚀 주요 개발 명령어

| 구분 | 명령어 | 설명 |
| :--- | :--- | :--- |
| **데스크톱 앱 빌드** | `npm run electron:build:win` | 윈도우 실행 파일(`RestFlow.exe`) 생성 |
| **데스크톱 개발 모드** | `npm run electron:dev` | Electron 데스크톱 앱 개발 모드 실행 |
| **웹 개발 모드** | `npm run dev` | Vite 웹 개발 서버 실행 (`http://localhost:3000`) |

