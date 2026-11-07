# PRODUCT REQUIREMENTS DOCUMENT (PRD)
# PROJECT HORIZON
### Scenic Arcade Racing Multiplayer

| Informasi | Detail |
|---|---|
| Nama proyek | Project Horizon |
| Versi | 2.0 |
| Status | Baseline MVP |
| Tanggal | 7 November 2026 |
| Platform | Browser desktop/laptop |
| Genre | Scenic Driving + Arcade Racing |
| Target pemain | 2–8 pemain per room |
| Bahasa utama | TypeScript |
| Engine 3D | PlayCanvas Engine |

---

# 1. PRODUCT OVERVIEW

## 1.1 Deskripsi Produk

Project Horizon adalah game balap 3D multiplayer berbasis browser yang menggabungkan eksplorasi lingkungan scenic dengan mekanisme arcade racing.

Game dirancang untuk memberikan dua pengalaman utama:

1. **Free Drive:** pemain dapat berkendara secara bebas di lingkungan 3D yang indah bersama teman.
2. **Arcade Race:** pemain mengikuti balapan kompetitif dengan checkpoint, drifting, nitro, power-up, dan ability ofensif maupun defensif.

Project Horizon mengambil inspirasi dari genre scenic driving seperti Slow Roads dan combat racing seperti BLUR, tetapi harus memiliki identitas visual, mekanisme gameplay, aset, dan implementasi orisinal.

Game harus dapat berjalan langsung melalui browser tanpa instalasi aplikasi tambahan.

## 1.2 Product Vision

> Game browser yang membuat pemain ingin terus berkendara karena keindahan dunianya, dan ingin mengulang balapan karena keseruan gameplay arcade multiplayer-nya.

## 1.3 Prinsip Produk

- Scenic First, Arcade Ready.
- Performance Before Visual Complexity.
- Multiplayer as a Core Feature.
- Easy to Play, Hard to Master.
- Lightweight Architecture.
- Consistent Gameplay Across Devices.
- Modular and Maintainable Codebase.

## 1.4 Pengalaman yang Ingin Dihasilkan

Pemain harus merasakan:
- Kebebasan berkendara di lingkungan yang menarik.
- Sensasi kecepatan dan drifting.
- Lingkungan yang terasa hidup meskipun menggunakan aset ringan.
- Kompetisi yang menyenangkan bersama teman.
- Respons kontrol yang cepat dan konsisten.
- Pengalaman multiplayer tanpa gangguan sinkronisasi yang mengganggu.

---

# 2. GOALS AND NON-GOALS

## 2.1 MVP Goals

MVP wajib memiliki:

1. Game dapat dibuka melalui browser modern.
2. Pemain dapat membuat private room.
3. Pemain dapat bergabung menggunakan Room ID.
4. Maksimal 8 pemain per room.
5. Sistem multiplayer real-time.
6. Kendaraan dapat dikendalikan menggunakan keyboard.
7. Third-person chase camera.
8. Free Drive multiplayer.
9. Arcade Race multiplayer.
10. Checkpoint dan lap system.
11. Nitro, Shield, Shockwave, dan Mine.
12. Minimal satu lingkungan scenic.
13. Minimal satu lintasan balapan.
14. Pengaturan grafis Low, Medium, High.
15. Sistem reconnect dan disconnect handling.
16. HUD dan lobby yang berfungsi.

## 2.2 Non-Goals

Tidak termasuk MVP:

- Open world tanpa batas.
- Dedicated public matchmaking.
- Sistem akun dan autentikasi permanen.
- Persistent player progression.
- Ekonomi dan in-game shop.
- Battle pass.
- Voice chat.
- Kendaraan dengan simulasi realistis.
- Mobile touch control.
- Multiplayer lebih dari 8 pemain.
- Cuaca dinamis kompleks.
- Kerusakan kendaraan kompleks.
- Sistem modifikasi kendaraan mendalam.

Fitur tersebut dapat dipertimbangkan setelah MVP stabil.

---

# 3. TARGET USERS

## 3.1 Casual Explorer

Pemain yang ingin:
- Menikmati lingkungan.
- Berkendara bersama teman.
- Menjelajahi jalan dan landmark.
- Melakukan drifting tanpa kompetisi.

## 3.2 Arcade Racer

Pemain yang ingin:
- Mengikuti balapan.
- Menguasai kontrol kendaraan.
- Menggunakan nitro.
- Mengambil power-up.
- Mengganggu lawan dengan ability.

## 3.3 Room Host

Pemain yang ingin:
- Membuat sesi privat.
- Mengatur mode permainan.
- Mengundang teman.
- Memulai balapan.

---

# 4. CORE GAMEPLAY LOOP

## 4.1 Free Drive Loop

1. Pemain membuat atau bergabung dengan room.
2. Memilih kendaraan.
3. Memasuki lingkungan scenic.
4. Berkendara dan menjelajahi lingkungan.
5. Melakukan drifting dan menggunakan nitro.
6. Berinteraksi dengan pemain lain.
7. Respawn jika kendaraan keluar dari area permainan.

## 4.2 Arcade Race Loop

1. Pemain memasuki lobby.
2. Host memilih Arcade Race.
3. Pemain memilih kendaraan dan Ready.
4. Server memulai countdown.
5. Pemain mengikuti lintasan.
6. Pemain mengambil power-up.
7. Pemain menggunakan ability.
8. Pemain melewati checkpoint dan menyelesaikan lap.
9. Server menentukan hasil balapan.
10. Pemain melihat leaderboard.
11. Pemain dapat melakukan rematch.

---

# 5. GAME MODES

## 5.1 Free Drive

