# SISTEM USULAN (SUGGESTION SYSTEM)

## DOCUMENT PORTAL — PORTAL DOKUMEN PERUSAHAAN

---

## BAGIAN 1: RENCANA USULAN

### A. Uraian Masalah

Saat ini, dokumen-dokumen perusahaan seperti memo, instruksi kerja, peraturan, *golden rules*, serta pedoman operasional lainnya tersimpan secara tidak terstruktur di folder lokal komputer masing-masing karyawan. Kondisi ini menimbulkan beberapa permasalahan:

- **Pencarian tidak efisien** — Karyawan harus menebak lokasi penyimpanan atau bertanya ke rekan kerja, yang menghabiskan waktu kerja yang produktif.
- **Tidak ada standarisasi** — Setiap individu menyimpan dokumen dengan cara masing-masing, sehingga tidak ada jaminan semua pihak mengakses versi dokumen yang sama.
- **Keterbatasan akses** — Dokumen hanya dapat diakses dari perangkat tempat dokumen tersebut disimpan, tidak mendukung pekerjaan jarak jauh maupun perangkat mobile.

### B. Kondisi Saat Ini

- Belum tersedia sistem digitalisasi terpusat untuk dokumen prosedur kerja.
- Belum ada platform yang dapat diakses dari berbagai perangkat (telepon genggam, tablet, komputer) tanpa batasan lokasi.
- Proses distribusi pembaruan dokumen masih dilakukan secara manual satu per satu.

### C. Ide yang Diajukan

Membangun **Document Portal**, yaitu portal dokumen berbasis web yang terintegrasi dengan Google Drive, sehingga:

- Seluruh dokumen prosedur tersimpan terpusat di Google Drive dan selalu *up-to-date*.
- Karyawan dapat mengakses dokumen kapan saja, di mana saja, dari perangkat apa pun (telepon genggam, tablet, maupun komputer).
- Pencarian dokumen dapat dilakukan dengan cepat melalui fitur pencarian dan filter kategori.
- Setiap dokumen dilengkapi **QR Code** yang dapat dipindai untuk akses instan.

> **Teknologi yang digunakan:** React JS, Tailwind CSS, Google Drive API, Google Sheets (Apps Script), QR Code generator, Vite.
> **Biaya operasional:** Rp 0 (Nol Rupiah) — seluruh infrastruktur menggunakan layanan gratis.

---

## BAGIAN 2: LAPORAN PENERAPAN

### A. Keadaan Sekarang Sesudah Perbaikan

#### Uraian Proses

Sejak diterapkannya Document Portal, alur kerja akses dokumen berubah sebagai berikut:

**Sebelum:**
1. Karyawan mencari dokumen di folder PC masing-masing.
2. Jika tidak ditemukan, bertanya ke rekan atau atasan.
3. Dokumen dikirim ulang melalui e-mail atau *flashdisk*.
4. Belum tentu versi dokumen yang diterima adalah yang terbaru.
5. Waktu yang dihabiskan: **10–30 menit** per pencarian.

**Sesudah:**
1. Karyawan membuka Document Portal dari perangkat apa pun ( cukup scan QR Code atau buka *link* ).
2. Cari dokumen menggunakan fitur pencarian atau filter kategori.
3. Klik dokumen — PDF langsung tampil di layar.
4. Dokumen dapat diunduh untuk akses *offline*.
5. Waktu yang dihabiskan: **< 1 menit** per pencarian.

**Alur pengelolaan dokumen (Admin):**
1. Admin *upload* PDF langsung dari dashboard — pilih file, sistem otomatis mengirim ke Drive dan menyinkronkan ke Sheet.
2. Dokumen dapat dihapus atau diganti dengan versi baru langsung dari dashboard.
3. Urutan dokumen dapat diatur ulang dengan *drag-and-drop*.
4. Semua perubahan langsung tampil di portal tanpa perlu *deploy* ulang.

### B. Evaluasi Hasil

#### Manfaat yang Diperoleh (QCDSM)

