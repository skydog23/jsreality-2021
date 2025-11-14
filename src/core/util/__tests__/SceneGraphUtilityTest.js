// Tests for SceneGraphUtility

import { SceneGraphUtility } from '../SceneGraphUtility.js';
import { SceneGraphComponent } from '../../scene/SceneGraphComponent.js';
import { SceneGraphPath } from '../../scene/SceneGraphPath.js';
import { Transformation } from '../../scene/Transformation.js';
import { Appearance } from '../../scene/Appearance.js';
import { PointSet } from '../../scene/PointSet.js';
import { Camera } from '../../scene/Camera.js';
import * as CommonAttributes from '../../shader/CommonAttributes.js';
import * as Pn from '../../math/Pn.js';

describe('SceneGraphUtility', () => {

  describe('createFullSceneGraphComponent', () => {
    test('creates component with transformation and appearance', () => {
      const comp = SceneGraphUtility.createFullSceneGraphComponent();
      expect(comp).toBeInstanceOf(SceneGraphComponent);
      expect(comp.getTransformation()).toBeInstanceOf(Transformation);
      expect(comp.getAppearance()).toBeInstanceOf(Appearance);
      expect(comp.getName()).toBe('unnamed');
    });

    test('creates component with custom name', () => {
      const comp = SceneGraphUtility.createFullSceneGraphComponent('test-node');
      expect(comp.getName()).toBe('test-node');
      expect(comp.getTransformation()).toBeInstanceOf(Transformation);
      expect(comp.getAppearance()).toBeInstanceOf(Appearance);
    });
  });

  describe('replaceChild', () => {
    test('adds child when parent has no children', () => {
      const parent = new SceneGraphComponent();
      const child = new SceneGraphComponent();
      
      SceneGraphUtility.replaceChild(parent, child);
      
      expect(parent.getChildComponentCount()).toBe(1);
      expect(parent.getChildComponent(0)).toBe(child);
    });

    test('replaces first child', () => {
      const parent = new SceneGraphComponent();
      const oldChild = new SceneGraphComponent();
      const newChild = new SceneGraphComponent();
      
      parent.addChild(oldChild);
      SceneGraphUtility.replaceChild(parent, newChild);
      
      expect(parent.getChildComponentCount()).toBe(1);
      expect(parent.getChildComponent(0)).toBe(newChild);
    });

    test('does nothing if child is already first', () => {
      const parent = new SceneGraphComponent();
      const child = new SceneGraphComponent();
      
      parent.addChild(child);
      SceneGraphUtility.replaceChild(parent, child);
      
      expect(parent.getChildComponentCount()).toBe(1);
      expect(parent.getChildComponent(0)).toBe(child);
    });
  });

  describe('removeChildren', () => {
    test('removes all children', () => {
      const parent = new SceneGraphComponent();
      parent.addChild(new SceneGraphComponent());
      parent.addChild(new SceneGraphComponent());
      parent.addChild(new SceneGraphComponent());
      
      expect(parent.getChildComponentCount()).toBe(3);
      
      SceneGraphUtility.removeChildren(parent);
      
      expect(parent.getChildComponentCount()).toBe(0);
    });

    test('handles empty parent', () => {
      const parent = new SceneGraphComponent();
      expect(parent.getChildComponentCount()).toBe(0);
      
      SceneGraphUtility.removeChildren(parent);
      
      expect(parent.getChildComponentCount()).toBe(0);
    });
  });

  describe('setMetric', () => {
    test('sets metric on existing appearance', () => {
      const comp = SceneGraphUtility.createFullSceneGraphComponent();
      
      SceneGraphUtility.setMetric(comp, Pn.HYPERBOLIC);
      
      const metric = comp.getAppearance().getAttribute(CommonAttributes.METRIC);
      expect(metric).toBe(Pn.HYPERBOLIC);
    });

    test('creates appearance if missing', () => {
      const comp = new SceneGraphComponent();
      expect(comp.getAppearance()).toBeNull();
      
      SceneGraphUtility.setMetric(comp, Pn.ELLIPTIC);
      
      expect(comp.getAppearance()).toBeInstanceOf(Appearance);
      const metric = comp.getAppearance().getAttribute(CommonAttributes.METRIC);
      expect(metric).toBe(Pn.ELLIPTIC);
    });
  });

  describe('getMetric', () => {
    test('finds metric in path', () => {
      const root = SceneGraphUtility.createFullSceneGraphComponent();
      root.getAppearance().setAttribute(CommonAttributes.METRIC, Pn.HYPERBOLIC);
      
      const child = new SceneGraphComponent();
      root.addChild(child);
      
      const path = new SceneGraphPath(root, child);
      const metric = SceneGraphUtility.getMetric(path);
      
      expect(metric).toBe(Pn.HYPERBOLIC);
    });

    test('returns EUCLIDEAN as default', () => {
      const comp = new SceneGraphComponent();
      const path = new SceneGraphPath(comp);
      
      const metric = SceneGraphUtility.getMetric(path);
      
      expect(metric).toBe(Pn.EUCLIDEAN);
    });

    test('finds metric from parent when child has none', () => {
      const root = SceneGraphUtility.createFullSceneGraphComponent();
      root.getAppearance().setAttribute(CommonAttributes.METRIC, Pn.ELLIPTIC);
      
      const child = new SceneGraphComponent();
      root.addChild(child);
      
      const grandchild = new SceneGraphComponent();
      child.addChild(grandchild);
      
      const path = new SceneGraphPath(root, child, grandchild);
      const metric = SceneGraphUtility.getMetric(path);
      
      expect(metric).toBe(Pn.ELLIPTIC);
    });
  });

  describe('getIndexOfChild', () => {
    test('finds child index', () => {
      const parent = new SceneGraphComponent();
      const child1 = new SceneGraphComponent();
      const child2 = new SceneGraphComponent();
      const child3 = new SceneGraphComponent();
      
      parent.addChild(child1);
      parent.addChild(child2);
      parent.addChild(child3);
      
      expect(SceneGraphUtility.getIndexOfChild(parent, child1)).toBe(0);
      expect(SceneGraphUtility.getIndexOfChild(parent, child2)).toBe(1);
      expect(SceneGraphUtility.getIndexOfChild(parent, child3)).toBe(2);
    });

    test('returns -1 for non-child', () => {
      const parent = new SceneGraphComponent();
      const child = new SceneGraphComponent();
      const notAChild = new SceneGraphComponent();
      
      parent.addChild(child);
      
      expect(SceneGraphUtility.getIndexOfChild(parent, notAChild)).toBe(-1);
    });
  });

  describe('addChildNode', () => {
    test('adds SceneGraphComponent', () => {
      const parent = new SceneGraphComponent();
      const child = new SceneGraphComponent();
      
      SceneGraphUtility.addChildNode(parent, child);
      
      expect(parent.getChildComponentCount()).toBe(1);
      expect(parent.getChildComponent(0)).toBe(child);
    });

    test('adds Appearance', () => {
      const parent = new SceneGraphComponent();
      const appearance = new Appearance();
      
      SceneGraphUtility.addChildNode(parent, appearance);
      
      expect(parent.getAppearance()).toBe(appearance);
    });

    test('adds Transformation', () => {
      const parent = new SceneGraphComponent();
      const transformation = new Transformation();
      
      SceneGraphUtility.addChildNode(parent, transformation);
      
      expect(parent.getTransformation()).toBe(transformation);
    });

    test('adds Geometry', () => {
      const parent = new SceneGraphComponent();
      const geometry = new PointSet(5);
      
      SceneGraphUtility.addChildNode(parent, geometry);
      
      expect(parent.getGeometry()).toBe(geometry);
    });

    test('adds Camera', () => {
      const parent = new SceneGraphComponent();
      const camera = new Camera();
      
      SceneGraphUtility.addChildNode(parent, camera);
      
      expect(parent.getCamera()).toBe(camera);
    });
  });

  describe('removeChildNode', () => {
    test('removes SceneGraphComponent', () => {
      const parent = new SceneGraphComponent();
      const child = new SceneGraphComponent();
      parent.addChild(child);
      
      SceneGraphUtility.removeChildNode(parent, child);
      
      expect(parent.getChildComponentCount()).toBe(0);
    });

    test('removes Appearance', () => {
      const parent = new SceneGraphComponent();
      const appearance = new Appearance();
      parent.setAppearance(appearance);
      
      SceneGraphUtility.removeChildNode(parent, appearance);
      
      expect(parent.getAppearance()).toBeNull();
    });

    test('removes Transformation', () => {
      const parent = new SceneGraphComponent();
      const transformation = new Transformation();
      parent.setTransformation(transformation);
      
      SceneGraphUtility.removeChildNode(parent, transformation);
      
      expect(parent.getTransformation()).toBeNull();
    });

    test('removes Geometry', () => {
      const parent = new SceneGraphComponent();
      const geometry = new PointSet(5);
      parent.setGeometry(geometry);
      
      SceneGraphUtility.removeChildNode(parent, geometry);
      
      expect(parent.getGeometry()).toBeNull();
    });

    test('throws error if node is not a child', () => {
      const parent = new SceneGraphComponent();
      const notAChild = new SceneGraphComponent();
      
      expect(() => {
        SceneGraphUtility.removeChildNode(parent, notAChild);
      }).toThrow('no such child!');
    });
  });

  describe('getFirstGeometry', () => {
    test('finds geometry directly on component', () => {
      const comp = new SceneGraphComponent();
      const geom = new PointSet(5);
      comp.setGeometry(geom);
      
      const found = SceneGraphUtility.getFirstGeometry(comp);
      
      expect(found).toBe(geom);
    });

    test('finds geometry in children', () => {
      const root = new SceneGraphComponent();
      const child = new SceneGraphComponent();
      const geom = new PointSet(5);
      
      root.addChild(child);
      child.setGeometry(geom);
      
      const found = SceneGraphUtility.getFirstGeometry(root);
      
      expect(found).toBe(geom);
    });

    test('finds first geometry in depth-first order', () => {
      const root = new SceneGraphComponent();
      const child1 = new SceneGraphComponent();
      const child2 = new SceneGraphComponent();
      const geom1 = new PointSet(3);
      const geom2 = new PointSet(5);
      
      root.addChild(child1);
      root.addChild(child2);
      child1.setGeometry(geom1);
      child2.setGeometry(geom2);
      
      const found = SceneGraphUtility.getFirstGeometry(root);
      
      expect(found).toBe(geom1);
    });

    test('returns null if no geometry found', () => {
      const comp = new SceneGraphComponent();
      
      const found = SceneGraphUtility.getFirstGeometry(comp);
      
      expect(found).toBeNull();
    });
  });

  describe('findDeepestAppearance', () => {
    test('finds appearance on last component', () => {
      const root = new SceneGraphComponent();
      const child = SceneGraphUtility.createFullSceneGraphComponent();
      root.addChild(child);
      
      const path = new SceneGraphPath(root, child);
      const found = SceneGraphUtility.findDeepestAppearance(path);
      
      expect(found).toBe(child.getAppearance());
    });

    test('finds appearance on parent when child has none', () => {
      const root = SceneGraphUtility.createFullSceneGraphComponent();
      const child = new SceneGraphComponent();
      root.addChild(child);
      
      const path = new SceneGraphPath(root, child);
      const found = SceneGraphUtility.findDeepestAppearance(path);
      
      expect(found).toBe(root.getAppearance());
    });

    test('returns null if no appearance in path', () => {
      const comp = new SceneGraphComponent();
      const path = new SceneGraphPath(comp);
      
      const found = SceneGraphUtility.findDeepestAppearance(path);
      
      expect(found).toBeNull();
    });
  });

});

