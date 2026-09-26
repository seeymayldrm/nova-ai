# NOVA — Okan için kişisel AI asistanı

NOVA, Okan'ın çalışma ritmini, Şeyma ile olan doğal dilini, inside joke'ları ve Erhan Kolbaşı / yeni dünya merakını bilen; genç, dinamik ve biraz daha muzur tasarlanmış bir chatbot demodur.

## Stack

- Frontend: React + Vite
- Backend: Node + Express
- Model: Google Gemini Interactions API
- Varsayılan model: `gemini-3.8-flash`

## Kurulum

### 1) Paketleri yükle

```bash
npm install
```

### 2) `.env` oluştur

`server/.env.example` dosyasını `server/.env` olarak kopyala veya elle oluştur:

```env
GEMINI_API_KEY=BURAYA_GOOGLE_AI_STUDIO_KEY
GEMINI_MODEL=gemini-3.8-flash
PORT=3001
```

### 3) Geliştirme modunda çalıştır

```bash
npm run dev
```

- frontend: `http://localhost:5173`
- backend: `http://localhost:3001`

## Deploy (Render)

- Build Command:
  ```bash
  npm install && npm run build
  ```
- Start Command:
  ```bash
  npm start
  ```
- Environment Variables:
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL=gemini-3.8-flash`

Bu sürümde `app.set("trust proxy", 1)` ekli olduğu için Render rate-limit/proxy hatasına düşmez.

## Dosya Yapısı

```text
client/                # genç/dinamik UI
server/
  context/             # NOVA karakter, hafıza ve Erhan Kolbaşı ilgi modülü
  src/
    index.js
    novaPrompt.js
    sessionStore.js
```

## Notlar

- API key'i GitHub'a yüklemeyin.
- `server/.env` dosyasını repo'ya koymayın.
- Hassas veriler promptta veya bellekte yüzeye çıkarılmamalıdır.
