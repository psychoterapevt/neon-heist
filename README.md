# NEON HEIST

**Your body is the controller.**

NEON HEIST is a browser game you play with your body in front of an ordinary webcam. There is no keyboard, mouse or gamepad during gameplay. You break into a futuristic data centre, dodge lasers, crates and drones, hack terminals and steal the Data Core.

> 🔒 Camera processing happens locally. Video never leaves your browser.

---

## Game concept

The facility's security system has disabled normal controls, so the only way to steer your hacker is to move yourself:

```
Camera → Pose / Hand landmarks → Custom gesture recognition → Game action → Visual feedback
```

> *Most motion demos prove that a camera can detect movement. NEON HEIST turns movement recognition into a complete gameplay loop.*

```
Movement → Recognition → Error → Correction → Action → Reward
```

When a gesture fails, the game tells you **why** and **how to fix it**. It never says "gesture not recognized".

## How to play

1. **START HEIST**, then allow the camera. The permission prompt is explained before it appears.
2. **Camera setup**: stand about 1.5–2 m back so your upper body and raised hands fit in the frame. Live checks cover face, shoulders, hands, room to jump, one player and light. When everything passes you see **READY**. If you're too close you see **MOVE BACK**.
3. **Training**: perform each of the 5 gestures once (*TRY JUMP → ✓ READY*). Error Mode is already active here. Then "You're ready." → **START MISSION**.
4. **Three levels.** Your hacker runs forward automatically. Follow the hint banner (*LASER AHEAD · JUMP NOW*).
   - **Level 1: INFILTRATION.** Move and jump past lasers, reach the security door and **hack** it. The screen shows **DOOR UNLOCKED → LEVEL COMPLETE**.
   - **Level 2: SECURITY.** Adds moving crates and **drones**. A drone charges its beam (you see a reticle on you), and only a **shield** blocks the shot.
   - **Level 3: CORE.** Everything combined. Hack **3 terminals**, reach the Core, run the final hack, and you get **MISSION COMPLETE**.
5. **HP ❤️❤️❤️.** Each hit costs one heart. At 0 you get **GAME OVER** ("Security system detected you.") and can **TRY AGAIN** (the level restarts).
6. **HEIST COMPLETE** shows score, time, gestures, success rate, errors corrected and levels 3/3. Stats are saved on your device.

## Controls

| Gesture | How | Game action |
|---|---|---|
| **MOVE LEFT** ← | Sweep a hand quickly to the left | Change lane left |
| **MOVE RIGHT** → | Sweep a hand quickly to the right | Change lane right |
| **JUMP** ↑ | Raise **both** hands above your head | Jump over low lasers |
| **HACK** 🤏 | Pinch: thumb tip touches index tip | Hack terminal / door / core |
| **SHIELD** ✋ | Open palm toward the camera (hold ¼ s) | 2.8 s energy shield (blocks drone shots), 2.2 s recharge |

Every recognised gesture shows a short **✓ JUMP / ✓ HACK / ✓ SHIELD / ✓ MOVE LEFT / ✓ MOVE RIGHT** confirmation with its detection confidence, without blocking gameplay.

The camera window (top-right) shows your skeleton and **● TRACKING** or **⚠ TRACKING LOST**. When tracking is lost the game **pauses automatically**, so nobody loses HP because they stepped out of the frame.

## Motion recognition

MediaPipe Tasks Vision runs fully in the browser (WASM, GPU with CPU fallback):

- **Hand Landmarker:** 21 landmarks per hand, every video frame, up to 2 hands.
- **Pose Landmarker (lite):** 33 body landmarks every 2nd frame, up to 2 people, so a second person can be detected.

All coordinates are normalized to 0..1 and mirrored to selfie space, so "right" always means the player's screen-right. Hand-shape thresholds are relative to hand size (wrist → middle MCP), and body thresholds are relative to shoulder width. Recognition therefore works close up or far away, at any camera resolution.

### Gesture state machines

No gesture is decided from a single frame. Each gesture has its own temporal state machine:

```
IDLE → POSSIBLE → TRACKING → GESTURE_CONFIRMED → ACTION_TRIGGERED → COOLDOWN → IDLE
```

| Gesture | POSSIBLE | CONFIRMED | Re-arm (no multiple triggers) |
|---|---|---|---|
| Move L/R (2 separate machines) | horizontal speed > 0.15 fw/s for 2 frames | travel ≥ 15% of width, ≤ 850 ms, avg ≥ 0.35 fw/s | 450 ms cooldown + hand settles. Returning hand ignored for 0.9 s |
| Jump | a wrist above the shoulder line | both wrists above the head for ≥ 110 ms (≥ 2 pose frames) | **both** hands must come down |
| Hack | thumb and index approaching | ratio < 0.30 held 120 ms (release > 0.45, hysteresis) | fingers must open again |
| Shield | palm open | open and still (< 0.45 fw/s) for 250 ms | hand must close or leave for 250 ms |

