# Local AI — Ollama untuk Notulensi

## Arsitektur

Browser → Notulensi server → HTTPS AI Gateway → Ollama (`127.0.0.1:11434`) → `gemma3:1b`.

Ollama tetap localhost-only. Gateway menjadi satu-satunya endpoint yang boleh menerima request dari Notulensi.

## Windows — Ollama

1. Verifikasi Ollama:

```powershell
ollama list
```

2. Pastikan model tersedia:

```powershell
ollama run gemma3:1b
```

3. Verifikasi API lokal:

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:11434/api/tags'
```

Jangan membuka port `11434` ke internet.

## AI Gateway

Gateway lokal mendengarkan pada:

```text
http://127.0.0.1:8787
```

Health check:

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:8787/health'
```

Gateway hanya mengizinkan model `gemma3:1b`, membatasi request ke endpoint chat, dan memerlukan Bearer token.

Environment gateway:

```text
NOTULENSI_AI_TOKEN=<secret>
```

Token harus disimpan sebagai environment variable dan tidak boleh ditulis ke source code, database, browser, log, atau chat.

## Notulensi Full — environment server

Untuk deployment Notulensi Full, gunakan environment variable berikut:

```text
LOCAL_AI_BASE_URL=https://<secure-gateway-host>
LOCAL_AI_MODEL=gemma3:1b
LOCAL_AI_GATEWAY_TOKEN=<secret-yang-sama-dengan-gateway>
```

`LOCAL_AI_BASE_URL` harus menunjuk ke **AI Gateway**, bukan ke Ollama `:11434`.

`LOCAL_AI_GATEWAY_TOKEN` hanya digunakan server-side oleh provider adapter. Jangan mengeksposnya ke browser.

Environment variables tersebut dapat digunakan tanpa mengubah schema database atau menjalankan migration.

## Security boundary

- Ollama: `127.0.0.1:11434` only.
- Gateway: `127.0.0.1:8787` secara lokal.
- Internet hanya menuju Gateway melalui HTTPS/tunnel yang memiliki autentikasi.
- Tidak ada akses browser langsung ke Ollama.
- Jangan menaruh token di frontend, HTML, JavaScript client, atau database konfigurasi AI.

## Production

Untuk Vercel, server Notulensi tidak dapat mengakses `127.0.0.1` milik PC. Gunakan secure HTTPS tunnel atau jaringan privat yang dapat menjangkau Gateway.

Urutan deployment yang aman:

1. Uji Gateway lokal.
2. Uji endpoint HTTPS Gateway.
3. Set `LOCAL_AI_BASE_URL`, `LOCAL_AI_MODEL`, dan `LOCAL_AI_GATEWAY_TOKEN` pada Preview Vercel.
4. Jalankan smoke test dan regression test Preview.
5. Verifikasi fitur AI pada Preview.
6. Hanya setelah PASS, pertimbangkan Production.

Tidak ada migration, `db:push`, atau perubahan schema yang diperlukan untuk integrasi ini.
