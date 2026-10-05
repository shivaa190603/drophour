# DropHour — Temporary File Sharing

> **Share files. They disappear in an hour.**  
> Completely free, no-login, temporary file-sharing utility. Upload a file, receive an instant private link, short share code, and QR code. After exactly 1 hour, the file and metadata are permanently erased.

---

## ⚡ Key Highlights

- **Zero Friction:** No account, no registration, no passwords, no subscriptions.
- **Strict 1-Hour Lifecycle:** Automatically expires and deletes files 60 minutes after upload.
- **Multiple Sharing Methods:**
  - **Direct Share Link:** Private, unguessable cryptographic token (`/s/:token`).
  - **Human-Friendly Share Code:** 8-character formatted code (e.g., `AB82-KX91`) excluding ambiguous characters (`0`, `O`, `1`, `I`, `L`).
  - **Scannable QR Code:** Points to the temporary download page with instant PNG download.
- **Two-Layer Expiration System:**
  1. *Immediate Logical Expiration:* Access checks `expires_at <= NOW()` on every request so expired files cannot be downloaded even before physical cleanup runs.
  2. *Automated Physical Deletion:* Automated jobs call the Supabase Storage API (`storage.remove()`) to permanently purge storage objects and remove database records.
- **Clean Developer-Built Aesthetic:**
  - Strictly **flat solid colors** (No AI gradients, no glowing neon, no glassmorphism, no 3D gimmicks).
  - High-contrast, responsive layout capped at a comfortable 900px desktop width.
  - Fully accessible (keyboard navigation, ARIA landmarks, file picker alternative to drag & drop).
- **Dual-Mode Architecture:** Works instantly out of the box in local demo mode (using browser IndexedDB) with zero configuration, and connects seamlessly to live Supabase with one `.env` file.

---

## 🛠 Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4
- **Icons & QR:** Lucide Icons, `qrcode.react`
- **Backend / Storage:** Supabase (PostgreSQL, Private Storage Bucket `temporary-files`, Edge Functions)
- **Scheduled Cleanup:** `pg_cron` / Supabase Cron + Edge Functions

---

## 🚀 Quickstart

### 1. Run Locally (Zero Config Demo Mode)
DropHour includes an in-browser storage engine (IndexedDB + localStorage) that simulates the full upload, 1-hour countdown, code lookup, signed download, and instant deletion without needing any backend setup:

```bash
git clone <repo-url>
cd "share anywhere"
npm install
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

### 2. Connect to Live Supabase

#### A. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Navigate to **SQL Editor** and run the contents of [`supabase/migrations/20261004000000_create_file_shares.sql`](./supabase/migrations/20261004000000_create_file_shares.sql).
   This creates:
   - `public.file_shares` table with RLS policies and indexes.
   - Private storage bucket `temporary-files` (public = false, 50MB limit).
   - Stored cleanup function `public.cleanup_expired_file_shares()`.

#### B. Configure Environment Variables
Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Add your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

#### C. Deploy Edge Functions (Optional for Cloud Execution)
If using the Supabase CLI:

```bash
supabase functions deploy create-share --no-verify-jwt
supabase functions deploy download-share --no-verify-jwt
supabase functions deploy delete-share --no-verify-jwt
supabase functions deploy cleanup-expired --no-verify-jwt
```

#### D. Setup Recurring Cleanup
In your Supabase Dashboard under **Database -> Extensions**, ensure `pg_cron` and `pg_net` are enabled.
The migration automatically schedules the cleanup job every 1 minute:
```sql
SELECT cron.schedule(
    'cleanup-expired-shares-every-minute',
    '* * * * *',
    'SELECT public.cleanup_expired_file_shares();'
);
```

To invoke the `cleanup-expired` Edge Function on schedule, you can configure Supabase Scheduled Functions or use `pg_net` to trigger the HTTP endpoint.

---

## 📁 Project Structure

```
share-anywhere/
├── public/
│   └── favicon.svg                  # Minimalist SVG clock/file icon
├── src/
│   ├── components/
│   │   ├── Countdown.tsx            # Real-time visual expiration countdown
│   │   ├── DeleteConfirmModal.tsx   # Immediate file deletion modal
│   │   ├── DownloadButton.tsx       # Secure signed URL download trigger
│   │   ├── FilePreview.tsx          # Selected file card & upload progress
│   │   ├── Footer.tsx               # Minimal footer with privacy/terms dialogs
│   │   ├── Header.tsx               # Brand header with How-It-Works modal trigger
│   │   ├── HowItWorksModal.tsx      # Step-by-step lifecycle modal
│   │   ├── QRCode.tsx               # QR Code canvas with PNG download
│   │   ├── ShareCode.tsx            # Formatted code (AB82-KX91) with copy
│   │   ├── ShareCodeLookup.tsx      # Direct code entry search bar
│   │   ├── ShareLink.tsx            # Unique URL box with copy button
│   │   └── UploadBox.tsx            # Drag & drop upload area with file picker
│   ├── hooks/
│   │   ├── useCountdown.ts          # Precise 1-hour expiration hook
│   │   └── useUpload.ts             # Upload state machine hook
│   ├── lib/
│   │   ├── formatters.ts            # File sizes, countdowns, categories
│   │   ├── local-storage-db.ts      # IndexedDB engine for demo mode
│   │   ├── storage-service.ts       # Unified Supabase + Local storage adapter
│   │   ├── supabase.ts              # Supabase client initialization
│   │   └── validation.ts            # Cryptographic token & share code generators
│   ├── pages/
│   │   ├── Expired.tsx              # Clean "File no longer available" page
│   │   ├── Home.tsx                 # Upload & share result views
│   │   ├── NotFound.tsx             # 404 / Invalid link page
│   │   └── Share.tsx                # Secure recipient download page
│   ├── types/
│   │   └── file.ts                  # TypeScript models and interfaces
│   ├── App.tsx                      # Client router & cleanup scheduler
│   ├── index.css                    # Tailwind CSS v4 & theme variables
│   └── main.tsx                     # Entrypoint
├── supabase/
│   ├── functions/
│   │   ├── cleanup-expired/         # Edge function: Storage API purge
│   │   ├── create-share/            # Edge function: Private storage upload
│   │   ├── delete-share/            # Edge function: Management token delete
│   │   └── download-share/          # Edge function: Signed URL generator
│   ├── migrations/
│   │   └── 20261004000000_create_file_shares.sql
│   └── config.toml                  # Supabase local configuration
└── README.md
```

---

## 🔒 Security Principles

1. **Private Bucket Access:** Storage objects are kept in a strictly private bucket (`public = false`). Direct public URLs do not exist.
2. **Short-Lived Signed URLs:** Download links are signed on the fly with a 60-second validity period.
3. **Storage API Deletion:** Deletions are executed via Supabase Storage API (`supabase.storage.from().remove()`) rather than raw SQL table row deletions, preventing orphaned objects.
4. **Token Security:** Share tokens are generated with 24-character cryptographic randomness (`crypto.getRandomValues()`).
5. **Human-Friendly Share Codes:** Uses an 8-character charset (`2-9`, `A-Z` without `0, O, 1, I, L`) formatted as `XXXX-XXXX` to eliminate ambiguities.
6. **No Leaked Secrets:** Frontend only uses anonymous public keys; privileged deletion and signing tasks run server-side or via separate management tokens.