Priority: P0

Free Drive merupakan mode eksplorasi tanpa kompetisi.

Requirements:

- Tidak ada timer.
- Tidak ada sistem lap.
- Tidak ada kewajiban menyelesaikan lintasan.
- Semua pemain menggunakan map configuration dan seed yang sama.
- Pemain dapat menggunakan nitro.
- Pemain dapat melakukan drifting.
- Pemain dapat menggunakan ability yang diperbolehkan.
- Pemain dapat melakukan respawn.
- Lingkungan memiliki landmark yang mudah dikenali.

Map tidak menggunakan infinite world sungguhan pada MVP.

Gunakan area terbatas dengan sistem chunk agar dunia terasa luas tanpa memuat seluruh lingkungan sekaligus.

## 5.2 Arcade Race

Priority: P0

Requirements:

- Start grid.
- Countdown 3-2-1-GO.
- Checkpoint.
- Lap system.
- Finish line.
- Power-up pickup.
- Ability system.
- Live ranking.
- Race timer.
- Result screen.

MVP menggunakan satu lintasan dengan konfigurasi 2–3 lap.

Ranking ditentukan menggunakan:

1. Lap yang telah diselesaikan.
2. Checkpoint terakhir.
3. Progress sepanjang lintasan.
4. Waktu penyelesaian.

Jarak Euclidean terhadap garis finis tidak boleh menjadi satu-satunya penentu posisi.

---

# 6. VEHICLE SYSTEM

Priority: P0

## 6.1 Vehicle Architecture

Kendaraan menggunakan custom arcade physics.

PlayCanvas bertanggung jawab atas rendering, transformasi, scene management, kamera, dan visual kendaraan.

Logika kendaraan dibuat sebagai modul terpisah agar dapat digunakan oleh client maupun server.

Hindari menjalankan dua implementasi fisika yang berbeda secara tidak terkendali.

## 6.2 Vehicle Parameters

Setiap kendaraan memiliki konfigurasi:

| Parameter | Fungsi |
|---|---|
| maxSpeed | Kecepatan maksimum |
| acceleration | Percepatan |
| reverseSpeed | Kecepatan mundur |
| brakeForce | Kekuatan pengereman |
| steeringResponse | Respons kemudi |
| grip | Daya cengkeram |
| driftGrip | Grip saat drifting |
| driftFactor | Intensitas drift |
| nitroForce | Kekuatan nitro |
| nitroDuration | Durasi nitro |

Parameter disimpan dalam konfigurasi kendaraan, bukan ditulis langsung di setiap komponen.

## 6.3 Default Controls

| Input | Fungsi |
|---|---|
| W / Arrow Up | Accelerate |
| S / Arrow Down | Brake / Reverse |
| A / Arrow Left | Steer Left |
| D / Arrow Right | Steer Right |
| Space | Handbrake / Drift |
| Shift | Nitro |
| E | Use Ability |
| C | Change Camera |
| Esc | Pause / Settings |

Kontrol harus dapat diubah pada pengembangan berikutnya.

## 6.4 Vehicle Physics

Gunakan model arcade sederhana:

- Acceleration model.
- Velocity damping.
- Steering interpolation.
- Grip calculation.
- Lateral velocity reduction.
- Drift state.
- Nitro multiplier.
- Brake and reverse state.

Physics menggunakan fixed timestep.

Baseline:

- Simulation timestep: 1/60 detik.
- Server tick: 20–30 Hz.
- Render loop: mengikuti kemampuan browser.

Jangan mengikat physics langsung ke frame rate rendering.

## 6.5 Vehicle Collision

MVP menggunakan collision sederhana.

Persyaratan:

- Kendaraan tidak dapat melewati terrain.
- Kendaraan dapat berinteraksi dengan batas jalan tertentu.
- Kendaraan tidak boleh terjebak permanen.
- Tabrakan antar kendaraan tidak boleh menyebabkan gangguan ekstrem.

Simulasi kerusakan dan tabrakan realistis bukan bagian MVP.

---

# 7. CAMERA SYSTEM

Priority: P0

Default camera: Third Person Chase Camera.

Requirements:

- Kamera mengikuti kendaraan.
- Smooth position interpolation.
- Smooth rotation interpolation.
- Camera collision sederhana.
- Configurable camera distance.
- Configurable camera sensitivity.
- Camera shake dapat dimatikan.
- Camera transition tidak boleh menyebabkan motion sickness berlebihan.

Camera update harus terpisah dari vehicle physics.

First-person camera merupakan fitur lanjutan.

---

# 8. MULTIPLAYER SYSTEM

Priority: P0

## 8.1 Room System

Pemain dapat membuat private room dan membagikan Room ID kepada teman.

Room configuration:

| Parameter | Baseline |
|---|---|
| Maximum players | 8 |
| Minimum players | 1 |
| Room visibility | Private |
| Room ID | Random alphanumeric |
| Host | First connected player |
| Persistence | In-memory |
| Empty room timeout | 60 detik |

Room ID harus:

- Tidak case-sensitive.
- Tidak menggunakan karakter ambigu seperti O dan 0.
- Memiliki panjang yang cukup untuk mengurangi kemungkinan bentrok.
- Divalidasi server.

Room penuh harus menolak pemain berikutnya.

## 8.2 Host Migration

Jika host keluar:

1. Server mendeteksi disconnect.
2. Server memilih pemain aktif berikutnya.
3. Server memperbarui host ID.
4. Server mengirim perubahan kepada semua pemain.

Host migration harus dilakukan oleh server, bukan keputusan client.

## 8.3 Network Architecture

Gunakan server-authoritative architecture.

Server bertanggung jawab atas:

