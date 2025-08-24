// JavaScript port of jReality's SceneGraphVisitor interface

/**
 * Interface for visiting scene graph nodes using the Visitor pattern.
 * Subclasses should implement visit methods for specific node types.
 * 
 * Note: If you want a visitor which visits all nodes in a scene graph,
 * your visitor will have to include something like the following code:
 * 
 * visitComponent(component) {
 *   // ... process component ...
 *   component.childrenAccept(this);
 *   // ... cleanup ...
 * }
 */
export class SceneGraphVisitor {

  /** @type {import('./SceneGraphNode.js').SceneGraphNode[]} */
  #currentPath = [];

  /**
   * Get the current path during traversal as an array of nodes
   * @returns {import('./SceneGraphNode.js').SceneGraphNode[]}
   */
  getCurrentPath() {
    return this.#currentPath;
  }

  /**
   * Push a node onto the current path
   * @param {import('./SceneGraphNode.js').SceneGraphNode} node
   */
  pushPath(node) {
    this.#currentPath.push(node);
  }

  /**
   * Pop a node from the current path
   * @returns {import('./SceneGraphNode.js').SceneGraphNode}
   */
  popPath() {
    return this.#currentPath.pop();
  }
  
  /**
   * Visit a generic SceneGraphNode
   * @param {import('./SceneGraphNode.js').SceneGraphNode} node
   */
  visit(node) {
    // Default implementation - subclasses should override
  }

  /**
   * Visit a SceneGraphComponent
   * @param {import('./SceneGraphComponent.js').SceneGraphComponent} component
   */
  visitComponent(component) {
    this.visit(component);
  }

  /**
   * Visit a Transformation
   * @param {import('./Transformation.js').Transformation} transformation
   */
  visitTransformation(transformation) {
    this.visit(transformation);
  }

  /**
   * Visit an Appearance
   * @param {import('./Appearance.js').Appearance} appearance
   */
  visitAppearance(appearance) {
    this.visit(appearance);
  }

  /**
   * Visit a Camera
   * @param {import('./Camera.js').Camera} camera
   */
  visitCamera(camera) {
    this.visit(camera);
  }

  /**
   * Visit a Geometry
   * @param {import('./Geometry.js').Geometry} geometry
   */
  visitGeometry(geometry) {
    this.visit(geometry);
  }

  /**
   * Visit a PointSet
   * @param {import('./PointSet.js').PointSet} pointSet
   */
  visitPointSet(pointSet) {
    this.visitGeometry(pointSet);
  }

  /**
   * Visit an IndexedLineSet
   * @param {import('./IndexedLineSet.js').IndexedLineSet} lineSet
   */
  visitIndexedLineSet(lineSet) {
    this.visitPointSet(lineSet);
  }

  /**
   * Visit an IndexedFaceSet
   * @param {import('./IndexedFaceSet.js').IndexedFaceSet} faceSet
   */
  visitIndexedFaceSet(faceSet) {
    this.visitIndexedLineSet(faceSet);
  }
}
