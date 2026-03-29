# Rencana komprehensif web docs `timetable-sa` (Fumadocs + TanStack Start)

Dokumen ini adalah playbook implementasi detail untuk membangun website
dokumentasi `timetable-sa` pada repo terpisah, dengan konten sumber dari
folder `docs/` di repo package ini.

Rencana ini memakai acuan teknis Fumadocs dan TanStack Start yang dibaca melalui
Context7, lalu diterjemahkan menjadi langkah kerja yang bisa langsung
dijalankan oleh tim kecil.

## Ringkasan keputusan utama

Bagian ini menjawab pertanyaan inti terlebih dahulu agar semua langkah turunan
konsisten.

1. Ya, buat directory baru dan repository baru khusus web docs.
2. `docs/` di repo package tetap jadi source of truth konten.
3. Repo web docs melakukan sinkronisasi file Markdown saat CI/build-time,
   bukan runtime remote fetch.
4. Website docs di-deploy di provider free tier (rekomendasi awal: Vercel).
5. Fase pertama fokus single version (`latest`) dan static-first delivery.

## Referensi teknis (Context7)

Bagian ini merangkum poin penting dari dokumentasi yang dipakai sebagai dasar
implementasi.

- Fumadocs + TanStack Start:
  - `vite.config.ts` memakai `fumadocs-mdx/vite` + plugin
    `tanstackStart`.
  - Root app dibungkus `RootProvider` dari
    `fumadocs-ui/provider/tanstack`.
  - Source docs dikonfigurasi via `source.config.ts` (`defineDocs`).
  - Route docs dapat memakai splat route `/docs/$` dengan `createFileRoute`.
  - Frontmatter (`title`, `description`, opsional `icon`) dipakai sebagai
    metadata halaman.
  - `meta.json` dipakai untuk urutan dan struktur navigasi.
- TanStack Start:
  - File-based routing adalah jalur utama.
  - Route dinamis/splat untuk docs path bertingkat didukung native.
  - Scaffold app bisa dimulai dari `npx @tanstack/cli@latest create`
    atau `pnpx create-start-app <name>`.

## Sasaran fase 1 (MVP docs web)

Bagian ini menetapkan target realistis agar launch cepat namun tetap rapi.

- Tersedia web docs production untuk konten `docs/` saat ini.
- URL docs stabil di `/docs/...`.
- Sidebar dan page tree terbentuk otomatis.
- CI memvalidasi build + link + quality gate dasar.
- PR preview aktif.
- Konten docs tersinkron otomatis dari repo package.

## Ruang lingkup

Bagian ini membatasi pekerjaan agar tidak melebar terlalu dini.

- In scope:
  - repo web docs baru,
  - integrasi Fumadocs + TanStack Start,
  - sinkronisasi `docs/` dari repo package,
  - frontmatter minimum dan `meta.json`,
  - deploy free tier,
  - observability dasar (build logs + deploy status).
- Out of scope fase 1:
  - versioning docs per semver tag,
  - i18n,
  - OpenAPI generator,
  - custom search pipeline kompleks,
  - analytics lanjutan.

## Inventaris konten sumber saat ini

Bagian ini jadi baseline migrasi konten.

Halaman utama dari `docs/`:

- `README.md`
- `introduction.md`
- `installation.md`
- `quickstart.md`
- `getting-started.md`
- `core-concepts.md`
- `configuration.md`
- `advanced-features.md`
- `examples.md`
- `testing-guide.md`
- `troubleshooting.md`
- `architecture.md`
- `api-reference.md`
- `migration-guide.md`

## Arsitektur repository

Bagian ini menentukan boundary antar repo agar maintainable.

### Repo package (saat ini)

- Menyimpan source code library.
- Menyimpan source docs generic di `docs/`.
- Tidak berisi konfigurasi framework web docs.

### Repo web docs (baru)

- Menyimpan app TanStack Start + Fumadocs.
- Menyimpan hasil sync konten ke `content/docs/`.
- Menyimpan automasi transform, quality gate, dan deploy pipeline.

## Struktur target repo web docs

Bagian ini bisa dipakai sebagai checklist struktur direktori final.

```text
timetable-sa-docs/
  .github/
    workflows/
      docs-sync.yml
      ci.yml
      deploy.yml
  content/
    docs/
      index.md
      introduction.md
      installation.md
      quickstart.md
      core-concepts.md
      configuration.md
      advanced-features.md
      examples.md
      testing-guide.md
      troubleshooting.md
      architecture.md
      api-reference.md
      migration-guide.md
      meta.json
  scripts/
    sync-docs.mjs
    transform-docs.mjs
    validate-frontmatter.mjs
  src/
    lib/
      source.ts
      layout.shared.tsx
    routes/
      __root.tsx
      index.tsx
      docs/$.tsx
      docs/index.tsx
  source.config.ts
  vite.config.ts
  package.json
  README.md
```