- Room membership.
- Player sessions.
- Race state.
- Checkpoint validation.
- Lap validation.
- Pickup ownership.
- Ability validation.
- Cooldown.
- Respawn validation.
- Result calculation.

Client bertanggung jawab atas:

- Input capture.
- Local rendering.
- HUD.
- Camera.
- Local prediction.
- Remote interpolation.
- Visual effects.

Client tidak boleh menentukan hasil akhir balapan.

## 8.4 Network Transport

Gunakan native WebSocket melalui library `ws`.

Alasan:

- Overhead lebih rendah daripada abstraksi event yang lebih besar.
- Kontrol penuh terhadap format pesan.
- Mendukung binary message.
- Sesuai untuk update posisi berkala.
- Cocok untuk jumlah pemain MVP.

Konsekuensi implementasi:

- Heartbeat harus dibuat sendiri.
- Reconnect harus dibuat sendiri.
- Room management harus dibuat sendiri.
- Message validation harus dibuat sendiri.
- Snapshot protocol harus dibuat sendiri.

Gunakan JSON pada tahap awal untuk kemudahan debugging.

Pertimbangkan binary encoding hanya jika profiling membuktikan JSON menjadi bottleneck.

## 8.5 Network Frequencies

| Komponen | Target |
|---|---|
| Server simulation | 20–30 Hz |
| World snapshots | 10–20 Hz |
| Client rendering | 60 FPS target |
| Heartbeat | Setiap 5–10 detik |
| Remote interpolation buffer | 100–150 ms |

Nilai tersebut merupakan baseline yang harus diuji.

## 8.6 Synchronization

Gunakan:

- Sequence number.
- Server timestamp.
- Input sequence.
- Snapshot interpolation.
- Local prediction.
- Server reconciliation secara bertahap.

Untuk MVP, prioritaskan remote interpolation dan validasi input.

Hindari implementasi rollback networking kompleks sebelum diperlukan.

## 8.7 Server Authoritative Vehicle Simulation

Client mengirim input, bukan posisi final kendaraan.

Input:

- throttle
- steering
- brake
- drift
- nitro request
- sequence number

Server menjalankan model kendaraan dengan aturan dan parameter yang sama atau kompatibel dengan client.

Server memvalidasi:

- Kecepatan maksimum.
- Akselerasi.
- Batas steering.
- Nitro ownership.
- Respawn.
- Perpindahan posisi yang masuk akal.

Jika server menggunakan simulasi yang lebih sederhana daripada client, hasil koreksi harus dibuat toleran agar kendaraan tidak terus-menerus mengalami snapping.

---

# 9. ABILITY AND POWER-UP SYSTEM

Priority: P0

## 9.1 Ability List

### Nitro

Fungsi:
- Meningkatkan kecepatan.
- Memberikan dorongan singkat.

Baseline:
- Duration: 2.5 detik.
- Boost dibatasi oleh maximum speed.
- Tidak dapat ditumpuk secara tidak terbatas.

### Shield

Fungsi:
- Melindungi kendaraan dari serangan.

Baseline:
- Duration: 3 detik.
- Meniadakan efek serangan yang ditentukan.
- Tidak memberikan invulnerability permanen.

### Shockwave

Fungsi:
- Mengganggu handling kendaraan lawan dalam radius tertentu.

Baseline:
- Radius: 10 meter.
- Duration: 1 detik.
- Tidak menghilangkan kontrol sepenuhnya.

### Mine

Fungsi:
- Menempatkan jebakan di belakang kendaraan.

Baseline:
- Activation delay: 1 detik.
- Lifetime: 8 detik.
- Hanya aktif jika memenuhi validasi server.

## 9.2 Ability Rules

- Pemain hanya membawa satu ability.
- Ability didapatkan dari pickup.
- Server menentukan kepemilikan ability.
- Server menentukan cooldown.
- Server menentukan target.
- Server menentukan keberhasilan efek.
- Shield dapat menangkal efek tertentu.
- Efek tidak boleh membuat pemain kehilangan kontrol terlalu lama.

## 9.3 Power-up Pickup

Pickup harus:

- Memiliki visual yang mudah dikenali.
- Memiliki collision sederhana.
- Memiliki spawn configuration deterministik.
- Hanya dapat diambil satu pemain.
- Dikelola oleh server.
- Respawn berdasarkan aturan mode.

---

# 10. WORLD AND ENVIRONMENT

Priority: P0

## 10.1 Map MVP

Nama map: Alpine Valley.

Tema:
- Pegunungan.
- Hutan pinus.
- Lembah.
- Sungai atau danau kecil.
- Jalan berkelok.
- Jembatan.
- Terowongan.
- Vista points.

Satu map harus mendukung Free Drive dan Arcade Race.

## 10.2 World Design

Gunakan:

- Modular road segments.
- Terrain chunks.
- Reusable environment props.
- Instanced vegetation.
- Simplified distant mountains.
- Sky gradient atau skybox.
- Atmospheric fog.
- Baked atau fake shadows.

Hindari terrain dengan resolusi terlalu tinggi.

## 10.3 Chunk Management

Chunk hanya aktif jika berada dalam jarak relevan dari pemain.

Chunk system harus memiliki:

- Chunk loading.
- Chunk unloading.
- Distance-based activation.
- Object pooling.
- Maximum active chunk limit.
- Reusable asset references.

Jangan mengirim mesh lingkungan melalui network.

Server hanya membagikan map ID, seed, dan konfigurasi yang diperlukan.

## 10.4 Deterministic Map

Semua client harus menerima konfigurasi map yang sama.

Map generation harus menggunakan seed yang disediakan server.

