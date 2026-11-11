# 🧪 Jr_AstroCamp: Beyond Earth — Verification & Testing Protocol

**NASA Space Apps Challenge 2026: Build a Junior Astronaut Mission Trainer**  
*Project: Jr_AstroCamp: Beyond Earth*

---

## 1. Testing Summary & Quality Standards

Jr_AstroCamp maintains a dual-verification strategy covering both the interactive web expedition platform (React 19 / TypeScript / Vite / Three.js) and the desktop 60 FPS flight simulator (Python 3 / Pygame-ce):
1. **Automated Web Tests (`npm test`):** Validates deterministic simulation math, cargo mass validation, BVAD consumption formulas, Kilopower night generation, shift actions, boundary clamping, game-over triggers, DONKI mapping/source selection, the simulated radiation budget limit, Cadet/Explorer/Advanced HUD meter selection, resource costs for every Cadet lunar and Mars choice, procedural crater terrain and simulated rollover risk, storm timer scaling, rover energy trade-offs, supported/unavailable haptic behavior, student mentor guidance, Rapier WASM initialization, Shackleton attempt/reward persistence, co-op simulation replay, isolated role dashboards, and a local Colyseus room with multiple clients.
2. **Automated Pygame Engine Headless Tests (`python tests/test_game.py`):** Validates 76 cataloged missions, procedural audio synthesis, 6 flight disciplines, and save file persistence.
3. **TypeScript & Static Linting Verification (`npm run build`):** Enforces strict types (`tsc -b`) and fast modern linting (`oxlint`).
4. **End-to-End Browser & Usability Verification (`npm run test:e2e`):** Mobile Chromium Playwright smoke tests cover campaign launch, rover start, failure debrief, the linked notebook route, and starting a network crew mission.

---

## 2. Test Execution & Verified Results

### Test Suite 1: Web Simulation and Data Engine (`npm test`)
- **Command:** `npm test`
- **Latest result:** Pass (exit code `0`)
- **Verified checks:**
  1. `[PASS]` Initial Game State initialization (Sol 1, baseline resources, nominal modules).
  2. `[PASS]` Outpost Cargo Mass budget calculation (Default lunar outpost: 39,500 kg ≤ 45,000 kg; heavy configuration: 73,000 kg > 45,000 kg blocked).
  3. `[PASS]` Day/Night transition & solar generation (Day: 35 kW, Lunar Night: 0 kW).
  4. `[PASS]` Kilopower Fission Reactor night resilience (25 kW continuous 24/7 power during lunar night).
  5. `[PASS]` Shift Action trade-offs (Power conservation cuts load to 11 kW; science intensive yields +10 pts at 29 kW load).
  6. `[PASS]` Critical failure detection (Battery depletion to 0% during lunar night triggers freeze game over).
  7. `[PASS]` Victory outcome certification at Sol 30.
  8. `[PASS]` Resource boundary capping (Strict clamping to 0% min and 100% max).
  9. `[PASS]` NASA DONKI mapper derives flare strength and approximate warning time from linked records.
  10. `[PASS]` Live/archive/unavailable source selection and the 100% simulated mission-dose-budget boundary.
  11. `[PASS]` A linked DONKI record generates an event carrying its record ID and honest source label; unavailable data stays a game scenario.
  12. `[PASS]` Cadet HUD has exactly three meters (Power, Life Support, Radiation Dose Budget); Explorer and Advanced tier meter sets remain distinct.
  13. `[PASS]` Every option in the lunar and Mars Cadet event decks has a written trade-off and at least one negative resource delta.
  14. `[PASS]` Shackleton practice terrain includes procedural impact basins, rollover-risk slopes, game-only labels, and Rapier lunar gravity.
  15. `[PASS]` Haptic feedback preserves vibration patterns on supported devices and safely reports unavailable-device behavior.
  16. `[PASS]` Student Mission Mentor offers supportive, mission-aware guidance and distinguishes NASA sources from game simulations.
  17. `[PASS]` Shackleton attempts, returned sample stock, and Ice Finder badge are validated and serialized separately from core campaign missions.
  18. `[PASS]` Seeded co-op mission replay and role-specific dashboards reveal only each station's telemetry.
  19. `[PASS]` Colyseus room accepts four clients, advances a server-authoritative turn, relays preset chat and voice signals, replaces a departed player with a bot, and reconnects a dropped client.
  20. `[PASS]` Mobile Playwright campaign → rover → autopsy → notebook and private network mission-start smoke tests.

### Cadet HUD manual smoke check

1. Start a mission and select **CADET (ages 7–12)**.
2. Confirm the HUD shows only Power, Life Support (oxygen + water), and Radiation Dose Budget meters.
3. Open **MISSION WORDS** on desktop and a touch-sized viewport; confirm Sol, radiation dose, life support, microgravity, and SIMULATED have plain-language explanations.
4. Change to **ENGINEER** or **COMMANDER** and confirm the full advanced telemetry set and precision-unit toggle remain available.
5. In both lunar and Mars Cadet campaigns, inspect each choice and confirm its trade-off text names a cost reflected in the resource changes.

### Shackleton campaign integration manual smoke check

1. Open `#/campaign` and confirm the Shackleton Ice Run card shows the separate game-simulation water/fuel stocks and badge status.
2. Launch the game and confirm the lazy-loaded rover view shows its instrument-style resource meters, procedural crater surface, and six-wheel rover. Inspect source labels: NASA DONKI is marked LIVE or ARCHIVED when available; route and sensor values remain game simulations, not LOLA terrain measurements.
3. On a vibration-capable touch device, confirm short haptic cues on steering, heater changes, sampling, charging, slope-risk entry, and the run result. Devices without browser vibration support retain visual and audio feedback.
4. Complete a run and bank the samples. Confirm stocks and the Ice Finder badge update without changing the 76-mission total.
5. Open the flight certificate and confirm it lists the badge separately from core mission counts.
6. In the teacher activity dossier, confirm successful completion is logged; failed attempts are recorded as learning attempts with zero XP/coins.
7. Use the debrief lesson link and confirm the Artemis lunar-ice notebook opens. When WebGL is unavailable, verify the existing 2D rover fallback can open.