## Implementasi langkah demi langkah

Bagian ini adalah runbook detail yang bisa langsung dieksekusi.

### Langkah 1 - Buat directory lokal dan repository baru

Mulai dari setup repository agar semua pekerjaan berikutnya punya wadah yang
jelas.

1. Buat directory baru di luar repo package.
2. Scaffold project TanStack Start.
3. Inisialisasi git dan remote.
4. Buat repository GitHub.

Contoh alur command (sesuaikan tool favorit):

```bash
mkdir -p ~/projects/timetable-sa-docs
cd ~/projects/timetable-sa-docs
npx @tanstack/cli@latest create
# atau
# pnpx create-start-app timetable-sa-docs
```

Setelah scaffold:

```bash
git init
git add .
git commit -m "chore: bootstrap TanStack Start docs app"
gh repo create albertabayor/timetable-sa-docs --private --source=. --push
```

### Langkah 2 - Pasang Fumadocs di app baru

Integrasi awal Fumadocs dilakukan di dependency, config, root provider, dan
source docs.

1. Tambahkan package Fumadocs yang dibutuhkan.
2. Update `vite.config.ts`:
   - plugin `fumadocs-mdx/vite`,
   - plugin `tanstackStart` dengan prerender aktif.
3. Tambah `source.config.ts` untuk mengarah ke `content/docs`.
4. Tambah `RootProvider` di `src/routes/__root.tsx`.

Checklist verifikasi:

- `pnpm dev` atau `npm run dev` jalan tanpa error.
- root route render normal.
- build lokal sukses.

### Langkah 3 - Buat route docs dan source loader

Tahap ini membuat jalur `/docs/...` benar-benar bisa merender konten.

1. Buat `src/lib/source.ts`.
2. Buat route `src/routes/docs/$.tsx`.
3. Parse `_splat` untuk slug bertingkat.
4. Resolve halaman dengan `source.getPage(slugs)`.
5. Tampilkan 404 jika slug tidak ditemukan.
6. Bangun sidebar dari `source.getPageTree()`.

Checklist verifikasi:

- `/docs` membuka halaman index docs.
- `/docs/installation` dan route lain terbuka.
- route invalid mengembalikan 404 yang benar.

### Langkah 4 - Migrasi konten dari repo package ke `content/docs`

Tahap ini memindahkan konten sumber ke struktur yang bisa dipakai Fumadocs.

1. Salin semua `docs/*.md` dari repo package.
2. Ubah `README.md` menjadi `index.md`.
3. Tambahkan frontmatter minimum jika belum ada:
   - `title`,
   - `description`.
4. Buat `meta.json` untuk urutan sidebar.
5. Audit dan perbaiki link internal.

Checklist verifikasi:

- tidak ada dead links internal,
- semua halaman tampil di sidebar sesuai urutan,
- metadata tampil benar di title/description.

### Langkah 5 - Otomasi sinkronisasi konten (CI sync)

Tahap ini menghilangkan proses manual agar docs selalu sinkron.

1. Buat script `scripts/sync-docs.mjs`:
   - clone/fetch repo package,
   - copy folder `docs/` ke `content/docs/_raw` atau staging.
2. Buat script `scripts/transform-docs.mjs`:
   - `README.md -> index.md`,
   - inject frontmatter fallback,
   - rewrite link `.md` bila perlu,
   - generate/refresh `meta.json`.
3. Buat workflow `docs-sync.yml`.
4. Trigger workflow:
   - `workflow_dispatch`,
   - `repository_dispatch` dari repo package,
   - optional `schedule` harian.

Checklist verifikasi:

- jalur sync bisa dijalankan lokal dan CI,
- hasil transform deterministik,
- perubahan konten tercatat jelas di PR/commit.

### Langkah 6 - CI quality gate

Tahap ini memastikan setiap perubahan docs aman untuk di-merge.

Jalankan pada PR:

1. install dependencies,
2. lint/typecheck,
3. build,
4. validate frontmatter,
5. check broken links internal.

Jika salah satu gagal, PR tidak boleh merge.

### Langkah 7 - Deploy free tier

Tahap ini menempatkan docs online secepat mungkin dengan biaya nol.

Rekomendasi urutan provider:

1. Vercel (paling cepat untuk mulai).
2. Netlify (alternatif bagus).
3. Cloudflare Pages (opsi efisien untuk skala lanjut).

Konfigurasi minimal deploy:

- Build command: command default project (`npm run build` atau `pnpm build`).
- Output: mengikuti adapter TanStack Start yang dipakai.
- Environment vars: hanya jika memang dibutuhkan.
- PR preview: aktif.

### Langkah 8 - Launch checklist

Tahap ini memastikan kualitas akhir sebelum diumumkan ke pengguna.