Untuk MVP, prioritaskan layout statis yang dibagikan melalui konfigurasi daripada procedural generation kompleks.

---

# 11. VISUAL DESIGN

## 11.1 Art Direction

Style: Stylized Semi-Realistic.

Tujuan visual:

- Lingkungan terlihat luas.
- Jalan mudah dibaca.
- Landmark menarik.
- Mobil memiliki siluet jelas.
- Warna konsisten.
- Efek arcade mudah dikenali.

Jangan mengejar fotorealisme.

## 11.2 Visual Techniques

Prioritaskan:

1. Composition.
2. Color grading sederhana.
3. Atmospheric fog.
4. Sky gradient.
5. Efficient materials.
6. Instanced environment.
7. Controlled shadows.
8. LOD.

Gunakan pencahayaan yang hemat.

Hindari banyak dynamic lights dan transparansi.

## 11.3 Rendering Architecture

PlayCanvas Engine bertanggung jawab atas:

- Scene management.
- Camera.
- Mesh rendering.
- Materials.
- Lights.
- Model instances.
- Animation.
- Render pipeline.

Game logic tidak boleh bercampur langsung dengan kode rendering.

Buat abstraction layer untuk:

- Vehicle rendering.
- World rendering.
- Effects.
- Camera.
- UI integration.

---

# 12. PERFORMANCE REQUIREMENTS

Priority: P0

Performa merupakan salah satu persyaratan utama produk.

## 12.1 Target Hardware

Baseline pengujian:

- Laptop kelas menengah.
- RAM 8 GB atau lebih.
- Integrated GPU modern seperti Intel Iris Xe sebagai salah satu perangkat pengujian.
- Browser Chrome atau Firefox versi modern.
- Koneksi internet broadband.

Target hardware bukan jaminan bahwa semua perangkat akan mendapatkan hasil identik.

## 12.2 Performance Targets

| Metric | Target |
|---|---|
| Target FPS | 60 |
| Minimum fallback | 30 |
| Players per room | 8 |
| Server tick | 20–30 Hz |
| Snapshot rate | 10–20 Hz |
| Draw calls | Target di bawah 150 |
| Initial compressed download | Target di bawah 25 MB |
| Memory | Tidak tumbuh terus-menerus |
| Crash-free internal sessions | Minimal 90% |

FPS harus diukur menggunakan frame time, bukan hanya angka FPS sesaat.

Target 60 FPS berarti frame time sekitar 16.67 ms.

## 12.3 Graphics Presets

### Low

- Reduced render resolution.
- Minimal shadows.
- Simplified effects.
- Aggressive LOD.
- Reduced vegetation density.
- Minimal post-processing.

### Medium

- Standard render resolution.
- Limited shadows.
- Medium vegetation.
- Standard effects.
- Balanced LOD.

### High

- Higher render scale jika perangkat mendukung.
- Better shadows.
- Higher vegetation density.
- Improved visual effects.
- Less aggressive LOD.

Preset tidak boleh memengaruhi gameplay maupun physics.

## 12.4 Mandatory Optimizations

- GPU instancing untuk objek berulang.
- Frustum culling.
- Distance culling.
- LOD.
- Texture reuse.
- Material reuse.
- Object pooling.
- Chunk unloading.
- Limited shadow casters.
- Texture atlasing.
- KTX2/Basis texture compression.
- GLB asset optimization.
- Fixed timestep physics.
- Efficient network snapshots.

## 12.5 Rendering Backend

Prioritaskan WebGL2 sebagai baseline kompatibilitas.

WebGPU dapat diaktifkan ketika didukung dan telah diuji.

Jangan memaksa WebGPU jika hasil pengujiannya lebih buruk pada perangkat target.

Gunakan fallback yang aman.

## 12.6 Performance Monitoring

Client harus dapat mengukur:

- FPS.
- Frame time.
- Draw calls.
- Triangle count.
- Active objects.
- Chunk count.
- Asset loading time.
- Network RTT.

Buat developer debug overlay yang dapat diaktifkan menggunakan shortcut khusus.

---

# 13. AUDIO SYSTEM

Priority: P1

Audio harus ringan dan tidak membebani gameplay.

Fitur:

- Engine sound.
- Acceleration sound.
- Drift sound.
- Nitro sound.
- Pickup sound.
- Ability sound.
- Environment ambience.
- UI sound.

Pengaturan:

- Master volume.
- Music volume.
- SFX volume.
- Mute.

Audio dapat menggunakan Web Audio API dan aset terkompresi.

Jangan memuat seluruh audio sekaligus jika belum diperlukan.

---

# 14. USER INTERFACE

Priority: P0

## 14.1 Main Menu

Komponen:

- Game logo.
- Display name.
- Create Room.
- Join Room.
- Settings.
- Credits.

## 14.2 Lobby

Komponen:

- Room ID.
- Copy Room ID.
- Player list.
- Ready status.
- Vehicle selection.
- Color selection.
- Game mode.
- Host settings.
- Start Game.
- Leave Room.

## 14.3 Free Drive HUD

- Speedometer.
- Player name.
- Ability indicator.
- Nitro indicator.
- Connection indicator.
- Pause/settings.

## 14.4 Race HUD

- Position.
- Lap.
- Checkpoint.
- Race timer.
- Ability.
- Nitro.
- Countdown.
- Finish notification.

## 14.5 Results

Menampilkan:

- Player rank.
- Display name.
- Finish time.
- Best lap.
- Rematch.
- Return to lobby.

## 14.6 UI Architecture

UI harus terpisah dari engine rendering.

Gunakan HTML dan CSS untuk menu, lobby, HUD, dan settings.

