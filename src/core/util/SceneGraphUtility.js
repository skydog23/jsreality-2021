// JavaScript port of jReality's SceneGraphUtility class
// Static utility methods for scene graph manipulation and traversal

import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';
import { SceneGraphVisitor } from '../scene/SceneGraphVisitor.js';
import { Transformation } from '../scene/Transformation.js';
import { Appearance } from '../scene/Appearance.js';
import * as CommonAttributes from '../shader/CommonAttributes.js';
import * as Pn from '../math/Pn.js';

/** @typedef {import('../scene/SceneGraphNode.js').SceneGraphNode} SceneGraphNode */
/** @typedef {import('../scene/SceneGraphPath.js').SceneGraphPath} SceneGraphPath */
/** @typedef {import('../scene/Geometry.js').Geometry} Geometry */
/** @typedef {import('../scene/Camera.js').Camera} Camera */

/**
 * Static utility methods for scene graph manipulation and traversal.
 * Provides convenience methods for common scene graph operations.
 */
export class SceneGraphUtility {

  /**
   * Allocate and return an instance of SceneGraphComponent fitted out with 
   * an instance of Transformation and Appearance.
   * @param {string} [name='unnamed'] - The name for the component (defaults to 'unnamed')
   * @returns {SceneGraphComponent} A component with Transformation and Appearance
   */
  static createFullSceneGraphComponent(name = 'unnamed') {
    const c = new SceneGraphComponent();
    c.setTransformation(new Transformation());
    c.setAppearance(new Appearance());
    c.setName(name);
    return c;
  }

  /**
   * Replace the first child with the given component.
   * If there are no children, adds the component.
   * @param {SceneGraphComponent} parent - The parent component
   * @param {SceneGraphComponent} child - The new child component
   */
  static replaceChild(parent, child) {
    const n = parent.getChildComponentCount();
    if (n === 0) {
      parent.addChild(child);
      return;
    }
    const oldChild = parent.getChildComponent(0);
    if (oldChild === child) return;
    parent.removeChild(oldChild);
    parent.addChild(child);
  }

  /**
   * Remove all children (i.e., instances of SceneGraphComponent) from this node.
   * Note: In Java this uses Scene.executeWriter for thread safety, but JavaScript
   * doesn't require this due to its single-threaded event loop.
   * 
   * TODO: this should be called removeChildComponents!
   * @param {SceneGraphComponent} component - The component to remove children from
   */
  static removeChildren(component) {
    while (component.getChildComponentCount() > 0) {
      component.removeChild(component.getChildComponent(0));
    }
  }

  /**
   * Set the metric of this sub-graph by setting the appearance attribute
   * CommonAttributes.METRIC.
   * @param {SceneGraphComponent} root - The root component
   * @param {number} metric - The metric constant (from Pn: EUCLIDEAN, HYPERBOLIC, ELLIPTIC)
   */
  static setMetric(root, metric) {
    if (root.getAppearance() === null) {
      root.setAppearance(new Appearance());
    }
    root.getAppearance().setAttribute(CommonAttributes.METRIC, metric);
  }

  /**
   * Return the metric at the end of the path by evaluating effective appearance
   * for the attribute CommonAttributes.METRIC.
   * 
   * Note: This requires EffectiveAppearance which hasn't been translated yet.
   * For now, this is a placeholder that searches up the path manually.
   * 
   * @param {SceneGraphPath} sgp - The scene graph path
   * @returns {number} The metric (defaults to Pn.EUCLIDEAN if not found)
   */
  static getMetric(sgp) {
    // TODO: Replace with proper EffectiveAppearance once translated
    // For now, search up the path for the first METRIC attribute
    const components = sgp.toArray();
    for (let i = components.length - 1; i >= 0; i--) {
      const node = components[i];
      if (node instanceof SceneGraphComponent) {
        const app = node.getAppearance();
        if (app !== null) {
          const metric = app.getAttribute(CommonAttributes.METRIC);
          if (metric !== undefined && metric !== null) {
            return metric;
          }
        }
      }
    }
    return Pn.EUCLIDEAN;
  }

