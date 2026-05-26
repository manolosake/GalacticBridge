# GalacticBridge

GalacticBridge is a browser-only mission console for experiential venue operators and event producers. It turns a static cockpit into a buyer-facing contract workflow where guests select a mission, advance through phases, handle a hold state, and finish with visible value, ETA, confidence, and status outcomes.

## Target Buyer

- Immersive entertainment venues that need repeatable group missions for private events.
- Event producers selling sci-fi themed corporate activations without licensed franchise risk.
- Brand experience teams that need a dramatic command deck demo with clear operator controls.

## Painful Use Case

Operators often have impressive cockpit visuals but no obvious buyer story: a prospect cannot see how the experience becomes a paid run, how staff guide guests, or how conflict-free scenarios stay licensable. GalacticBridge demonstrates the whole loop in one screen: contract selection, briefing, scan, alignment, jump or dock, completion, and emergency hold recovery.

## Demo Steps

1. Open `index.html`.
2. Select one of the three contracts: Orion Relay Run, Helios Freight Escort, or Vega Medical Corridor.
3. Press `Scan` to move from Briefing into route scanning.
4. Press `Boost` once to align the corridor, then again to commit the jump/dock phase.
5. Press `Dock` to complete the contract and show the delivered status and payout.
6. Press `Emergency` at any point to trigger an incident hold, then press `Scan` to recover.

## Original Positioning

All visible buyer copy uses original GalacticBridge language. Contracts, destinations, objectives, systems, and hazard controls are written for licensable venue/event use and avoid protected franchise terms, armed-system framing, and conflict-first sales language.

## Run

No build step and no package install are required.

Open `index.html` directly in a browser, or serve the folder with:

```bash
python3 -m http.server 8787
```
