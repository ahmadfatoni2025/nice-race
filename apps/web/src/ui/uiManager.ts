import type { RoomDTO, RaceResult } from '@horizon/shared';
import { NetworkClient } from '../network/client.js';

export class UIManager {
  private root: HTMLElement;
  private network: NetworkClient;

  // Screen containers
  private mainMenuEl!: HTMLElement;
  private lobbyEl!: HTMLElement;
  private hudEl!: HTMLElement;
  private resultsEl!: HTMLElement;
  private debugEl!: HTMLElement;

  // HUD elements
  private speedValEl!: HTMLElement;
  private rankValEl!: HTMLElement;
  private lapValEl!: HTMLElement;
  private abilityValEl!: HTMLElement;

  // Lobby elements
  private roomCodeValEl!: HTMLElement;
  private playerListEl!: HTMLElement;
  private startBtnEl!: HTMLButtonElement;
  private readyBtnEl!: HTMLButtonElement;

  private isHost = false;
  private isReady = false;

  public onPracticeStart?: () => void;

  constructor(root: HTMLElement, network: NetworkClient) {
    this.root = root;
    this.network = network;
    this.buildDOM();
    this.setupListeners();
  }

  private buildDOM() {
    this.root.innerHTML = `
      <!-- Main Menu Screen -->
      <div id="main-menu" class="screen-panel interactive">
        <div class="logo-header">
          <div class="logo-title">Project Horizon</div>
          <div class="logo-sub">Scenic Arcade Racing Multiplayer</div>
        </div>

        <div class="input-group">
          <label class="input-label">Player Name</label>
          <input type="text" id="player-name-input" class="text-input" maxlength="16" value="Racer_${Math.floor(Math.random() * 899 + 100)}">
        </div>

        <div class="input-group">
          <label class="input-label">Game Mode</label>
          <select id="game-mode-select" class="text-input">
            <option value="arcade-race">Arcade Race (Competitive)</option>
            <option value="free-drive">Free Drive (Scenic Cruise)</option>
          </select>
        </div>

        <button id="btn-create-room" class="btn-primary">Create Room (Host)</button>

        <div style="display: flex; gap: 0.6rem; align-items: center;">
          <input type="text" id="room-code-input" class="text-input" placeholder="ROOM ID" style="text-transform: uppercase; font-family: monospace;">
          <button id="btn-join-room" class="btn-secondary" style="white-space: nowrap;">Join</button>
        </div>

        <div style="border-top: 1px solid rgba(255,255,255,0.1); margin-top: 0.5rem; padding-top: 0.8rem;">
          <button id="btn-solo-drive" class="btn-secondary" style="width: 100%; background: rgba(37, 99, 235, 0.25); border-color: #3b82f6;">
            Solo Free Drive / Practice
          </button>
        </div>
      </div>

      <!-- Lobby Screen -->
      <div id="lobby" class="screen-panel interactive" style="display: none;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2>Lobby</h2>
          <div class="room-badge" id="lobby-room-code">ROOM: -----</div>
        </div>

        <div class="input-group">
          <label class="input-label">Connected Drivers</label>
          <div id="lobby-player-list" class="player-list"></div>
        </div>

        <div style="display: flex; gap: 0.8rem; margin-top: 1rem;">
          <button id="btn-ready" class="btn-secondary" style="flex: 1;">Ready</button>
          <button id="btn-start-game" class="btn-primary" style="flex: 1; display: none;">Start Game</button>
        </div>
        <button id="btn-leave-room" class="btn-secondary" style="font-size: 0.85rem; padding: 0.5rem;">Leave Room</button>
      </div>

      <!-- In-Game HUD -->
      <div id="hud" style="display: none;">
        <div class="hud-top">
          <div class="race-rank-card" id="hud-rank-card">
            <span class="rank-number" id="hud-rank-val">1</span>
            <span class="rank-suffix">POSITION</span>
          </div>

          <div class="lap-counter" id="hud-lap-card">
            LAP <span id="hud-lap-val">1 / 2</span>
          </div>
        </div>

        <div class="hud-bottom">
          <div class="ability-card">
            <span class="ability-icon">⚡</span>
            <div>
              <div style="font-size: 0.75rem; color: #94a3b8;">ABILITY [E]</div>
              <div class="ability-name" id="hud-ability-val">NONE</div>
            </div>
          </div>

          <div class="speedometer-card">
            <div class="speed-value" id="hud-speed-val">0</div>
            <div class="speed-unit">KM / H</div>
          </div>
        </div>
      </div>

      <!-- Results Screen -->
      <div id="results" class="screen-panel interactive" style="display: none;">
        <div class="logo-header">
          <div class="logo-title" style="font-size: 2rem;">Race Finished</div>
        </div>

        <div class="input-group">
          <div id="results-list" class="player-list"></div>
        </div>

        <div style="display: flex; gap: 0.8rem;">
          <button id="btn-rematch" class="btn-primary" style="flex: 1;">Rematch</button>
          <button id="btn-back-lobby" class="btn-secondary" style="flex: 1;">Back to Lobby</button>
        </div>
      </div>

      <!-- Developer Debug Overlay -->
      <div id="debug-overlay" class="debug-overlay">
        FPS: -- | DrawCalls: -- | RTT: -- ms
      </div>
    `;

    this.mainMenuEl = document.getElementById('main-menu')!;
    this.lobbyEl = document.getElementById('lobby')!;
    this.hudEl = document.getElementById('hud')!;
    this.resultsEl = document.getElementById('results')!;
    this.debugEl = document.getElementById('debug-overlay')!;

    this.speedValEl = document.getElementById('hud-speed-val')!;
    this.rankValEl = document.getElementById('hud-rank-val')!;
    this.lapValEl = document.getElementById('hud-lap-val')!;
    this.abilityValEl = document.getElementById('hud-ability-val')!;

    this.roomCodeValEl = document.getElementById('lobby-room-code')!;
    this.playerListEl = document.getElementById('lobby-player-list')!;
    this.startBtnEl = document.getElementById('btn-start-game') as HTMLButtonElement;
    this.readyBtnEl = document.getElementById('btn-ready') as HTMLButtonElement;
  }