### Mobile Playwright smoke test

The automated browser test uses the Pixel 7 viewport and an offline NASA API response:

```bash
npx playwright install chromium
npm run test:e2e -- --project=mobile-chromium
```

It opens the campaign, launches the hub entry and rover, finishes a failure-as-learning run, and follows the debrief link to the Student Notebook. It also opens the multiplayer lobby, creates a private network room, starts the shared mission, and advances a team-voted turn. The responsive Launchpad check measures overflow at phone, tablet, and desktop viewport widths.
- **Latest result:** Pass (3/3) in Chromium at the Pixel 7 viewport.

### Cross-browser responsive smoke test

The responsive Launchpad test checks 320 px and 393 px phone widths, a 768 px tablet width, and a 1280 px desktop width. The compatibility project adds browser-engine coverage for desktop Chromium, desktop Firefox, and iPhone-sized WebKit emulation:

```bash
npx playwright install chromium firefox webkit
npm run test:e2e:compat
```

The responsive check passed on desktop Chromium, desktop Firefox, and iPhone-sized WebKit emulation. These are automated browser-engine/device-profile emulations. They do not certify physical iOS Safari or Android hardware; perform a real-device pass before claiming full cross-platform certification.

### Refreshing archived NASA DONKI data

Run `npm run fetch:donki` to fetch the latest 30 days of CME, FLR, SEP, and GST records into `public/data/donki_snapshot.json`. The script reads `NASA_API_KEY` or `VITE_NASA_API_KEY` from the environment, falling back to NASA's rate-limited `DEMO_KEY`. A failed request exits with an error and does not replace the existing snapshot. Do not commit a personal API key.

### Test Suite 2: Python / Pygame Headless Flight Tests (`python tests/test_game.py`)
- **Command:** `$env:PYTHONIOENCODING="utf-8"; python tests/test_game.py`
- **Latest result:** Pass (exit code `0`) with pygame-ce 2.5.8.
- **Verified Components:**
  - `[PASS]` 76 historical NASA missions loaded from `nasa_missions_catalog.csv`.
  - `[PASS]` Procedural square/sine wave audio synthesizer.
  - `[PASS]` Launch simulator scene (Mercury-Redstone 3).
  - `[PASS]` Docking simulator scene (Gemini 5).
  - `[PASS]` Deep space navigation scene (Apollo 4, 5, 6).
  - `[PASS]` Lunar lander scene (Apollo 11).
  - `[PASS]` Space telescope guidance scene (Skylab 1-4).
  - `[PASS]` Planetary rover navigation scene (Viking 1 & 2).
  - `[PASS]` Campaign, briefing, and debriefing UI state persistence (`saves/profile.json`).

### Test Suite 3: Production Web Bundle Build (`npm run build`)
- **Command:** `npm run build` (`tsc -b && vite build`)
- **Latest result:** Pass (exit code `0`), with zero TypeScript errors; Vite transformed 2,051 modules.
- **Bundle note:** The Shackleton 3D route is lazy-loaded; its chunk is 4,352 KB (1,677 KB gzip) and triggers Vite's chunk-size advisory. It is not downloaded with the initial route, but should be further optimized for lower-bandwidth mobile devices.

### Network Crew Co-op (local integration test)

`npm test` starts a temporary local Colyseus server and connects four independent SDK clients. It verifies private room creation/joining, bot-filled seats, server-authoritative deterministic turns, role-specific telemetry, team voting, rejection of free-text chat, English/Bangla preset messages, voice-signal relay, bot replacement after a player leaves, and reconnection after a dropped socket.

This is not the physical-device acceptance test. Four real devices, including two on mobile data, still need to complete a mission against a deployed TLS server with a configured TURN service. Do not describe network co-op as verified real-time multiplayer until that succeeds.

Server and Vite commands:

```bash
npm run coop:server:check
COOP_PORT=2567 COOP_HOST=0.0.0.0 npm run coop:server
# Configure VITE_MULTIPLAYER_SERVER_URL in the Vite environment, then:
npm run dev
```

`COOP_TURN_URL` and `COOP_TURN_SHARED_SECRET` are server-only. The server derives short-lived TURN credentials; do not put the shared secret in a `VITE_` variable. Chat is preset-only, and messages/voice are not written to persistent storage.

---

## 3. How to Run the Automated Tests

### Web Simulation Test Suite:
```bash
# In project root
npm test
# Or directly with Node.js
node tests/test_simulation.mjs
node tests/test_donki.mjs
node tests/test_resource_hud.mjs
node tests/test_shackleton.mjs
node tests/test_shackleton_progress.mjs
npx tsx tests/test_multiplayer_coop.ts
npx tsx tests/test_multiplayer_network.ts

# Install Chromium once, then run the mobile browser smoke test
npx playwright install chromium
npm run test:e2e -- --project=mobile-chromium
```

### Production Build:
```bash
npm run build
```

### Python Flight Engine Test Suite:
```bash
# Ensure Python 3.10+ and pygame-ce are installed
pip install -r requirements.txt

# Run headless verification (Windows PowerShell)
$env:PYTHONIOENCODING="utf-8"; python tests/test_game.py

# Run headless verification (Linux / macOS)
python3 tests/test_game.py
```

---

*(c) 2026 Team Mysterio · Jr_AstroCamp: Beyond Earth · NASA Space Apps Challenge 2026*
