# RestFlow - 데스크톱 API 테스트 클라이언트

RestFlow는 브라우저의 CORS 제약 없이 자유롭게 API를 테스트할 수 있는 **Electron 기반 윈도우/맥 데스크톱 응용 프로그램**입니다.

---

## 🚀 데스크톱 앱 실행 및 윈도우 `.exe` 빌드/추출 방법

### 1. 개발 모드 (Electron 데스크톱 앱 띄우기)
개발 중 실시간 코드를 데스크톱 창으로 테스트할 때 사용합니다.
```bash
npm run electron:dev
```

---

### 2. 윈도우 전용 데스크톱 앱 추출 (Build)
윈도우 환경에서 실행 가능한 독립형 데스크톱 실행 패키지(`.exe`)를 추출합니다.

```bash
npm run electron:build:win
```

### 2-1. 윈도우 전용 데스크톱 앱 아이콘 제거
```bash
"electron:build:win": "npm run build && npx electron-packager . RestFlow --platform=win32 --arch=x64 --out=dist-desktop --overwrite --icon=electron/icon --ignore=\"^/(src|public|release|\\.git)\""
```

#### 📁 추출 완료 파일 위치
빌드가 완료되면 프로젝트 내 아래 경로에 윈도우 실행 파일이 생성됩니다:
```text
d:\study\restflow\front\dist-desktop\RestFlow-win32-x64\RestFlow.exe
```
> **참고**: 추출된 `RestFlow-win32-x64` 폴더 내의 **`RestFlow.exe`**를 더블 클릭하시면 별도의 서버 실행이나 브라우저 없이 독립 앱으로 즉시 실행됩니다.

---

## 🛠 주요 스크립트 안내

| 명령어 | 설명 |
| :--- | :--- |
| `npm run dev` | 웹 브라우저 전용 Vite 개발 서버 실행 |
| `npm run build` | React / TypeScript 웹 프로덕션 빌드 |
| `npm run electron:dev` | Electron 데스크톱 앱 개발 모드 실행 |
| `npm run electron:build:win` | 윈도우 전용 데스크톱 실행 패키지(`RestFlow.exe`) 추출 |

---

## 💡 특징
- **CORS 제약 100% 없음**: 데스크톱 샌드박스를 이용하므로 `localhost:5000` 등 어떤 로컬/외부 서버이든 CORS 우회 프록시 없이 5ms 내외로 직통 통신합니다.
- **실시간 자동 저장**: 시트 이름, 주소창, 컬렉션 폴더 이름 수정 시 별도의 저장 버튼 없이 실시간으로 유연하게 저장 및 동기화됩니다.