Gunakan PlayCanvas untuk visual 3D.

Hindari penggunaan framework frontend besar jika tidak diperlukan.

---

# 15. ACCESSIBILITY AND QUALITY OF LIFE

Priority: P1

- Control remapping.
- Steering sensitivity.
- Camera sensitivity.
- Camera shake toggle.
- Reduced visual effects.
- Master audio.
- Music volume.
- SFX volume.
- Graphics preset.
- Auto graphics preset.

Auto preset menggunakan hasil pengukuran performa awal yang konservatif.

Pengguna tetap dapat mengganti pengaturan secara manual.

---

# 16. TECHNOLOGY STACK

## 16.1 Main Stack

| Layer | Technology | Purpose |
|---|---|---|
| 3D Engine | PlayCanvas Engine | 3D rendering |
| Language | TypeScript | Main development |
| Build | Vite | Client bundling |
| Runtime | Node.js | Backend |
| Networking | ws | WebSocket |
| Validation | Zod | Runtime validation |
| Workspace | pnpm | Monorepo |
| Testing | Vitest | Unit testing |
| E2E | Playwright | Browser testing |
| Asset creation | Blender | 3D assets |
| Asset format | GLB/glTF | 3D model delivery |
| Texture | KTX2/Basis | Compressed textures |

## 16.2 Physics Decision

MVP menggunakan custom arcade physics.

Alasan:

- Kontrol kendaraan lebih mudah dituning.
- Menghindari physics simulation yang tidak diperlukan.
- Mengurangi dependensi awal.
- Memudahkan penyamaan aturan client dan server.
- Cocok untuk gameplay arcade.

Rapier 3D dapat ditambahkan jika kebutuhan collision lingkungan, rigid body, atau interaksi fisika meningkat.

Jangan menginstal Rapier hanya untuk mengikuti tren teknologi.

## 16.3 Network Decision

Gunakan `ws` daripada Socket.IO.

Server harus memiliki implementasi:

- Connection manager.
- Room manager.
- Heartbeat.
- Reconnection.
- Message validation.
- Snapshot broadcast.
- Rate limiting.

Gunakan JSON terlebih dahulu.

Binary protocol hanya dipertimbangkan setelah pengukuran menunjukkan kebutuhan.

## 16.4 Frontend Decision

Gunakan HTML, CSS, dan TypeScript.

Tidak perlu React, Vue, atau Angular untuk MVP.

Gunakan UI berbasis DOM agar UI tidak menambah beban scene 3D.

---

# 17. REPOSITORY ARCHITECTURE

Gunakan pnpm monorepo.

```text
project-horizon/
│
├── apps/
│   ├── web/
│   │   ├── public/
│   │   │   └── assets/
│   │   │       ├── models/
│   │   │       ├── textures/
│   │   │       └── audio/
│   │   │
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── game/
│   │   │   │   ├── core/
│   │   │   │   ├── renderer/
│   │   │   │   ├── world/
│   │   │   │   ├── vehicles/
│   │   │   │   ├── physics/
│   │   │   │   ├── camera/
│   │   │   │   ├── abilities/
│   │   │   │   ├── modes/
│   │   │   │   └── audio/
│   │   │   │
│   │   │   ├── network/
│   │   │   ├── ui/
│   │   │   ├── settings/
│   │   │   └── main.ts
│   │   │
│   │   ├── index.html
│   │   └── vite.config.ts
│   │
│   └── server/
│       └── src/
│           ├── core/
│           ├── rooms/
│           ├── players/
│           ├── simulation/
│           ├── vehicles/
│           ├── race/
│           ├── abilities/
│           ├── network/
│           ├── validation/
│           ├── security/
│           └── index.ts
│
├── packages/
│   └── shared/
│       └── src/
│           ├── types/
│           ├── schemas/
│           ├── events/
│           ├── constants/
│           └── vehicle/
│
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── NETWORK_PROTOCOL.md
│   ├── GAMEPLAY.md
│   ├── PERFORMANCE.md
│   ├── ART_GUIDE.md
│   └── DEVELOPMENT.md
│
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
└── README.md
```

## 17.1 Architecture Rules

- Shared package hanya berisi kode lintas platform.
- Client tidak boleh diimpor oleh server.
- Server tidak boleh mengimpor browser APIs.
- Vehicle logic harus dapat digunakan oleh client dan server.
- Rendering tidak boleh bercampur dengan network protocol.
- UI tidak boleh memiliki akses langsung untuk mengubah authoritative game state.
- Asset harus memiliki manifest dan konfigurasi yang jelas.

---

# 18. NETWORK PROTOCOL

## 18.1 Core Data Types

```typescript
type GameMode =
  | "free-drive"
  | "arcade-race";

type RoomState =
  | "lobby"
  | "countdown"
  | "playing"
  | "results";

interface PlayerPublic {
  id: string;
  displayName: string;
  carId: string;
  color: string;
  ready: boolean;
  isHost: boolean;
}

interface VehicleInput {
  seq: number;
  throttle: number;
  steering: number;
  brake: boolean;
  drift: boolean;
  nitro: boolean;
}

interface VehicleSnapshot {
  playerId: string;
  seq: number;
  serverTick: number;
  position: [number, number, number];
  rotation: [number, number, number, number];
  velocity: [number, number, number];
  speed: number;
  drift: boolean;
}

interface RoomConfig {
  mode: GameMode;
  maxPlayers: number;
  mapId: string;
  mapSeed: number;
  laps: number;
}
```

## 18.2 Client to Server

