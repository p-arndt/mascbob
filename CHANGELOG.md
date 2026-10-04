# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.4.0 - 2026-10-04

### Added

- Give full-body bob and critter a `heldItem="sword"`, `"microphone"` or `"phone"`. They swing a long fantasy sword, gesture with the microphone while `mood="talking"`, or check a small phone with its screen facing them; `motion="reduced"` keeps the movements still.
- New `muscle` proportion: `proportions={{ muscle: 1.6 }}` gives Bob and Critter thicker arms, bigger fists and slightly broader shoulders.

### Changed

- Pulling the head of a full-body mascot up no longer leaves its shadow behind on the body, and the top of the body it reveals is rounded instead of flat.
- Bob's body is now a little narrower than the head, so the head sits on it with a soft shadow that follows its outline. The `thinking` mood and `hands="think"` now raise a hand to the chin instead of folding the arm onto the shoulder.

### Fixed

- Faint eyebrows no longer look muddy brown where the orange misprint shows through, and the misprint sits closer to the ink, so happy crescent eyes and mood changes no longer get a detached orange copy below the eyes.

## 0.3.0 - 2026-10-01

### Added

- Choose `species="critter"`, `species="moss"` or `species="wisp"` for companions with their own anatomy, sharing Bob’s moods, reactions and accessories. Adjust their contour and limbs from 40–180% with `proportions`; Critter’s muzzle follows its nose and mouth through moods and speech, and the original `species="bob"` remains the default.
- Choose `species="snail"` for a companion with independently grabbable eye stalks that lean toward `lookAt`, a spiral house and a soft foot. It tucks its head in when shy or sleepy; `proportions.body` sizes its house, `height` its foot length and `arms` its eye stalks.
- Use `species="octo"` for a soft-bell companion with four independently grabbable, curled tentacles. Adjust their length with `proportions.arms`; they tuck in when sleepy or sad and share the existing moods, themes and head accessories.

### Changed

- With `lookAt` and the default `follow` reaction, companions now lean toward diagonal pointers even outside their bounds: Bob and Critter move their whole head while Snail keeps its body steady and aims only its eye stalks. Use `lookAt="none"` to disable gaze-driven head movement; reduced motion disables it and dragging holds the current orientation.

### Fixed

- With `reactions={{ grab: true }}`, dragging arms and legs now follows the pointer more directly while keeping the soft spring-back on release. Grabbing a hand off-center no longer snaps its center to the pointer.
- With a full body and no outfit, a pulled head's neck now rises out of the shoulders and follows the turning torso instead of lying across the chest.

## 0.2.0 - 2026-09-30

### Added

- New `explode` reaction: keep booping the mascot once it is grumpy and its head bursts into confetti after a short fuse. It is on by default and fires `onreaction` with `{ type: "explode" }`.
- New `grab` prop: `follow` (0..1) sets how far a grabbed head follows the pointer, `lean` (0..3) how far the figure leans into a pull.
- New `grab` reaction: pull the head, arms or legs around like a puppet and they snap back when let go. On by default; fires `{ type: "grab", part }`.

### Changed

- Tickling reacts sooner: three quick boops make it giggle and five make it grumpy (was four and nine).