  private setupListeners() {
    // Solo / Practice drive without server room requirement
    document.getElementById('btn-solo-drive')?.addEventListener('click', () => {
      this.showHUD('free-drive');
      this.onPracticeStart?.();
    });

    // Create Room
    document.getElementById('btn-create-room')?.addEventListener('click', () => {
      const nameInput = document.getElementById('player-name-input') as HTMLInputElement;
      const modeSelect = document.getElementById('game-mode-select') as HTMLSelectElement;

      this.network.connect().then(() => {
        this.network.send({
          v: 1,
          t: 'room:create',
          name: nameInput.value.trim() || 'Driver',
          mode: modeSelect.value as any,
          laps: 2,
        });
      });
    });

    // Join Room
    document.getElementById('btn-join-room')?.addEventListener('click', () => {
      const nameInput = document.getElementById('player-name-input') as HTMLInputElement;
      const codeInput = document.getElementById('room-code-input') as HTMLInputElement;

      const code = codeInput.value.trim().toUpperCase();
      if (!code) return;

      this.network.connect().then(() => {
        this.network.send({
          v: 1,
          t: 'room:join',
          roomId: code,
          name: nameInput.value.trim() || 'Driver',
        });
      });
    });

    // Ready toggle
    this.readyBtnEl.addEventListener('click', () => {
      this.isReady = !this.isReady;
      this.readyBtnEl.textContent = this.isReady ? 'Unready' : 'Ready';
      this.network.send({
        v: 1,
        t: 'player:update',
        ready: this.isReady,
      });
    });

    // Start Game (Host only)
    this.startBtnEl.addEventListener('click', () => {
      this.network.send({
        v: 1,
        t: 'game:start',
      });
    });

    // Rematch
    document.getElementById('btn-rematch')?.addEventListener('click', () => {
      this.network.send({
        v: 1,
        t: 'game:rematch',
      });
    });

    // Back to Lobby
    document.getElementById('btn-back-lobby')?.addEventListener('click', () => {
      this.network.send({
        v: 1,
        t: 'game:lobby',
      });
    });

    // Leave Room
    document.getElementById('btn-leave-room')?.addEventListener('click', () => {
      this.network.send({
        v: 1,
        t: 'room:leave',
      });
      this.showMainMenu();
    });
  }