| Parameter | Dampak | Keterangan |
|---|---|---|
| **Q — Quality** (Kualitas) | Setiap karyawan mengakses **dokumen versi yang sama dan terbaru**, mengurangi risiko kesalahan akibat dokumen usang. | Semua dokumen merujuk ke sumber yang sama di Google Drive. |
| **C — Cost** (Biaya) | **Biaya operasional Rp 0.** Tidak ada biaya server, lisensi, maupun langganan. Infrastruktur menggunakan Vercel (hosting gratis), Google Drive (penyimpanan gratis), dan Google Sheets (basis data gratis). | Penghematan biaya dibandingkan sistem manajemen dokumen komersial yang dapat mencapai Rp 5–20 juta/tahun. |
| **D — Delivery** (Kecepatan Penyampaian) | Waktu akses dokumen turun dari **10–30 menit menjadi < 1 menit**. Pembaruan dokumen dapat dilakukan dalam hitungan menit dan langsung tersedia di seluruh organisasi. | Efisiensi waktu hingga **95%**. |
| **S — Safety** (Keamanan & Lingkungan) | Dokumen dibagikan melalui *link* tanpa perlu lampiran e-mail — mengurangi risiko penyebaran *malware*. Mengurangi penggunaan kertas untuk mencetak dokumen. | Mendukung budaya kerja ramah lingkungan (*paperless*). |
| **M — Morale** (Semangat Kerja) | Karyawan tidak lagi frustrasi mencari dokumen. Proses kerja lebih lancar dan mandiri. | Meningkatkan produktivitas dan kepuasan kerja. |

#### Perhitungan Cost / Benefit

| Komponen | Rincian |
|---|---|
| **Biaya Pengembangan** | Rp 0 (dikembangkan dengan sumber daya internal) |
| **Biaya Operasional Bulanan** | Rp 0 (hosting gratis, penyimpanan gratis) |
| **Biaya Perawatan** | Rp 0 (tidak perlu perawatan server) |
| **Estimasi Penghematan Waktu** | 20 menit/karyawan/hari × 20 hari × jumlah karyawan |
| **Dampak Produktivitas** | Akses informasi instan → keputusan lebih cepat → operasional lebih efisien |

---

## PARAMETER PENILAIAN

### A. Usaha (*Effort*)

| Kriteria | Penilaian |
|---|---|
| **Kreativitas** | Mengubah proses manual menjadi digital dengan memanfaatkan layanan gratis yang sudah tersedia (Google Drive, Google Sheets). Pendekatan *zero-cost* yang inovatif. |
| **Efektivitas Waktu** | Waktu pencarian dokumen berkurang hingga 95%. Pembaruan dokumen dapat dilakukan dalam hitungan menit tanpa perlu kehadiran teknis. |
| **Duplikasi Ide** | Solusi serupa di pasaran umumnya berbayar dan membutuhkan infrastruktur server. Pendekatan *serverless* dan *zero-cost* menjadikan solusi ini unik dan mudah direplikasi di departemen lain. |
| **5R** | |
| &nbsp;&nbsp;Ringkas | Hanya SOP dan dokumen prosedural relevan yang dimuat. |
| &nbsp;&nbsp;Rapi | Seluruh dokumen terorganisir berdasarkan kategori. |
| &nbsp;&nbsp;Resik | Antarmuka bersih, modern, dan mudah dinavigasi. |
| &nbsp;&nbsp;Rawat | Proses pemutakhiran dokumen sederhana — *upload*, hapus, ganti versi, dan urutkan ulang langsung dari dashboard. |
| &nbsp;&nbsp;Rajin | Budaya akses mandiri mendorong karyawan untuk proaktif mencari informasi. |

### B. Hasil (*Results*)

| Kriteria | Penilaian |
|---|---|
| **Quality** | Seluruh organisasi mengakses dokumen yang seragam, terstandar, dan selalu versi terbaru. |
| **Cost** | Biaya pengembangan dan operasional Rp 0. Tidak ada *vendor lock-in*. |
| **Delivery** | Dokumen tersedia 24/7 dari perangkat apa pun. Waktu akses di bawah 1 menit. |
| **Safety, Health & Environment** | Mengurangi penggunaan kertas (*paperless*). Tidak ada lampiran e-mail yang berpotensi membawa *malware*. |
| **Morale** | Karyawan lebih mandiri, tidak perlu menunggu atau bertanya untuk mencari informasi. Lingkungan kerja lebih efisien dan menyenangkan. |

---

## KESIMPULAN

Document Portal adalah solusi digitalisasi dokumen prosedur kerja yang **tanpa biaya**, **mudah digunakan**, dan **cepat diterapkan**. Dengan memanfaatkan layanan gratis yang sudah tersedia, portal ini memecahkan masalah kritis dalam akses informasi perusahaan sekaligus meningkatkan produktivitas, standarisasi, dan kepuasan kerja. Solusi ini dapat direplikasi di berbagai area kerja dan dikembangkan lebih lanjut seiring kebutuhan organisasi.

---

*Dokumen ini disusun sebagai bagian dari program Suggestion System untuk mendukung perbaikan berkelanjutan di lingkungan kerja.*
