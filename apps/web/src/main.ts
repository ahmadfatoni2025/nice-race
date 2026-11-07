import { NetworkClient } from './network/client.js';
import { GameManager } from './game/gameManager.js';
import { UIManager } from './ui/uiManager.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const uiRoot = document.getElementById('ui-root') as HTMLElement;

  const network = new NetworkClient();
  const ui = new UIManager(uiRoot, network);

  let currentFps = 60;
  let currentDrawCalls = 40;

  const game = new GameManager(canvas, network, {
    onSpeedUpdate: (speed) => ui.updateSpeed(speed),
    onRaceUpdate: (race, localRank) => ui.updateRace(race, localRank),
    onAbilityUpdate: (ability) => ui.updateAbility(ability),
    onRaceFinished: (results) => ui.showResults(results),
    onFpsUpdate: (fps, drawCalls) => {
      currentFps = fps;
      currentDrawCalls = drawCalls;
      ui.updateDebug(fps, drawCalls, network.rtt);
    },
  });

  network.on('rttUpdate', (rtt) => {
    ui.updateDebug(currentFps, currentDrawCalls, rtt);
  });

  network.on('roomCreated', (data) => {
    ui.showLobby(data.room);
  });

  network.on('roomJoined', (data) => {
    ui.showLobby(data.room);
  });

  network.on('roomUpdated', (room) => {
    if (room.phase === 'lobby') {
      ui.showLobby(room);
    }
  });

  network.on('gameStarting', (data) => {
    ui.showHUD(data.config.mode);
  });

  network.on('roomError', (err) => {
    alert(`[Room Error] ${err.message}`);
  });
});

