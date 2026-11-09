# PARCEL PRESS

Fold four hinged paper panels in the sequence printed on each order. Drag toward the parcel or tap a symbol. Tap the seal to center it, or drag it into the dotted target. A clean sequence and centered seal each earn an extra star. Eight orders unlock in sequence.

Open index.html or standalone.html from the ZIP. The game, graphics and synthesized sound run locally. The source entry index-source.html and editable modules are included. Rebuild with python build.py. Tests run with node core-tests.mjs and node sdk-tests.mjs.

The original setting, prints, box art and controls were made for this game. The Combos reference is AncientFish's OWW Wrapping Paper, whose ink and paper color controls were tried in the preview. Parcel Press adds its own folding and scoring rules.

GameWave integrations use the optional window.neonlib API. The first committed fold attempt or resumed fold or seal starts the round. Completion and explicit abandonment end an active round. Reload preserves the local partial parcel and waits for the next committed action. Its only local storage key is parcel-press-v1. Cloud state contains the parcel-press v1 profile with best stars, reward flags and mute. The unfinished parcel stays local. Blue Porcelain and Berry Foil can be earned through stars or qualifying GameWave callbacks.

SDK tests use mocks. The GameWave App and physical phone performance require separate device verification.
