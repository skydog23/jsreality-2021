# AnimationPanel: Java vs JS Comparison Report

**Date**: 2026-02-23

**Java source**: `animation/src/charlesgunn/anim/gui/AnimationPanel.java`
**JS translation**: `jsreality-2021/src/anim/gui/AnimationPanel.js`

---

## 1. Missing `updateKeyFrame()` method (behavioral)

Java has a separate `updateKeyFrame()` (line 491–519) that is called from both `inspectKeyFrame()` and `updateTime()`. It clamps `inspectedKeyFrame`, updates the `currentKeyFrame` reference, and fires `SET_VALUE_AT_TIME`. In JS, this logic was partially inlined into `inspectKeyFrame()` and `updateTime()`, but there's a subtle event-firing difference:

**Java `updateTime()`** calls `updateKeyFrame()` (which fires `SET_VALUE_AT_TIME`) when the segment changes, and then *also* fires `SET_VALUE_AT_TIME` unconditionally at the end — so it fires the event **twice** when the segment changes.

**JS `updateTime()`** fires `SET_VALUE_AT_TIME` exactly **once** via `#fireSetValueAtTime()`.

This may be intentional (a Java bug fix), or it may cause listeners to miss an update.

## 2. `tick()` early return after boundary (behavioral)

Java `tick()` (line 685–731): after hitting the boundary condition and doing NORMAL/CYCLE/SHUTTLE handling, the code **falls through** to the tick-advancement block at the bottom (lines 719–727), which still computes and adds `dticks` to `dcurrentTick`.

JS `tick()` (line 447): has an explicit `return;` after boundary handling, skipping the tick advancement entirely.

In practice, for NORMAL mode this doesn't matter (playback stops). For CYCLE and SHUTTLE it could produce a one-frame timing difference per cycle boundary.

## 3. Missing methods

These Java methods have no JS equivalent:

| Java method | Purpose |
|---|---|
| `clearKeyFrames()` (line 399) | Removes all keyframes except the first |
| `clear()` (line 788) | Resets inspected index, inspects, then clears all keyframes |
| `setFromArchive(Object)` (line 915) | Restores full state from a serialized archive, matching listeners by name |
| `elementNamed(String, List)` (line 952) | Static helper to find a listener by name in a list |

## 4. Missing getters/setters

Java has these accessors that JS lacks:

| Accessor | Used by |
|---|---|
| `setCurrentKeyFrame(KeyFrame)` | `setFromArchive()` |
| `getTotalTicks()` / `setTotalTicks(int)` | `setFromArchive()`, serialization |
| `getTotalSeconds()` / `setTotalSeconds(double)` | `setFromArchive()`, serialization |
| `getFrameCount()` / `setFrameCount(int)` | `setFromArchive()`, serialization |
| `setListeners(List)` / `getListeners()` | `setFromArchive()` |
| `getGlobalPlaybackFactor()` / `setGlobalPlaybackFactor(double)` | Initial slider value; archiving |
| `getResourceDir()` / `setResourceDir(String)` | File I/O paths |
| `getDurationValue()` | External access to duration text field |

Most of these are needed only for `setFromArchive()` and serialization.

## 5. Missing fields

| Java field | Purpose |
|---|---|
| `stem` (`"spiral"`) | Base filename for recording output |
| `globalPlaybackFactor` (1.0) | Initial playback-speed slider value; Java has *both* this and `playbackFactor` |
| `loopPlay` | Declared but never read — dead code in Java |
| `resourceDir` | Default directory for file open/save dialogs |
| `saveAnimationFile` / `readAnimationFile` | Last-used file paths for I/O |

## 6. File I/O methods missing

`selectOpenFile()`, `read()`, `read(String)`, `read(Input)`, `selectSaveFile()`, `export()` — all omitted as noted in the JS header comment. These depend on `ImportExport` and Swing `JFileChooser`.

## 7. Minor logic differences

- **`inspectKeyFrame()` when empty**: Java returns silently. JS sets `currentKeyFrame = null` and `currentTime = 0` before returning — a reasonable guard.
- **`setPlaybackFactor()`**: Java also calls `pbspeedSlider.setValue(...)` (GUI feedback). JS only stores the value.
- **`startPlayback()`**: JS guards with `if (keyFrames.size() === 0) return;` — Java doesn't have this guard.
- **`tickFromTime()`**: JS adds a zero-division guard (`if (denom === 0) return 0`). Java doesn't.
- **`setInspectedKeyFrame()`**: JS calls `inspectKeyFrame()` internally; Java calls `updateKeyFrame()`.

---

## Proposed strategy

1. **Fix `tick()` boundary behavior**: Remove the early `return;` in JS `tick()` to match Java's fall-through behavior, or keep it if testing shows the JS behavior is actually better (avoids a double-advance on cycle boundaries). This should be verified with a CYCLE or SHUTTLE playback test.

2. **Add missing model methods**: Implement `clearKeyFrames()`, `clear()`, and the missing getters/setters (`setCurrentKeyFrame`, `getTotalTicks`/`setTotalTicks`, `getTotalSeconds`/`setTotalSeconds`, `getFrameCount`/`setFrameCount`, `getListeners`/`setListeners`). These are simple one-liners.

3. **Port `setFromArchive()` and `elementNamed()`**: These are needed if you plan to support save/restore of animation state. They're pure model operations with no GUI dependency.

4. **Decide on the `updateTime()` double-fire**: The Java code fires `SET_VALUE_AT_TIME` twice on segment changes. This looks like an oversight. Recommend keeping the JS single-fire behavior and noting it as an intentional improvement.

5. **Defer file I/O**: The `read`/`export`/file-chooser methods depend on `ImportExport` and the filesystem. These should wait until `ImportExport` is ported or replaced with a browser-friendly equivalent (e.g., JSON download/upload).

6. **Add `stem` and `globalPlaybackFactor` fields**: Trivial additions for parity, even if not immediately used.
