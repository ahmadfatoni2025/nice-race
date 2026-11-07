# Project Horizon - Nice Race

> **Scenic Arcade Racing Multiplayer (Browser 3D Game)**

Game balap 3D multiplayer berbasis browser yang menggabungkan eksplorasi lingkungan scenic pegunungan (*Alpine Valley*) dengan mekanisme *arcade racing* (drifting, nitro boost, shield, shockwave, mine, dan checkpoint/lap system). Dibangun menggunakan **PlayCanvas Engine**, **TypeScript**, dan **Node.js WebSocket Server**.

---

## 🌟 Fitur Utama

- **Mode Balapan & Eksplorasi:**
  - **Arcade Race:** Balapan kompetitif real-time dengan start grid, countdown 3-2-1-GO, checkpoint, lap counting, dan live rankings.
  - **Free Drive / Solo Practice:** Mode berkendara bebas di sirkuit scenic tanpa batasan timer atau kompetisi.
- **Arcade Vehicle Physics:**
  - Penanganan akselerasi, rem & mundur, grip lateral, counter-steering, drifting dinamis, serta toleransi off-road.
- **Ability & Power-up System:**
  - ⚡ **Nitro:** Dorongan kecepatan instan.
  - 🛡️ **Shield:** Perlindungan dari efek rintangan dan serangan.
  - 🌊 **Shockwave:** Gelombang kejut pengganggu kendaraan di sekitar.
  - 💣 **Mine:** Jebakan ranjau yang dapat dijatuhkan di belakang kendaraan.
- **Scenic Alpine Valley World:**
  - Sirkuit jalan aspal pita melingkar sepanjang 1.5 km, danau air dengan pantulan specular, kontur pegunungan bertingkat yang halus, gerbang start/finish, dan pepohonan pinus.
- **Dynamic 3rd-Person Chase Camera:**
  - Kamera chase halus dengan dynamic FOV dan jarak yang responsif terhadap kecepatan mobil.
- **Real-Time Multiplayer Server:**
  - Server-authoritative physics simulation (30 Hz) dengan snapshot broadcast (15 Hz), Room ID alfanumerik 5 karakter, host migration, dan penanganan reconnect token.
- **Procedural Web Audio API:**
  - Suara deru mesin, decit ban drifting, nitro boost, ability sound effects, dan beeps countdown tanpa download file audio eksternal.

---

## 🚀 Quick Start

### 1. Prasyarat
- [Node.js](https://nodejs.org/) (v20+ disarankan)
- [pnpm](https://pnpm.io/) (`corepack enable` atau `npm i -g pnpm`)

### 2. Instalasi Dependensi
```bash
pnpm install
```

### 3. Menjalankan Game (Development)
Jalankan game client dan game server secara bersamaan:
```bash
pnpm dev
```
- **Web Game Client:** Buka [http://localhost:5173](http://localhost:5173) di browser.
- **Game Server:** Berjalan di [http://localhost:3000](http://localhost:3000) (WebSocket: `ws://localhost:3000/ws`).

---

## 🎮 Kontrol Permainan

| Tombol Keyboard | Fungsi |
|---|---|
| **W** / **Arrow Up** | Maju / Akselerasi |
| **S** / **Arrow Down** | Rem / Mundur |
| **A** / **Arrow Left** | Belok Kiri |
| **D** / **Arrow Right** | Belok Kanan |
| **Spacebar** | Handbrake / Drift |
| **Shift** | Nitro Boost |
| **E** | Gunakan Power-up / Ability |
| **R** | Respawn ke lintasan jalan |

---

## 📁 Struktur Monorepo

```text
nice-race/
├── apps/
│   ├── web/         # Client browser (PlayCanvas 3D, HTML/CSS HUD & Lobby, Web Audio)
│   └── server/      # Authoritative WebSocket game server (ws, rooms, physics loop)
├── packages/
│   └── shared/      # Kode bersama (Vehicle physics, track definition, Zod schemas, math)
├── Docs/            # Product Requirements Document (PRD)
├── tests/           # Unit test fisika kendaraan dan room server (Vitest)
└── scripts/         # Skrip otomasi dev runner
```

---

## 🧪 Testing & Build

```bash
# Typecheck TypeScript ke seluruh workspace
pnpm run typecheck

# Jalankan Unit Tests
pnpm run test

# Build production bundle
pnpm run build
```
