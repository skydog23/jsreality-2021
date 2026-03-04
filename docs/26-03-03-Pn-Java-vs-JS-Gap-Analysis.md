# Pn.java → Pn.js Gap Analysis

**Date**: 2026-03-03  
**Java source**: `jreality-2021/src-core/de/jreality/math/Pn.java` (1029 lines, 47 methods)  
**JS port**: `jsreality-2021/src/core/math/Pn.js` (959 lines, ~40 exports)

## Summary

Pn.js covers the most commonly used methods but is missing **10 Java methods**
(plus 4 trivial vectorized overloads).  There are also **5 behavioral
discrepancies** in existing translations where the Euclidean special-case
handling diverges from the Java original.

---

## 1. Missing Methods

### 1a. Core projective / Cayley-Klein methods (non-trivial)

| Java method | Lines | Complexity | Notes |
|---|---|---|---|
| `dragTangentVector(dst, ddir, src, sdir, length, metric)` | 332–374 | Medium | Core geodesic transport: uses `cosh`/`sinh` (hyp), `cos`/`sin` (ell), `setToLength` (euc). Two overloads — the second (385–390) delegates to the first via `distanceBetween`. Per porting guideline 7, both overloads should be collapsed into one JS function with runtime dispatch. |
| `projectivityFromCanonical(dst, dm)` | 887–907 | Medium | Constructs the unique projectivity mapping the standard basis + unit point to the columns of `dm`. Uses `Rn.inverse`, `Rn.matrixTimesVector`. Straightforward linear algebra. |
| `projectivity(dst, dm, im)` | 909–913 | Low | Computes `B · A⁻¹` where `A = projectivityFromCanonical(dm)`, `B = projectivityFromCanonical(im)`. Trivial once `projectivityFromCanonical` exists. |
| `makeGeneralizedProjection(dst, center, axis, val)` | 650–667 | Medium | Constructs a central projectivity with given center, axis, and cross-ratio parameter. Pure linear algebra (outer product + identity scaling). |
| `makeHarmonicHarmology(dst, center, axis)` | 621–623 | Trivial | Delegates to `makeGeneralizedProjection(dst, center, axis, -1)`. |
| `makeFlattenProjection(dst, center, axis)` | 633–635 | Trivial | Delegates to `makeGeneralizedProjection(dst, center, axis, 0)`. |
| `barycentricCoordinates(dst, tri, unit)` | 1019–1025 | Low | Assembles rows of `tri` into a matrix, inverts, multiplies by `unit`. Depends on `Rn.inverse`, `Rn.transpose`, `Rn.matrixTimesVector` (all already ported). |
| `isEquivalentPoints(p1, p2)` | 520–528 | Low | Tests projective equivalence by checking all 2×2 minors. Pure arithmetic. |
| `coordForDistance(d, metric)` | 227–233 | Trivial | Three-way switch: `tanh(d)`, `d`, `tan(d)`. |
| `norm(src, metric)` | 692–694 | Trivial | One-liner: `sqrt(abs(innerProduct(src, src, metric)))`. `normSquared` already exists in JS. |

### 1b. Vectorized overloads (trivial, loop-over-single wrappers)

| Java method | JS status |
|---|---|
| `dehomogenize(double[][] dst, double[][] src)` | Missing; loop over single `dehomogenize` |
| `homogenize(double[][] dst, double[][] src)` | Missing; loop over single `homogenize` |
| `polarize(double[][] polar, double[][] p, int metric)` | Missing; loop over single `polarize` |
| `setToLength(double[][] dst, double[][] src, double d, int metric)` | Missing; loop over single `setToLength` |

Per porting guideline 7, these should be collapsed into the existing single-array
functions using runtime dispatch on argument type (check `Array.isArray(src[0])`).

---

## 2. Behavioral Discrepancies in Existing Translations

These are cases where the JS port compiles and runs but does not match the Java
semantics for all inputs.  They are listed in order of likely impact.

### 2a. `innerProduct` — Euclidean special case

**Java** (lines 469–491):
```java
case EUCLIDEAN:
    if (!(ff == 1.0 || ff == 0.0))  sum /= ff;
    break;
```
When both homogeneous coordinates are non-trivial (not 0 or 1), Java divides
the dot product of the spatial components by the product of the homogeneous
coordinates.

**JS** (lines 195–200):
```javascript
return sum + metric * u[n] * v[n];
```
Since `metric = 0` for Euclidean, the last term vanishes — but the division by
`ff` is never performed.  This means the JS version gives wrong results for
Euclidean points that aren't already dehomogenized.

**Impact**: Any code that calls `innerProduct` on non-dehomogenized Euclidean
points (e.g. `[2, 4, 6, 2]` instead of `[1, 2, 3, 1]`) will get results that
are off by a factor of `w₁·w₂`.

