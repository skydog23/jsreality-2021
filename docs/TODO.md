This is a private todo list for me (a person named Charlie Gunn)

* 3.12.25 Change File->Export  options to be "Export Image" and "Export SVG". 
  * Export image opens up a file dialog box for saving the image. It allows user to specify type (png or jpeg), size, dimensions, save alpha flag, and file name.  There is a lock icon for fixed aspect ratio, and a flag to save dimensions to next invocation of the dialog. It should render into a new canvas and save the canvas.
  * Export SVG: Leave the existing export svg code.
  * To test the rendering of a given backend, use the Viewer menu to select that backend. Add a flag to the file dialog to use the current viewer (type) to generate the image.

* Revive Renderman backend?

* Conics: 
  * add 5-point SGC 
  * render line pairs and double lines correctly, 
  * create inspector

* Tools / input smoothing:
  * Current: `RotateTool` implements quaternion-based exponential smoothing (half-life).
  * Consider: implement an optional `VirtualSmoothing` virtual device in the tool system (slot-level damping, configurable in tool config JSON) so smoothing can be applied globally/per-slot without editing each tool; still allow per-tool overrides for “feel”.