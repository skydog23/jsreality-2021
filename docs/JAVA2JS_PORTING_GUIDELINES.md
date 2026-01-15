# JAVA → JS Porting Guidelines

The following directives govern how Java source is translated to JavaScript. **They are ordered by priority**: each rule overrides any lower-priority rule in case of conflict.

1. **Directive ordering by priority**  
   Directives in this document are listed from highest to lowest priority. When two directives appear to conflict, the one appearing earlier in this file takes precedence.

2. **File header template selection (jreality vs Charles Gunn)**  
   All translated JS files must use the correct top-of-file copyright header:
   - **From `jreality-2021` Java sources**: use the **“jReality” header** (credits the original jReality authors).
   - **From all other Charles Gunn Java sources**: use the **“Charles Gunn” header**.
   
   The canonical templates live in `docs/JS_FILE_HEADERS.md`.

3. **Copyright notice management**  
   The chosen header from Rule 2 must appear at the top of every translated JS file and should be preserved on subsequent edits. If a translated file is missing a header, add the correct template; otherwise, do not rewrite or “modernize” existing copyright text.  

4. **Import/export conventions (ESM)**  
   Use ESM named exports only (no default exports). For modules that export functions rather than a class/object, prefer namespace imports (e.g. `import * as Pn from './Pn.js'`). Re-export public APIs from the appropriate `index.js` barrel when one exists.  

5. **1:1 translation by default**  
   Java source code **must be translated 1:1 into JavaScript, without behavioral changes or refactorings**, unless either:
   - the user explicitly grants permission for an exception to this rule, or
   - a higher-priority directive in this document explicitly permits such a change.

6. **Static typing via JSDoc and tooling**  
   Because JavaScript lacks Java’s static type system, **all public APIs in translated code should be annotated with JSDoc** using concrete JS types (`number[]`, `number[][]`, `Float32Array`, `Float64Array`) and actual jsreality classes (e.g. `Quaternion`) when they exist. Avoid invented typedefs unless they are explicitly defined in a shared JSDoc file. Enable static checks (e.g. `// @ts-check` or `checkJs: true`) where feasible.

7. **Method overloading → single runtime-dispatch function**  
   Java method overloads **must be collapsed into a single JS function** that branches at runtime on argument count and/or types; the function keeps the Java name, and its JSDoc should describe the combined, overloaded signature using union types and optional parameters.

8. **Concurrency and locking → single-threaded event/listener patterns**  
   Where Java uses threads, synchronization, or locks (especially in listeners and event dispatch), the JS translation should **use simple single-threaded event/listener arrays without introducing additional asynchrony**, preserving the observable behavior but omitting Java’s concurrency primitives.

9. **AWT/Swing and other JVM-only types → minimal JS equivalents (Descriptors/Widgets for UI)**  
   Java AWT/Swing types and other JVM-only classes that have no direct browser/Node equivalent (e.g. `Color`, `Font`, `SwingConstants`, `JPanel`, `JButton`, `JFileChooser`) should be **replaced with simple JS equivalents or existing jsReality utility classes** that capture just the data and behavior actually used by the translated code.
   
   For Swing-style UI specifically, prefer jsReality’s Inspector utilities:
   - Use **Descriptor** objects (see `src/core/inspect/descriptors/`) to describe editable properties/controls.
   - Use existing **Widget** implementations (see `src/core/inspect/descriptors/widgets/`) instead of translating Swing components directly.
   
   Translated classes should generally remain **DOM-free model/controller logic**, emitting events and exposing state; UI is layered on via descriptors/widgets.

10. **Java collections and scene-data abstractions → JS arrays/typed arrays**  
   Java collections and `scene.data` abstractions should be represented as **plain JS arrays and/or typed arrays**, preserving iteration order and indexing semantics; helper utilities may be introduced to encapsulate repeated operations, but must not change the observable behavior of the original Java code.

11. **Numeric representation and performance**  
   Unless the Java code relies on specific integer-width behavior, numeric values should be represented as JS `number`s, with **`Float64Array` (or similar typed arrays) used for hot paths and matrix/vector data** where performance or memory layout matters, matching the intent of the original Java implementation.

12. **I/O, serialization hooks, and no-op infrastructure**  
   Java methods whose primary role is integration infrastructure (e.g. `startReader/finishWriter`, serialization hooks) and that have no direct runtime equivalent in the JS environment should **initially be translated as documented no-op stubs** unless a higher-priority rule, or explicit user instruction, calls for a more complete replacement.


