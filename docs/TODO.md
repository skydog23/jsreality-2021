This is a private todo list for me (a person named Charlie Gunn)

* Go through jsreality-2021 and refactor method overloads so names match 1:1 Java versions.
    * Look at the many variations in IndexedLineSetUtility of createCurve...() methods and see whether it might be possible to reduce the number of related methods by using optional arguments "foo: initvalue", since that's what many of the variants are doing: setting a default value for some parameter.

* ConicDemo/ConicUtils: browser runner can hit 404 on `decimal.mjs` because `src/core/math/Decimal.js` imports from `/node_modules/**` (not served by many static dev servers). Prefer loading Decimal via importmap + vendored ESM (like `mathjs`) or use a bundler; otherwise fall back to non-HP SVD.

* look at ganja.js and ask AI to convert it to readable JS, perhaps build it out to a genuine GA package.

* look at GeoGebra source code project and investigate whether I can swap out the "backend" for jsreality pure projective approach

* investigate adding an interactive js shell window to jsreality to allow interactive building up of scene graph.

* combine the github pages in its current "pass through" form with the Hugo organic-geometry project to combine the best of both worlds: e-books, Penrose case studies, 

* Have the AI create a table/list of all registered InputSlots and what their getTransformation() returns.

* Add JSRViewer.display() static method so the jreality tutorial folder can be directly ported.

* Port DualizeSceneGraph.java