### 2b. `innerProductPlanes` — Euclidean special case

**Java** (lines 501–507): For Euclidean metric, sums only the first `n-1`
components (ignores both the last component of each plane and does **not**
divide by anything).

**JS** (lines 209–211): Just calls `innerProduct`, which for Euclidean returns
the sum of all `n-1` spatial products (correct) but without the Euclidean
division (see 2a).  For planes this happens to be correct since the Java
Euclidean plane path doesn't divide either — but the code path is different and
could diverge if `innerProduct` is fixed.

### 2c. `projectToTangentSpace` — Euclidean special case

**Java** (lines 961–974): In the Euclidean case, calls `polarizePlane(result,
tangentToBe, metric)` which zeros out the last coordinate (projects to a
direction).

**JS** (lines 552–554): Delegates to `projectOntoComplement` for all metrics,
which uses `innerProduct` — missing the Euclidean special case.

### 2d. `setToLength` — Euclidean special case

**Java** (lines 983–997): Dehomogenizes first in the Euclidean case, computes
norm, scales, then resets `w = 1.0`.

**JS** (lines 231–243): Does not dehomogenize first; scales all components
uniformly.  Result differs for non-dehomogenized Euclidean inputs.

### 2e. `dragTowards` — different algorithm

**Java** (lines 404–424): For non-Euclidean metrics, normalizes, projects
direction into tangent space via `projectToTangentSpace`, then calls
`dragTangentVector`.

**JS** (lines 565–604): Uses `angleBetween` + `linearInterpolation` for
non-Euclidean.  This gives the same geodesic point for the basic case but
doesn't handle edge cases identically (e.g. antipodal points in elliptic
geometry).

---

## 3. Pn.js extras not in Pn.java

The JS file contains several utility functions that don't correspond to any
Java method in `Pn.java`:

`abs`, `isZero`, `manhattanNorm`, `manhattanNormDistance`, `completeBasis`,
`permutationMatrix`, `submatrix`, `mysqrt`, `inverse`, `times`, `equals`,
`isIdentityMatrix`, `copy`

Some of these (`inverse`, `times`, `mysqrt`) duplicate functionality in `Rn.js`
and could potentially be removed or aliased, but that is a separate cleanup
concern.

---

## 4. Feasibility Assessment

### Easy (< 30 min each)
- `coordForDistance` — 3-line switch
- `norm` — 1-liner wrapping `normSquared`
- `isEquivalentPoints` — pure arithmetic loop
- `barycentricCoordinates` — 5 lines using existing `Rn` operations
- All 4 vectorized overloads — loop wrappers with runtime dispatch
- `makeHarmonicHarmology`, `makeFlattenProjection` — one-line delegates

### Medium (30–60 min each)
- `dragTangentVector` (both overloads collapsed) — needs careful metric
  branching and the Euclidean `setToLength` + direction logic.  Depends on
  `setToLength` being correct (see discrepancy 2d).
- `projectivityFromCanonical` — matrix assembly + inverse + column scaling.
  Depends on `Rn.inverse` and `Rn.matrixTimesVector`.
- `projectivity` — trivial once `projectivityFromCanonical` is done
- `makeGeneralizedProjection` — outer-product formula, straightforward

### Challenges / risks
1. **Fixing `innerProduct` for Euclidean**: The Euclidean division-by-`ff`
   behavior is deeply embedded.  Changing it could fix downstream bugs but might
   also break code that has adapted to the current behavior.  This should be
   done carefully with test coverage.
2. **`projectToTangentSpace` Euclidean path**: Needs the `polarizePlane` call
   added back.  Low risk but should be tested against `DualizeSceneGraph` and
   similar consumers.
3. **`setToLength` Euclidean path**: Adding the dehomogenize-first logic changes
   observable behavior.  Existing callers may rely on the current (incorrect)
   behavior.
4. **`Rn.mysqrt` dependency**: `projectivityFromCanonical` in Java uses
   `Rn.mysqrt` (integer square root for dimension detection).  The JS `Pn.js`
   already has a `mysqrt` but it computes a signed floating-point square root,
   which is a different function.  Need to verify `Rn.mysqrt` exists and
   matches.

### Recommended order of work
1. Fix the behavioral discrepancies (2a–2d) first — these affect correctness of
   existing code.
2. Add the trivial missing methods (`norm`, `coordForDistance`,
   `isEquivalentPoints`, vectorized overloads).
3. Add `dragTangentVector` (needed for non-Euclidean navigation/animation).
4. Add `projectivityFromCanonical` + `projectivity` (needed for projective
   geometry applications).
5. Add `makeGeneralizedProjection` family (needed for projective
   transformations).
6. Add `barycentricCoordinates`.