Smoothing is done by `LandmarkSmoother`, an adaptive exponential moving average. It smooths strongly when the hand is still (jitter) and lightly when it moves fast (low lag). A global per-gesture cooldown of 350 ms is added on top.

## Error Mode

`src/errors/errorEngine.ts` receives measurements from the state machines and returns **one** concrete instruction: the most important cause, chosen by `errorPriority.ts`. Errors are **context-aware**. The game tells the recognizer what it expects right now (JUMP when a laser approaches, SHIELD while a drone charges, HACK at a terminal). That way a raised shield hand is never nagged with "Raise both hands", and shape errors appear exactly when they matter.

| Error | Landmarks | Rule | Feedback |
|---|---|---|---|
| `HANDS_TOO_LOW` | wrists 15/16, eyes 2/5, shoulders 11/12 | both wrists above the shoulder line but not above `eyeY − 0.1 × shoulderWidth` for 450 ms | "Raise both hands higher to jump." |
| `ONE_HAND_TOO_LOW` | wrists + shoulders | one wrist raised, the other below the shoulder line | "Raise both hands." |
| `HANDS_NOT_VISIBLE` | wrists, elbows 13/14 | a raised arm (wrist or elbow above the shoulders) whose wrist visibility is < 0.35 | "Move back so both hands are visible." |
| `SWIPE_TOO_SHORT` | palm centre (wrist + 4 MCP) | `abs(deltaX) < 0.15 × frame width` | "Move your hand farther." |
| `SWIPE_TOO_SLOW` | palm centre | duration > 850 ms or velocity < 0.35 fw/s | "Move faster." |
| `HAND_OUT_OF_FRAME` | palm centre | hand reached the edge (< 3.5% / > 96.5%) or was lost there before covering the distance | "Keep your hand inside the frame." |
| `WRONG_DIRECTION` | palm centre | `abs(dy) > 0.85 × abs(dx)` (shown only when a MOVE is expected) | "Move sideways, not up or down." |
| `PINCH_TOO_WIDE` | thumb tip 4, index tip 8, wrist 0, middle MCP 9 | `distance(indexTip, thumbTip) / handSize` stuck in 0.30–0.55 for 800 ms | "Bring your thumb and index finger closer." |
| `HAND_POORLY_VISIBLE` | 0, 5, 17 | palm triangle area / handSize² < 0.16 (hand edge-on) | "Turn your hand toward the camera." |
| `LOW_CONFIDENCE` / `PINCH_NOT_HELD` | hand presence score | presence < 0.6 (a pinch never fires), or 2 pinch flickers shorter than 120 ms | "Hold the pinch for a moment." |
| `HAND_NOT_OPEN` | all 21 | < 4 fingers extended (straightness + reach) or index↔pinky spread < 14° | "Open your hand." |
| `PALM_NOT_FACING` | 0, 5, 17 | palm facing score < 0.24 | "Turn your palm toward the camera." |
| `HAND_TOO_LOW` | palm centre + shoulders | palm below chest level (shoulders + 0.7 × shoulder width) | "Raise your hand." |
| `MULTIPLE_PEOPLE` | pose count | ≥ 2 people (or > 2 hands) for 600 ms. Gestures are blocked | "Only one player should be visible." |
| `TRACKING_LOST` | shoulders | no body for 900 ms. The game pauses | "Step back into view — upper body and hands." |

Examples in the requested format:

```
JUMP_TOO_LOW (HANDS_TOO_LOW)
LANDMARKS: wrists + shoulders + eyes
RULE:      wristY must be above (eyeY − 0.1·shoulderWidth); both wrists raised but below that line for 450 ms
FEEDBACK:  "Raise both hands higher to jump."   VISUAL: dashed JUMP LINE + ↑ arrows over each low wrist

SWIPE_TOO_SHORT
LANDMARKS: palm centre (wrist + 4 MCP joints)
RULE:      |currentX − startX| < 0.15 frame widths
FEEDBACK:  "Move your hand farther."   VISUAL: HAND ●───────→ MINIMUM DISTANCE (achieved part in red)

PINCH_TOO_WIDE
LANDMARKS: thumb tip, index tip, wrist, middle MCP
RULE:      distance(indexTip, thumbTip) / handSize > 0.30 while trying (0.30–0.55 for 800 ms)
FEEDBACK:  "Bring your thumb and index finger closer."   VISUAL: dashed gap between the fingertips

HAND_NOT_OPEN
LANDMARKS: all 21 hand points
RULE:      finger extension (straightness > 0.82 and tip beyond PIP) for 4 fingers and spread ≥ 14°
FEEDBACK:  "Open your hand."
```