  /**
   * Remove a child of arbitrary type.
   * @param {SceneGraphComponent} parent - The parent component
   * @param {SceneGraphNode} node - The child node to remove
   * @throws {Error} If node is not a child
   */
  static removeChildNode(parent, node) {
    // Use visitor pattern to determine node type and remove appropriately
    const visitor = new SceneGraphVisitor();
    
    visitor.visitAppearance = (a) => {
      if (parent.getAppearance() === a) {
        parent.setAppearance(null);
      } else {
        throw new Error('no such child!');
      }
    };

    visitor.visitCamera = (c) => {
      if (parent.getCamera() === c) {
        parent.setCamera(null);
      } else {
        throw new Error('no such child!');
      }
    };

    visitor.visitGeometry = (g) => {
      if (parent.getGeometry() === g) {
        parent.setGeometry(null);
      } else {
        throw new Error('no such child!');
      }
    };

    visitor.visitLight = (l) => {
      if (parent.getLight() === l) {
        parent.setLight(null);
      } else {
        throw new Error('no such child!');
      }
    };

    visitor.visitTransformation = (t) => {
      if (parent.getTransformation() === t) {
        parent.setTransformation(null);
      } else {
        throw new Error('no such child!');
      }
    };

    visitor.visitComponent = (c) => {
      const children = parent.getChildNodes();
      if (children.includes(c)) {
        parent.removeChild(c);
      } else {
        throw new Error('no such child!');
      }
    };

    node.accept(visitor);
  }

  /**
   * Method to add a child of arbitrary type.
   * @param {SceneGraphComponent} parent - The parent component
   * @param {SceneGraphNode} node - The child node to add
   */
  static addChildNode(parent, node) {
    // Use visitor pattern to determine node type and add appropriately
    const visitor = new SceneGraphVisitor();
    
    visitor.visitAppearance = (a) => {
      parent.setAppearance(a);
    };

    visitor.visitCamera = (c) => {
      parent.setCamera(c);
    };

    visitor.visitGeometry = (g) => {
      parent.setGeometry(g);
    };

    visitor.visitLight = (l) => {
      parent.setLight(l);
    };

    visitor.visitTransformation = (t) => {
      parent.setTransformation(t);
    };

    visitor.visitComponent = (c) => {
      parent.addChild(c);
    };

    node.accept(visitor);
  }