1. Uji 10 halaman docs utama.
2. Uji mobile dan desktop.
3. Uji URL dari README package ke web docs.
4. Uji fallback 404.
5. Uji sync pipeline sekali dari perubahan real di repo package.

## Desain pipeline CI/CD yang direkomendasikan

Bagian ini menjelaskan alur antar workflow tanpa mengikat ke vendor tertentu.

### Workflow A - `docs-sync.yml`

Fungsi:

- sinkronisasi konten dari repo package,
- transform untuk Fumadocs,
- buka PR otomatis atau commit ke branch sync.

Trigger:

- manual dispatch,
- schedule,
- repository dispatch dari repo package.

### Workflow B - `ci.yml`

Fungsi:

- validasi kualitas setiap PR.

Job inti:

- install,
- typecheck/lint,
- build,
- validate frontmatter,
- link checker.

### Workflow C - `deploy.yml`

Fungsi:

- deploy ke provider saat merge ke `main`.

Catatan:

- jika provider sudah punya native Git integration (misalnya Vercel),
  workflow deploy custom bisa dibuat minimal atau tidak perlu.

## Strategi frontmatter dan metadata

Bagian ini menjaga konsistensi pengalaman baca lintas halaman.

### Aturan minimum per halaman

- `title`: wajib.
- `description`: wajib.
- `icon`: opsional, hanya jika memang dipakai di sidebar.

### Fallback otomatis saat sync

1. Jika belum ada `title`, ambil dari heading pertama.
2. Jika belum ada `description`, ambil paragraf pertama.
3. Jika file kosong metadata total, injeksikan blok frontmatter standar.

## Rekomendasi awal `meta.json`

Urutan awal yang sesuai user journey:

1. `index`
2. `introduction`
3. `installation`
4. `quickstart`
5. `core-concepts`
6. `configuration`
7. `advanced-features`
8. `examples`
9. `testing-guide`
10. `troubleshooting`
11. `architecture`
12. `api-reference`
13. `migration-guide`

Catatan:

- `getting-started.md` bisa dipertahankan sebagai alias atau redirect jika
  kontennya overlap dengan `quickstart`.

## Integrasi dengan repo package

Bagian ini menjelaskan hubungan operasional antar dua repo.

### Di repo package

- Tetap menulis docs di folder `docs/`.
- Optional: tambahkan workflow kecil untuk memicu sync di repo web docs saat
  ada perubahan docs pada `main`.

### Di repo web docs

- Menjadi tempat transform dan rendering.
- Menjadi tempat deploy production docs.
- Menjadi tempat quality gate docs UI.

## Risiko, anti-pattern, dan mitigasi

Bagian ini memperjelas hal yang harus dihindari sejak awal.

- Anti-pattern: runtime fetch raw markdown dari GitHub setiap request.
  - Dampak: lambat, rawan rate limit, sulit predictable.
  - Mitigasi: build-time sync.
- Risiko: drift konten antar repo.
  - Mitigasi: sync otomatis + checklist release.
- Risiko: link internal pecah setelah transform.
  - Mitigasi: link checker + mapping rules.
- Risiko: perubahan route menyebabkan URL lama mati.
  - Mitigasi: redirect map untuk slug lama.
- Risiko: scope melebar ke versioning terlalu cepat.
  - Mitigasi: lock scope fase 1.

## Estimasi effort detail

Bagian ini memberi estimasi per fase untuk planning sprint.

- Fase setup repo + bootstrap: 0.5-1 hari.
- Fase integrasi Fumadocs route + source: 1-2 hari.
- Fase migrasi konten + metadata: 1-2 hari.
- Fase sync automation + CI: 1-2 hari.
- Fase deploy + hardening: 1 hari.

Total: 4.5-8 hari kerja.

## Definition of done fase 1

Fase 1 dianggap selesai jika semua item ini terpenuhi.

- Web docs live di free tier provider.
- Semua halaman inti dari `docs/` tersedia di `/docs/...`.
- Build PR dan main branch konsisten hijau.
- Sync konten otomatis berjalan end-to-end.
- Tidak ada dead links internal.
- README package menautkan ke web docs yang aktif.

## Eksekusi segera (urut paling praktis)

Gunakan urutan ini jika kamu ingin langsung mulai hari ini.

1. Buat repo baru `timetable-sa-docs`.
2. Scaffold TanStack Start.
3. Pasang Fumadocs dan route `/docs/$`.
4. Migrasi 3 halaman pilot:
   - `index`,
   - `installation`,
   - `quickstart`.
5. Deploy preview di Vercel.
6. Tambah sync automation.
7. Migrasi semua halaman.
8. Go live.

## Next steps fase 2 (setelah MVP stabil)

Setelah fase 1 stabil, backlog lanjutan ini bisa diprioritaskan.

1. Versioned docs berdasarkan git tag.
2. Search tuning dan analytics.
3. Automated API docs pipeline.
4. i18n jika dibutuhkan audience lebih luas.
