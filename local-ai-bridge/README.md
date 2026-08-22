# Notulensi Local AI Bridge

Bridge ini membuat Ollama lokal dapat digunakan oleh production tanpa mengekspos port Ollama langsung ke internet.

## Arsitektur

Browser → Vercel AI Gateway → authenticated bridge → Ollama localhost:11434

Production harus mengarah ke HTTPS bridge yang hanya menerima request dari gateway dan memerlukan bearer token. Jangan membuka port 11434 ke internet.

## Prasyarat

- Windows/macOS/Linux
- Node.js 20+
- Ollama terpasang
- model lokal, misalnya `qwen2.5:7b`

## Konfigurasi

Environment bridge:

- `OLLAMA_URL=http://127.0.0.1:11434`
- `LOCAL_AI_BRIDGE_TOKEN=<random-long-secret>`
- `PORT=8787`
- `ALLOWED_ORIGIN=https://<production-app-domain>`

Environment Vercel:

- `OLLAMA_BASE_URL=https://<secure-bridge-host>`
- `OLLAMA_BRIDGE_TOKEN=<same-secret>`

## Prinsip keamanan

- Tidak pernah expose `11434` langsung.
- Token hanya server-side.
- Browser tidak pernah menerima token bridge.
- Bridge meneruskan hanya endpoint `/api/tags` dan `/api/chat`.
- Batasi payload dan timeout.
- Gunakan HTTPS pada bridge publik.
