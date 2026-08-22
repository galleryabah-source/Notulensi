# Local AI — Ollama untuk Notulensi

## Arsitektur

Browser → Notulensi server lokal → Ollama (`http://127.0.0.1:11434`) → model lokal.

Ini adalah mode **local-first**. Tidak ada API key AI dan tidak ada quota provider cloud. Batas praktisnya adalah kemampuan perangkat (CPU/RAM/GPU) dan model yang dipasang.

## Windows

1. Install Ollama dari https://ollama.com/download.
2. Buka PowerShell baru dan verifikasi:

```powershell
ollama --version
```

3. Tarik model default:

```powershell
ollama pull qwen2.5:7b
```

4. Verifikasi:

```powershell
ollama list
```

5. Tes API:

```powershell
$body = @{ model = 'qwen2.5:7b'; messages = @(@{ role = 'user'; content = 'Reply with exactly OK.' }); stream = $false } | ConvertTo-Json -Depth 5
Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:11434/api/chat' -ContentType 'application/json' -Body $body
```

Ollama menyediakan API lokal di port 11434 dan dapat berjalan tanpa layanan AI cloud. Untuk Windows, aplikasi Ollama menjalankan API di background.

## Menjalankan Notulensi dengan Local AI

**Penting:** deployment Vercel tidak dapat mengakses `127.0.0.1` milik komputer pengguna. Untuk benar-benar memakai model lokal, jalankan backend/Notulensi dari komputer yang sama dengan Ollama, atau gunakan endpoint jaringan privat yang dapat dijangkau server aplikasi. Jangan mengekspos port Ollama ke internet tanpa pengamanan.

Environment lokal:

```text
LOCAL_AI_BASE_URL=http://127.0.0.1:11434
```

Provider:

```text
ollama
```

Model:

```text
qwen2.5:7b
```

Tidak perlu API key.

## Admin

Buka Pengaturan AI sebagai Admin. Pilih:

- `Local AI — Ollama`
- Base URL: `http://127.0.0.1:11434`
- Model: `qwen2.5:7b`

Klik **Simpan & Verifikasi**.

Server akan menjalankan smoke test `Reply with exactly OK.` sebelum konfigurasi disimpan sebagai valid.

## Production

Jika aplikasi tetap di Vercel, gunakan local AI hanya untuk development/local deployment. Untuk production, pilihan yang aman adalah:

1. server aplikasi dan Ollama berada pada mesin/server privat yang sama; atau
2. Ollama berada pada jaringan privat yang dapat dijangkau server aplikasi.

Jangan mengubah `LOCAL_AI_BASE_URL` menjadi alamat publik tanpa autentikasi, TLS, dan pembatasan akses.