  /**
   * Linear search for the index of child in childlist of parent.
   * @param {SceneGraphComponent} parent - The parent component
   * @param {SceneGraphComponent} child - The child to find
   * @returns {number} Index of child, or -1 if not found
   */
  static getIndexOfChild(parent, child) {
    const count = parent.getChildComponentCount();
    for (let i = 0; i < count; i++) {
      if (parent.getChildComponent(i) === child) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Get the first geometry found in the scene graph starting at the given component.
   * Performs depth-first search.
   * @param {SceneGraphComponent} sgc - The root component to search from
   * @returns {Geometry|null} The first geometry found, or null
   */
  static getFirstGeometry(sgc) {
    class GetFirstGeometryVisitor extends SceneGraphVisitor {
      constructor() {
        super();
        this.found = false;
        this.geom = null;
      }

      visitGeometry(g) {
        if (this.found) return;
        this.geom = g;
        this.found = true;
      }

      visitComponent(c) {
        if (this.found) return;
        c.childrenAccept(this);
      }

      getGeometry() {
        return this.geom;
      }
    }

    const visitor = new GetFirstGeometryVisitor();
    visitor.visit(sgc);
    return visitor.getGeometry();
  }

  /**
   * A convenience method to find the deepest occurrence of an Appearance
   * in an instance of SceneGraphPath.
   * Searches from the end of the path backwards.
   * @param {SceneGraphPath} thePath - The scene graph path
   * @returns {Appearance|null} The deepest appearance found, or null
   */
  static findDeepestAppearance(thePath) {
    let selectedAppearance = null;
    
    // Iterate from end to beginning of path
    const pathArray = thePath.toArray();
    for (let i = pathArray.length - 1; i >= 0; i--) {
      const element = pathArray[i];
      if (element !== null) {
        if (element instanceof Appearance) {
          selectedAppearance = element;
        } else if (element instanceof SceneGraphComponent) {
          selectedAppearance = element.getAppearance();
        }
        if (selectedAppearance !== null) {
          break;
        }
      }
    }
    
    return selectedAppearance;
  }

  // ========================================================================
  // Methods requiring additional classes (commented out for Phase 2/3)
  // ========================================================================

  /**
   * Return list of paths from rootNode to an instance of Light.
   * Requires: LightCollector visitor class
   * @param {SceneGraphComponent} rootNode
   * @returns {SceneGraphPath[]}
   */
  // static collectLights(rootNode) {
  //   return new LightCollector(rootNode).visit();
  // }

  /**
   * Return list of paths from rootNode to an instance of ClippingPlane.
   * Requires: ClippingPlaneCollector visitor class, ClippingPlane class
   * @param {SceneGraphComponent} rootNode
   * @returns {SceneGraphPath[]}
   */
  // static collectClippingPlanes(rootNode) {
  //   return new ClippingPlaneCollector(rootNode).visit();
  // }

  /**
   * Get all paths between begin and end nodes.
   * Requires: PathCollector visitor class
   * @param {SceneGraphComponent} begin
   * @param {SceneGraphNode} end
   * @returns {SceneGraphPath[]}
   */
  // static getPathsBetween(begin, end) {
  //   const matcher = (p) => p.getLastElement() === end;
  //   return new PathCollector(matcher, begin).visit();
  // }

  /**
   * Find and return all paths from root to node with given name.
   * Requires: PathCollector visitor class
   * @param {SceneGraphComponent} root
   * @param {string} name
   * @returns {SceneGraphPath[]}
   */
  // static getPathsToNamedNodes(root, name) {
  //   const matcher = (p) => p.getLastElement().getName() === name;
  //   return new PathCollector(matcher, root).visit();
  // }

  /**
   * Return a copy of the scene graph node template.
   * For a SceneGraphComponent, it does not include copies of the children.
   * Requires: CopyVisitor class
   * @template {SceneGraphNode} T
   * @param {T} template
   * @returns {T} The copy
   */
  // static copy(template) {
  //   const cv = new CopyVisitor();
  //   template.accept(cv);
  //   return cv.getCopy();
  // }

  /**
   * Apply transformations recursively to all instances of PointSet and
   * produce a flat scene graph with no transformations.
   * This is a complex method requiring careful testing.
   * Requires: Full data attribute system, Sphere class
   * @param {SceneGraphComponent} sgc
   * @param {boolean} rejectInvis - If true, non-visible components are skipped
   * @param {boolean} removeTform - If true, transformations are removed
   * @returns {SceneGraphComponent}
   */
  // static flatten(sgc, rejectInvis = false, removeTform = true) {
  //   // TODO: Implement in Phase 3
  //   throw new Error('flatten() not yet implemented');
  // }

  /**
   * Remove all lights from the viewer's scene graph.
   * Requires: Light class, collectLights()
   * @param {import('../scene/Viewer.js').Viewer} viewer
   */
  // static removeLights(viewer) {
  //   const root = viewer.getSceneRoot();
  //   const lightPaths = SceneGraphUtility.collectLights(root);
  //   for (const sgp of lightPaths) {
  //     const light = sgp.getLastElement();
  //     const lightNode = sgp.getLastComponent();
  //     lightNode.setLight(null);
  //   }
  // }
}