  public showMainMenu() {
    this.mainMenuEl.style.display = 'flex';
    this.lobbyEl.style.display = 'none';
    this.hudEl.style.display = 'none';
    this.resultsEl.style.display = 'none';
  }

  public showLobby(room: RoomDTO) {
    this.mainMenuEl.style.display = 'none';
    this.lobbyEl.style.display = 'flex';
    this.hudEl.style.display = 'none';
    this.resultsEl.style.display = 'none';

    this.roomCodeValEl.textContent = `ROOM: ${room.id}`;
    this.isHost = room.hostId === this.network.playerId;

    this.startBtnEl.style.display = this.isHost ? 'block' : 'none';
    this.readyBtnEl.style.display = this.isHost ? 'none' : 'block';

    this.playerListEl.innerHTML = room.players
      .map(
        (p) => `
        <div class="player-item">
          <div>
            <span class="player-color-dot" style="background: ${p.color};"></span>
            <strong>${p.displayName}</strong> ${p.isHost ? '<span style="color:#f59e0b">(Host)</span>' : ''}
          </div>
          <div>${p.isHost ? '👑' : p.ready ? '✅ Ready' : '⏳ Waiting'}</div>
        </div>
      `,
      )
      .join('');
  }

  public showHUD(mode: string) {
    this.mainMenuEl.style.display = 'none';
    this.lobbyEl.style.display = 'none';
    this.resultsEl.style.display = 'none';
    this.hudEl.style.display = 'flex';

    if (mode === 'free-drive') {
      document.getElementById('hud-rank-card')!.style.display = 'none';
      document.getElementById('hud-lap-card')!.style.display = 'none';
    } else {
      document.getElementById('hud-rank-card')!.style.display = 'flex';
      document.getElementById('hud-lap-card')!.style.display = 'block';
    }
  }

  public showResults(results: RaceResult[]) {
    this.hudEl.style.display = 'none';
    this.resultsEl.style.display = 'flex';

    const resultsList = document.getElementById('results-list')!;
    resultsList.innerHTML = results
      .map(
        (r, idx) => `
        <div class="player-item">
          <div>
            <strong style="color: #f59e0b; margin-right: 0.5rem;">#${idx + 1}</strong>
            ${r.displayName}
          </div>
          <div>${(r.finishTimeMs / 1000).toFixed(2)}s</div>
        </div>
      `,
      )
      .join('');
  }

  public updateSpeed(speedKmh: number) {
    this.speedValEl.textContent = String(speedKmh);
  }

  public updateRace(race: any, localRank: number) {
    this.rankValEl.textContent = String(localRank);
    const myPlayer = race.players.find((p: any) => p.id === this.network.playerId);
    if (myPlayer) {
      this.lapValEl.textContent = `${myPlayer.lap} / ${race.laps}`;
    }
  }

  public updateAbility(ability: string | null) {
    this.abilityValEl.textContent = ability ? ability.toUpperCase() : 'NONE';
  }

  public updateDebug(fps: number, drawCalls: number, rtt: number) {
    this.debugEl.textContent = `FPS: ${fps} | DrawCalls: ${drawCalls} | RTT: ${rtt} ms`;
  }
}