**Priority.** Only one error is shown at a time:

```
MULTIPLE_PEOPLE > TRACKING_LOST > HANDS_NOT_VISIBLE > HAND_OUT_OF_FRAME > LOW_CONFIDENCE
> HAND_POORLY_VISIBLE > PALM_NOT_FACING > HAND_TOO_LOW > ONE_HAND_TOO_LOW > HANDS_TOO_LOW
> HAND_NOT_OPEN > WRONG_DIRECTION > SWIPE_TOO_SHORT > SWIPE_TOO_SLOW > PINCH_TOO_WIDE > PINCH_NOT_HELD
```

**Visualization.** Errors are shown on the skeleton (arrows, jump line, trajectory, fingertip gap) *and* on an in-game card with a pictogram, so they make sense without reading. Once the error is fixed, the card shows **✓ READY**.

**Scoring and stats.** A failed attempt costs −25 (at most once every 1.2 s) and resets the combo. It is also counted as an error. A later success with the same gesture within 8 s counts as an *error corrected*.

## Technical architecture

```
src/
  game/        GameCanvas.tsx (rAF loop), GameEngine.ts (simulation, score, combo, HP, adaptive difficulty),
               CollisionSystem.ts, LevelManager.ts, Player.ts, Enemy.ts (Drone, Block), Laser.ts,
               Terminal.ts (terminal / door / core), renderer.ts (pseudo-3D canvas), types.ts
  vision/      handDetector.ts, poseDetector.ts, visionRuntime.ts, landmarkSmoother.ts, handMetrics.ts,
               poseMetrics.ts, visibility.ts (isHandVisible, isBodyVisible), skeleton.ts (overlay), brightness.ts
  gestures/    gestureController.ts, swipeDetector.ts, jumpDetector.ts, pinchDetector.ts,
               openPalmDetector.ts, gestureConfig.ts (all thresholds)
  errors/      errorEngine.ts (classifyError, ErrorTracker), errorPriority.ts (getBestError)
  components/  StartScreen, CameraSetup, Tutorial, GameSession, HUD, CameraPreview, SkeletonOverlay,
               GestureFeedback, ErrorFeedback, GameOver, VictoryScreen, StatsScreen, PermissionGate
  levels/      level1.ts, level2.ts, level3.ts (declarative events along the track)
  audio/       soundManager.ts (Web Audio: effects + procedural ambience)
  storage/     statsStorage.ts (localStorage)
  hooks/       useCamera, useVision, useGestureController, useReducedMotion
  utils/       math.ts (calculateDistance, calculateVelocity, calculateAngle, …)
```

The work is split into separate loops:

| Loop | Driver | Work |
|---|---|---|
| Camera frames | `requestVideoFrameCallback` | one inference per new video frame |
| Vision | same | hands every frame, pose every 2nd frame |
| Gestures | synchronous in the vision loop | `GestureController.process()`, events go straight into the engine |
| Game | `requestAnimationFrame` | fixed 60 Hz simulation plus one canvas render per display frame |
| UI | React | HUD refreshed at about 10 Hz, never once per frame |

The game world is drawn on a Canvas. HUD and menus are React. The camera is an HTML `<video>` with a Canvas skeleton overlay. Rendering is pseudo-3D (one-point perspective), with glow drawn as layered strokes instead of `shadowBlur` to keep FPS high.

**Game feel:** screen shake and hit flash on damage, a smooth lane glide, a small crouch before each jump, score popups, combo x2–x4, particles (digital 0/1 while hacking, a shield energy ring, a jump trail, laser glow, a burst on level complete) and procedural sounds (jump, hack, shield, laser hit, error, success, level complete, game over, plus ambience).

**Adaptive difficulty:** the game tracks the recent success rate over the last 8 outcomes. When you do well, speed rises up to ×1.12. When you struggle, speed drops to ×0.86 and hints appear earlier (4.6 s instead of 3.4 s).

## Custom gesture logic

MediaPipe only provides landmarks. Everything else is NEON HEIST code:

