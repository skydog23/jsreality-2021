// Utility for building scene graph paths

import { SceneGraphPath } from '../scene/SceneGraphPath.js';
import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';

/**
 * Utility class for building scene graph paths
 */
export class PathBuilder {
  /**
   * Build a SceneGraphPath from root to the given component
   * @param {SceneGraphComponent} root - The root component
   * @param {SceneGraphComponent} component - The target component
   * @returns {SceneGraphPath|null} The path, or null if component not found
   */
  static buildPathToComponent(root, component) {
    if (!root) return null;
    
    const path = [];
    
    // Helper function to search recursively
    const findComponent = (node, target) => {
      if (node instanceof SceneGraphComponent) {
        path.push(node);
        
        if (node === target) {
          return true;
        }
        
        // Search children
        for (const child of node.getChildComponents()) {
          if (findComponent(child, target)) {
            return true;
          }
        }
        
        path.pop();
      }
      
      return false;
    };
    
    if (findComponent(root, component)) {
      return new SceneGraphPath(path);
    }
    
    return null;
  }
}

