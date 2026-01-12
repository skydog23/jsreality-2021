This is a private todo list for me (a person named Charlie Gunn)

* 3.12.25 Change File->Export  options to be "Export Image" and "Export SVG". 
  * Export image opens up a file dialog box for saving the image. It allows user to specify type (png or jpeg), size, dimensions, save alpha flag, and file name.  There is a lock icon for fixed aspect ratio, and a flag to save dimensions to next invocation of the dialog. It should render into a new canvas and save the canvas.
  * Export SVG: Leave the existing export svg code.
  * To test the rendering of a given backend, use the Viewer menu to select that backend. Add a flag to the file dialog to use the current viewer (type) to generate the image.

* Revive Renderman backend? Partial progress made -- locally installed NCL.

* Conics: 
  * add 5-point SGC 
  * render line pairs and double lines correctly, 
  * create inspector

* WebGL backend: 
  * get perspective/orthographic working together
  * look into weird effects with shading 3D in orthographic mode
  * enforce 4D normals in GLSL shader to prepare for non-euclidean. For euclidean normals set w=0.
  * implement transparency enabled.
  * texture maps