- recognition functions: `detectSwipe()`, `detectJump()`, `detectPinch()`, `detectOpenPalm()`, `isHandVisible()`, `isBodyVisible()`
- temporal state machines, thresholds (`gestureConfig.ts`), cooldowns, hysteresis
- adaptive smoothing (`LandmarkSmoother`)
- return-stroke and reposition filters, so moving your hand back never triggers the opposite move
- error classification: `classifyError()`, `getBestError()`, `ErrorTracker`
- mapping gestures to game actions: `triggerGameAction()`
- low confidence never fires a gesture: hand presence < 0.55 (pinch < 0.6) and wrist visibility < 0.35 are ignored
- missing landmarks produce "tracking lost" and a paused game, never a guessed action

**Tests** (`npm test`, vitest):

- The math functions and all four `detect*` functions.
- `classifyError` for every gesture.
- "One gesture → one action": a pinch held for 2 s gives one HACK, and hands held up give one JUMP.
- Cooldown, low confidence, missing landmarks, and two people in the frame.
- Collisions and the drone/shield interaction.
- Terminal stop plus a single hack, and pause freezing the world.
- A bot that follows the in-game hints finishes all 3 levels.

## Privacy

- Camera frames are processed **locally** in the browser. There is no backend, and no frame is ever sent anywhere.
- No video or images are recorded or stored.
- `localStorage` holds only numbers: best score, best time, missions, accuracy, the last 5 attempts and the mute setting.
- The models (`public/models`) and the wasm runtime are served from the app's own origin.

## Installation

Requires Node 18.18+ (20+ recommended).

```bash
npm install
npm run dev       # http://localhost:5173 — camera works on localhost
npm test
npm run build     # type-check + production build
npm run preview
```

`npm run dev` and `npm run build` copy the MediaPipe wasm runtime from `node_modules` into `public/mediapipe/wasm`.

## Deployment

Browsers only allow the camera on **HTTPS** (or localhost).

**Vercel:** push to GitHub, then import the repository at vercel.com and deploy. `vercel.json` is included: framework Vite, output `dist`, `Permissions-Policy: camera=(self)` and caching for models. Or use the CLI: `npx vercel --prod`.

## Hackathon requirements

- ✓ Real-time camera recognition (MediaPipe hands every frame, pose at half rate, in the browser)
- ✓ 5 gestures: move left, move right, jump, hack (pinch), shield (open palm)
- ✓ Each gesture triggers an action: lane change, jump, hack, shield
- ✓ Visual feedback: skeleton overlay, ✓ confirmations, popups, particles, HUD
- ✓ Complete game scenario: start, camera setup, tutorial, 3 levels, game over / victory, stats
- ✓ Browser-based: Vite static site, no install
- ✓ Error Mode: 16 classified causes with a priority system and visual hints
- ✓ Specific correction hints: "Raise both hands higher to jump.", "Move your hand farther."…
- ✓ Custom recognition logic: state machines, thresholds, smoothing, context-aware errors
- ✓ Local processing: no backend, no uploads
- ✓ Sound effects: Web Audio, procedural, with mute
- ✓ Progress / stats: score, combo, HP, best score/time, missions, accuracy, last 5 attempts (localStorage)

### 90-second jury demo

| Time | What to do |
|---|---|
| 0–10 s | START HEIST, allow camera, READY |
| 10–20 s | Training: try each gesture, see ✓ READY. Or SKIP TRAINING if already shown |
| 20–35 s | Level 1: move left / right past the laser walls |
| 35–45 s | Jump over a low laser (✓ JUMP, maybe PERFECT +50) |
| 45–55 s | **Error Mode:** raise hands only to face height. You get *⚠ JUMP NOT READY · "Raise both hands higher to jump."* with ↑↑ on the skeleton |
| 55–65 s | Raise them fully: ✓ JUMP |
| 65–75 s | Pinch at the security door: ✓ HACK, DOOR UNLOCKED |
| 75–85 s | Level 2: drone charges, open palm: SHIELD ACTIVE, BLOCKED +100 |
| 85–90 s | Level complete / results |

## Product / game vision

NEON HEIST shows that the body can be a reliable, *explainable* controller. The same pipeline (landmarks, state machines, context-aware Error Engine, action, reward) can power fitness games, rehabilitation exercises with correction feedback, classroom games, and accessible gaming for players who can't use a gamepad.

## Future improvements

- Calibrated thresholds per player (arm length, camera distance)
- More gestures (duck/crouch, lean, two-hand hack puzzles), plus boss drones
- Level editor on top of the declarative level format
- Co-op mode with two tracked players
- Worker-based inference (OffscreenCanvas) for low-end devices

---

**Implementation note:** MediaPipe is used as the underlying pose/hand landmark model (Google, Apache 2.0). Gesture recognition, state machines, thresholds, error classification, feedback logic and all game logic are custom application code. All art is drawn procedurally on Canvas/SVG, and all sounds are synthesized.