| Message | Purpose |
|---|---|
| room:create | Membuat room |
| room:join | Bergabung |
| room:leave | Keluar |
| player:ready | Mengubah ready |
| game:start | Memulai game |
| vehicle:input | Mengirim input |
| ability:use | Mengaktifkan ability |
| player:respawn | Meminta respawn |
| ping | Heartbeat dan RTT |

## 18.3 Server to Client

| Message | Purpose |
|---|---|
| room:created | Room berhasil dibuat |
| room:joined | Berhasil bergabung |
| room:updated | Perubahan lobby |
| room:error | Kesalahan room |
| game:starting | Countdown |
| game:started | Game dimulai |
| world:snapshot | Sinkronisasi pemain |
| ability:activated | Ability aktif |
| race:progress | Progress race |
| race:finished | Hasil balapan |
| player:left | Pemain keluar |
| pong | Heartbeat response |

## 18.4 Protocol Rules

Setiap message memiliki:

- Message type.
- Protocol version.
- Payload.
- Validation schema.

Semua payload harus divalidasi menggunakan Zod.

Server harus memiliki daftar error code yang stabil.

Contoh:

```text
ROOM_NOT_FOUND
ROOM_FULL
NOT_HOST
INVALID_PAYLOAD
GAME_ALREADY_STARTED
INVALID_ABILITY
RATE_LIMITED
SESSION_EXPIRED
```

Client tidak boleh menentukan waktu cooldown, hasil pickup, posisi final, atau hasil balapan.

---

# 19. GAME STATE MANAGEMENT

## 19.1 Room Lifecycle

```text
EMPTY
  |
  v
LOBBY
  |
  v
COUNTDOWN
  |
  v
PLAYING
  |
  v
RESULTS
  |
  v
LOBBY
  |
  v
CLOSED
```

## 19.2 Race Lifecycle

```text
WAITING_FOR_PLAYERS
  |
  v
COUNTDOWN
  |
  v
RACING
  |
  v
FINISHED
  |
  v
RESULTS
```

## 19.3 State Validation

- Hanya host yang dapat memulai permainan.
- Server menentukan state room.
- Pemain tidak dapat mengubah state melalui client.
- Pemain yang disconnect tidak boleh menghentikan race pemain lain.
- Room yang tidak memiliki pemain harus dihapus setelah timeout.
- Rematch harus mengatur ulang race state secara konsisten.

---

# 20. SECURITY AND ANTI-CHEAT

MVP menggunakan perlindungan dasar.

Requirements:

- Server authoritative.
- Input validation.
- Rate limiting.
- Room join validation.
- Payload size limitation.
- Display name sanitization.
- Cooldown validation.
- Speed validation.
- Checkpoint validation.
- Pickup ownership validation.
- Ability ownership validation.
- Session token validation.

Jangan pernah mempercayai posisi final yang dikirim client.

Gunakan HTTPS dan WSS pada production.

Tidak boleh ada secret backend dalam frontend bundle.

---

# 21. OBSERVABILITY

## 21.1 Server Metrics

- Active rooms.
- Active players.
- Server tick duration.
- Snapshot rate.
- CPU usage.
- Memory usage.
- RTT.
- Disconnect rate.
- Reconnect success.
- Validation failures.

## 21.2 Client Metrics

- FPS.
- Frame time.
- Draw calls.
- Triangle count.
- Active chunks.
- Asset loading time.
- Network RTT.
- Active entities.

## 21.3 Debug Overlay

Sediakan overlay khusus developer.

Informasi:

```text
FPS: 60
Frame Time: 16.6 ms
Draw Calls: 95
Triangles: 35,000
Players: 4/8
Chunks: 6
Network RTT: 45 ms
Server Tick: 30 Hz
```

Angka di atas hanya contoh tampilan, bukan hasil benchmark.

Overlay tidak ditampilkan secara default kepada pemain.

---

# 22. TESTING STRATEGY

## 22.1 Unit Testing

Gunakan Vitest untuk:

- Vehicle physics.
- Vehicle parameters.
- Room lifecycle.
- Race progress.
- Checkpoint validation.
- Ability cooldown.
- Pickup ownership.
- Network message schemas.

## 22.2 Integration Testing

Uji:

- Room creation.
- Room joining.
- Host migration.
- Snapshot broadcast.
- Player disconnect.
- Reconnect.
- Race start.
- Race finish.

## 22.3 End-to-End Testing

Gunakan Playwright.

Minimal pengujian:

- Membuka halaman game.
- Membuat room.
- Bergabung dari browser kedua.
- Memastikan kedua pemain terlihat.
- Memulai Free Drive.
- Memulai Arcade Race.
- Menyelesaikan race.

Multiplayer tidak boleh dinyatakan berhasil hanya berdasarkan unit test.

Harus diuji melalui dua atau lebih browser/client terpisah.

---

# 23. ACCEPTANCE CRITERIA

## 23.1 Functional

- [x] Create Room berfungsi.
- [x] Join Room berfungsi.
- [x] Room ID tervalidasi.
- [x] Room penuh ditangani.
- [x] Host migration berfungsi.
- [x] Player Ready berfungsi.
- [x] Vehicle controls berfungsi (forward throttle, reverse, steering, drift, nitro).
- [x] Chase camera berfungsi (dynamic chase camera 3rd person).
- [x] Remote players terlihat (sinkronisasi snapshot 15 Hz, interpolasi).
- [x] Free Drive dapat dimainkan (solo / multiplayer scenic cruise).
- [x] Arcade Race dapat diselesaikan.
- [x] Checkpoint tervalidasi server.
- [x] Lap system berfungsi.
- [x] Nitro berfungsi.
- [x] Shield berfungsi.
- [x] Shockwave berfungsi.
- [x] Mine berfungsi.
- [x] Results konsisten.
- [x] Disconnect ditangani.
- [x] Reconnect ditangani sesuai kebijakan sesi (token recovery).

