This is a private todo list for me (a person named Charlie Gunn)

* 3.12.25 Change File->Export  options to be "Export Image" and "Export SVG". 
** Export image opens up a file dialog box for saving the image. It allows user to specify type (png or jpeg), size, dimensions, save alpha flag, and file name.  There is a lock icon for fixed aspect ratio, and a flag to save dimensions to next invocation of the dialog. It should render into a new canvas and save the canvas.
** Export SVG: Leave the existing export svg code.
** To test the rendering of a given backend, use the Viewer menu to select that backend. Add a flag to the file dialog to use the current viewer (type) to generate the image. 

* Extend the scenegraph inspector with a tabbed pane and pack the SGI along with performance statistics and logger controls in separate tabs.

* Add separete copyright notice for charlesgunn packages (animation, projectiveGeometry)

* Add labels and borders to every nested list in the Descriptor tree


* ConicDemo/ConicUtils: browser runner can hit 404 on `decimal.mjs` because `src/core/math/Decimal.js` imports from `/node_modules/**` (not served by many static dev servers). Prefer loading Decimal via importmap + vendored ESM (like `mathjs`) or use a bundler; otherwise fall back to non-HP SVD.


