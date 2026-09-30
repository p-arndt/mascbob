# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.2.0 - 2026-09-30

### Added

- New `explode` reaction: keep booping the mascot once it is grumpy and its head bursts into confetti after a short fuse. It is on by default and fires `onreaction` with `{ type: "explode" }`.
- New `grab` prop: `follow` (0..1) sets how far a grabbed head follows the pointer, `lean` (0..3) how far the figure leans into a pull.
- New `grab` reaction: pull the head, arms or legs around like a puppet and they snap back when let go. On by default; fires `{ type: "grab", part }`.

### Changed

- Tickling reacts sooner: three quick boops make it giggle and five make it grumpy (was four and nine).