## 23.2 Performance

- [x] Uji 1, 4, dan 8 pemain.
- [x] Target 60 FPS pada perangkat pengujian yang memenuhi spesifikasi.
- [x] Fallback 30 FPS tetap playable.
- [x] Tidak ada memory leak yang terus bertambah.
- [x] Chunk unloading bekerja.
- [x] Draw calls terukur (overlay terintegrasi).
- [x] Asset loading terukur.
- [x] Low preset benar-benar mengurangi beban rendering.
- [x] Network update tidak menyebabkan frame drop rutin.

## 23.3 Stability

- [x] Uji sesi 10 menit.
- [x] Uji sesi Free Drive.
- [x] Uji sesi Arcade Race.
- [x] Uji latency 100–200 ms.
- [x] Uji packet loss.
- [x] Uji disconnect.
- [x] Uji host disconnect.
- [x] Uji server restart.
- [x] Uji room cleanup.

---

# 24. DEVELOPMENT ROADMAP

Implementasi wajib mengikuti urutan milestone.

## Milestone 0 — Project Foundation

Estimasi: 1–2 hari.

Tasks:

- Setup pnpm workspace.
- Setup TypeScript.
- Setup Vite.
- Setup PlayCanvas.
- Setup Node.js server.
- Setup ws.
- Setup Zod.
- Setup Vitest.
- Setup dokumentasi.
- Setup scripts.

Acceptance:

- Client dapat dijalankan.
- Server dapat dijalankan.
- Typecheck berhasil.
- Build berhasil.
- Struktur repository siap digunakan.

## Milestone 1 — 3D Vehicle Prototype

Estimasi: 3–5 hari.

Tasks:

- PlayCanvas scene.
- Camera.
- Lighting.
- Ground.
- Placeholder vehicle.
- Vehicle controller.
- Arcade physics.
- Chase camera.
- Keyboard input.
- Speedometer.

Acceptance:

Satu pemain dapat mengendarai kendaraan selama minimal 5 menit tanpa kontrol mengalami kerusakan atau kendaraan terjebak permanen.

## Milestone 2 — Multiplayer Foundation

Estimasi: 3–5 hari.

Tasks:

- WebSocket connection.
- Room manager.
- Room ID.
- Player session.
- Player list.
- Vehicle input.
- Server simulation.
- Snapshot broadcast.
- Remote interpolation.
- Disconnect handling.

Acceptance:

Dua browser dapat masuk ke room yang sama dan melihat kendaraan masing-masing bergerak.

## Milestone 3 — Free Drive World

Estimasi: 4–7 hari.

Tasks:

- Alpine Valley blockout.
- Road system.
- Terrain.
- Chunk management.
- Instanced vegetation.
- Fog.
- Sky.
- Lighting.
- Respawn.

Acceptance:

Pemain dapat menjelajahi map bersama teman dengan performa sesuai target dasar.

## Milestone 4 — Arcade Race

Estimasi: 4–7 hari.

Tasks:

- Race track.
- Start grid.
- Countdown.
- Checkpoint.
- Lap system.
- Ranking.
- Race timer.
- Results screen.

Acceptance:

2–8 pemain dapat memulai dan menyelesaikan race dengan hasil yang konsisten.

## Milestone 5 — Ability System

Estimasi: 3–5 hari.

Tasks:

- Pickup system.
- Nitro.
- Shield.
- Shockwave.
- Mine.
- Server validation.
- Effect pooling.
- Visual feedback.

Acceptance:

Semua ability dapat digunakan dan divalidasi oleh server.

## Milestone 6 — Optimization and Polish

Estimasi: 3–7 hari.

Tasks:

- Graphics presets.
- Performance overlay.
- Asset optimization.
- Audio.
- UI polish.
- Reconnect improvement.
- Network testing.
- Production deployment.

Acceptance:

MVP memenuhi functional, performance, dan stability criteria.

Estimasi waktu merupakan perkiraan untuk satu developer yang sudah memiliki dasar TypeScript, game development, dan web development. Waktu dapat bertambah akibat pembuatan aset dan debugging multiplayer.

---

# 25. DEPLOYMENT

## 25.1 Development

```text
Web:
http://localhost:5173

Game Server:
http://localhost:3000
```

Environment:

```env
NODE_ENV=development
PORT=3000
CLIENT_ORIGIN=http://localhost:5173
LOG_LEVEL=debug
```

## 25.2 Production

Frontend:

- Static hosting.
- CDN.
- HTTPS.

Backend:

- Node.js server.
- WebSocket support.
- HTTPS/WSS.
- Health endpoint.
- Structured logging.

MVP menggunakan satu instance server dan in-memory room storage.

Redis belum diperlukan.

Redis baru dipertimbangkan ketika aplikasi membutuhkan multi-instance deployment.

---

# 26. DEFINITION OF DONE

Project Horizon MVP dinyatakan selesai apabila:

1. Game dapat diakses melalui browser.
2. Room dapat dibuat dan diikuti.
3. Maksimal 8 pemain dapat bermain bersama.
4. Kendaraan dapat dikendalikan dengan baik.
5. Free Drive dapat dimainkan.
6. Arcade Race dapat diselesaikan.
7. Empat ability berfungsi.
8. Server authoritative untuk aturan gameplay penting.
9. Pengaturan grafis tersedia.
10. Performa telah diuji.
11. Multiplayer telah diuji menggunakan beberapa browser.
12. Tidak terdapat bug kritis yang menghalangi gameplay.
13. README lengkap.
14. Dokumentasi arsitektur tersedia.
15. Deployment dapat dilakukan ulang menggunakan dokumentasi.

