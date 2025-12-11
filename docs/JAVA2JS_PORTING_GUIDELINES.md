# JAVA → JS Porting Guidelines

The following directives govern how Java source is translated to JavaScript. **They are ordered by priority**: each rule overrides any lower-priority rule in case of conflict.

1. **Directive ordering by priority**  
   Directives in this document are listed from highest to lowest priority. When two directives appear to conflict, the one appearing earlier in this file takes precedence.

2. **1:1 translation by default**  
   Java source code **must be translated 1:1 into JavaScript, without behavioral changes or refactorings**, unless either:
   - the user explicitly grants permission for an exception to this rule, or
   - a higher-priority directive in this document explicitly permits such a change.

3. **Static typing via JSDoc and tooling**  
   Because JavaScript lacks Java’s static type system, **all public APIs in translated code should be annotated with JSDoc**, using shared typedefs (e.g. `Matrix4`, `Vec3`, `Vec4`, `Quaternion`, `Metric`) to mirror the Java types, and projects should enable static checks (e.g. `// @ts-check` or `checkJs: true`) so that type errors are caught similarly to Java.

4. **Method overloading → single runtime-dispatch function**  
   Java method overloads **must be collapsed into a single JS function** that branches at runtime on argument count and/or types; the function keeps the Java name, and its JSDoc should describe the combined, overloaded signature using union types and optional parameters.

5. **Concurrency and locking → single-threaded event/listener patterns**  
   Where Java uses threads, synchronization, or locks (especially in listeners and event dispatch), the JS translation should **use simple single-threaded event/listener arrays without introducing additional asynchrony**, preserving the observable behavior but omitting Java’s concurrency primitives.

6. **AWT/Swing and other JVM-only types → minimal JS equivalents**  
   Java AWT/Swing types and other JVM-only classes that have no direct browser/Node equivalent (e.g. `Color`, `Font`, `SwingConstants`) should be **replaced with simple JS equivalents or existing jsReality utility classes** that capture just the data and behavior actually used by the translated code.

7. **Java collections and scene-data abstractions → JS arrays/typed arrays**  
   Java collections and `scene.data` abstractions should be represented as **plain JS arrays and/or typed arrays**, preserving iteration order and indexing semantics; helper utilities may be introduced to encapsulate repeated operations, but must not change the observable behavior of the original Java code.

8. **Numeric representation and performance**  
   Unless the Java code relies on specific integer-width behavior, numeric values should be represented as JS `number`s, with **`Float64Array` (or similar typed arrays) used for hot paths and matrix/vector data** where performance or memory layout matters, matching the intent of the original Java implementation.

9. **I/O, serialization hooks, and no-op infrastructure**  
   Java methods whose primary role is integration infrastructure (e.g. `startReader/finishWriter`, serialization hooks) and that have no direct runtime equivalent in the JS environment should **initially be translated as documented no-op stubs** unless a higher-priority rule, or explicit user instruction, calls for a more complete replacement.