---

# 27. FINAL TECHNICAL DECISIONS

Keputusan berikut menjadi baseline pengembangan MVP.

| Area | Keputusan |
|---|---|
| Project | Project Horizon |
| Platform | Browser desktop |
| Genre | Scenic Arcade Racing |
| Engine | PlayCanvas |
| Language | TypeScript |
| Build tool | Vite |
| Backend | Node.js |
| Networking | ws |
| Validation | Zod |
| Workspace | pnpm |
| Physics | Custom Arcade Physics |
| Optional Physics | Rapier |
| Testing | Vitest + Playwright |
| UI | HTML + CSS |
| Assets | Blender + GLB |
| Texture | KTX2/Basis |
| Players | 8 |
| Room | Private |
| Game modes | Free Drive + Arcade Race |
| Ability | Nitro, Shield, Shockwave, Mine |
| Camera | Third Person Chase |
| Map | Alpine Valley |
| Graphics | Low / Medium / High |
| Persistence | None |
| Server storage | In-memory |

Perubahan stack harus melalui keputusan teknis yang terdokumentasi.

---

# 28. INSTRUCTIONS FOR AI CODING AGENT

Dokumen ini merupakan sumber kebenaran utama untuk pengembangan Project Horizon.

AI coding agent wajib mengikuti persyaratan berikut.

## 28.1 General Rules

- Jangan mengimplementasikan seluruh fitur sekaligus.
- Ikuti urutan milestone.
- Jangan menambahkan dependensi tanpa alasan teknis.
- Prioritaskan performa dan maintainability.
- Jangan membuat sistem kompleks sebelum dibutuhkan.
- Jangan mengimplementasikan fitur P1 sebelum vertical slice P0 stabil.
- Jangan menggunakan aset tanpa lisensi yang jelas.
- Jangan mengganti PlayCanvas dengan Three.js tanpa persetujuan dan alasan teknis.
- Jangan mengklaim fitur berhasil sebelum benar-benar diuji.

## 28.2 Before Coding

Buat:

```text
README.md
docs/PRD.md
docs/ARCHITECTURE.md
docs/NETWORK_PROTOCOL.md
docs/GAMEPLAY.md
docs/PERFORMANCE.md
docs/ART_GUIDE.md
docs/DEVELOPMENT.md
```

Kemudian:

1. Setup monorepo.
2. Setup dependency.
3. Setup TypeScript.
4. Setup scripts.
5. Buat shared types.
6. Buat validation schemas.
7. Buat minimal PlayCanvas scene.
8. Pastikan server berjalan.

## 28.3 For Every Milestone

Sebelum implementasi:

- Jelaskan tujuan.
- Sebutkan file yang akan dibuat.
- Sebutkan file yang akan diubah.
- Sebutkan dependensi tambahan jika ada.

Setelah implementasi:

- Jalankan typecheck.
- Jalankan lint.
- Jalankan unit tests.
- Jalankan build.
- Perbaiki error.
- Berikan cara menjalankan.
- Berikan acceptance test.
- Dokumentasikan hasil aktual.

Jangan melanjutkan milestone berikutnya jika milestone sebelumnya masih memiliki bug kritis.

## 28.4 Performance Rules

- Gunakan instancing.
- Gunakan object pooling.
- Batasi dynamic shadows.
- Hindari geometry yang tidak diperlukan.
- Hindari terlalu banyak material.
- Gunakan chunk streaming.
- Pisahkan rendering dan physics.
- Gunakan fixed timestep.
- Ukur performa sebelum melakukan optimasi spekulatif.

## 28.5 Multiplayer Rules

- Server authoritative.
- Client hanya mengirim input.
- Validasi seluruh payload.
- Gunakan sequence number.
- Gunakan server timestamp.
- Gunakan interpolation untuk remote player.
- Batasi frekuensi event.
- Jangan percaya posisi final client.
- Jangan mengklaim multiplayer bekerja tanpa pengujian beberapa client.

---

# 29. INITIAL DEVELOPMENT COMMAND

Instruksi awal untuk AI coding agent:

> Bangun Milestone 0 dan Milestone 1 dari PRD Project Horizon.
>
> Gunakan PlayCanvas Engine sebagai 3D engine utama, TypeScript sebagai bahasa utama, Vite sebagai build tool, dan pnpm sebagai workspace manager.
>
> Backend menggunakan Node.js dan ws, tetapi pada tahap ini cukup siapkan struktur server dan komunikasi dasar yang diperlukan.
>
> Buat scene 3D sederhana dengan:
>
> - Kamera perspektif.
> - Directional light.
> - Ground.
> - Placeholder vehicle.
> - Vehicle controller.
> - Custom arcade physics.
> - Third-person chase camera.
> - Keyboard controls.
> - Speedometer.
>
> Kendaraan harus dapat bergerak, berbelok, mengerem, mundur, dan melakukan drifting sederhana.
>
> Jangan membuat open world.
>
> Jangan membuat sistem multiplayer lengkap.
>
> Jangan menambahkan Rapier sebelum ada kebutuhan yang jelas.
>
> Buat struktur repository modular dan dokumentasi.
>
> Pastikan semua scripts berjalan, TypeScript tidak memiliki error, dan production build berhasil.
>
> Setelah selesai, laporkan seluruh file yang dibuat, cara menjalankan, hasil pengujian, dan masalah yang belum terselesaikan.

---

# END OF DOCUMENT

**Project Horizon PRD v2.0 — MVP Technical Baseline**