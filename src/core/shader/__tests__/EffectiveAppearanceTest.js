/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

// Tests for EffectiveAppearance hierarchical attribute resolution

import { EffectiveAppearance } from '../EffectiveAppearance.js';
import { Appearance, INHERITED, DEFAULT } from '../../scene/Appearance.js';
import { SceneGraphComponent } from '../../scene/SceneGraphComponent.js';
import { SceneGraphPath } from '../../scene/SceneGraphPath.js';
import { Color } from '../../util/Color.js';
import * as CommonAttributes from '../CommonAttributes.js';

describe('EffectiveAppearance', () => {

  describe('create', () => {
    test('creates empty root EffectiveAppearance', () => {
      const ea = EffectiveAppearance.create();
      expect(ea).toBeInstanceOf(EffectiveAppearance);
      expect(ea.getApp()).toBeInstanceOf(Appearance);
    });
  });

  describe('createFromPath', () => {
    test('creates EffectiveAppearance from path with no appearances', () => {
      const root = new SceneGraphComponent();
      const child = new SceneGraphComponent();
      root.addChild(child);
      
      const path = new SceneGraphPath(root, child);
      const ea = EffectiveAppearance.createFromPath(path);
      
      expect(ea).toBeInstanceOf(EffectiveAppearance);
    });

    test('creates EffectiveAppearance from path with appearances', () => {
      const root = new SceneGraphComponent();
      const rootApp = new Appearance('root-app');
      root.setAppearance(rootApp);
      
      const child = new SceneGraphComponent();
      const childApp = new Appearance('child-app');
      child.setAppearance(childApp);
      root.addChild(child);
      
      const path = new SceneGraphPath(root, child);
      const ea = EffectiveAppearance.createFromPath(path);
      
      expect(ea).toBeInstanceOf(EffectiveAppearance);
      const hierarchy = ea.getAppearanceHierarchy();
      expect(hierarchy.length).toBeGreaterThanOrEqual(2);
      expect(hierarchy[0]).toBe(childApp);
      expect(hierarchy[1]).toBe(rootApp);
    });
  });

  describe('createChild', () => {
    test('creates child EffectiveAppearance', () => {
      const ea = EffectiveAppearance.create();
      const childApp = new Appearance('child');
      const childEA = ea.createChild(childApp);
      
      expect(childEA).toBeInstanceOf(EffectiveAppearance);
      expect(childEA.getApp()).toBe(childApp);
    });
  });

  describe('getAttribute - basic resolution', () => {
    test('returns default value when attribute not found', () => {
      const ea = EffectiveAppearance.create();
      const value = ea.getAttribute('nonexistent', 42);
      expect(value).toBe(42);
    });

    test('returns attribute from root appearance', () => {
      const app = new Appearance();
      app.setAttribute('testKey', 'testValue');
      const ea = EffectiveAppearance.create().createChild(app);
      
      const value = ea.getAttribute('testKey', 'default');
      expect(value).toBe('testValue');
    });

    test('child attribute overrides parent', () => {
      const parentApp = new Appearance();
      parentApp.setAttribute('color', new Color(255, 0, 0));
      
      const childApp = new Appearance();
      childApp.setAttribute('color', new Color(0, 255, 0));
      
      const ea = EffectiveAppearance.create()
        .createChild(parentApp)
        .createChild(childApp);
      
      const value = ea.getAttribute('color', new Color(0, 0, 0));
      expect(value).toEqual(new Color(0, 255, 0));
    });

    test('inherits from parent when child does not have attribute', () => {
      const parentApp = new Appearance();
      parentApp.setAttribute('color', new Color(255, 0, 0));
      
      const childApp = new Appearance();
      // Child does not set 'color'
      
      const ea = EffectiveAppearance.create()
        .createChild(parentApp)
        .createChild(childApp);
      
      const value = ea.getAttribute('color', new Color(0, 0, 0));
      expect(value).toEqual(new Color(255, 0, 0));
    });
  });

  describe('getAttribute - namespace stripping', () => {
    test('finds attribute with exact namespaced key', () => {
      const app = new Appearance();
      app.setAttribute('point.diffuseColor', new Color(255, 0, 0));
      const ea = EffectiveAppearance.create().createChild(app);
      
      const value = ea.getAttribute('point.diffuseColor', new Color(0, 0, 0));
      expect(value).toEqual(new Color(255, 0, 0));
    });

    test('strips namespace to find base attribute', () => {
      const app = new Appearance();
      app.setAttribute('diffuseColor', new Color(255, 0, 0));
      const ea = EffectiveAppearance.create().createChild(app);
      
      // Query with namespace, but attribute has no namespace
      const value = ea.getAttribute('point.diffuseColor', new Color(0, 0, 0));
      expect(value).toEqual(new Color(255, 0, 0));
    });

    test('namespaced attribute overrides base attribute', () => {
      const app = new Appearance();
      app.setAttribute('diffuseColor', new Color(255, 0, 0)); // Base
      app.setAttribute('point.diffuseColor', new Color(0, 255, 0)); // Specific
      const ea = EffectiveAppearance.create().createChild(app);
      
      // Query with namespace should find specific version
      const value = ea.getAttribute('point.diffuseColor', new Color(0, 0, 0));
      expect(value).toEqual(new Color(0, 255, 0));
    });

    test('multi-level namespace stripping', () => {
      const app = new Appearance();
      app.setAttribute('baseAttr', 'base-value');
      const ea = EffectiveAppearance.create().createChild(app);
      
      // Query with deep namespace should strip to find base
      const value = ea.getAttribute('a.b.c.baseAttr', 'default');
      expect(value).toBe('base-value');
    });

    test('prefers more specific namespace over less specific', () => {
      const app = new Appearance();
      app.setAttribute('diffuseColor', new Color(255, 0, 0)); // Most general
      app.setAttribute('point.diffuseColor', new Color(0, 255, 0)); // Specific
      app.setAttribute('point.shader.diffuseColor', new Color(0, 0, 255)); // Most specific
      const ea = EffectiveAppearance.create().createChild(app);
      
      // Query with full namespace
      const value1 = ea.getAttribute('point.shader.diffuseColor', new Color(0, 0, 0));
      expect(value1).toEqual(new Color(0, 0, 255));
      
      // Query with partial namespace
      const value2 = ea.getAttribute('point.diffuseColor', new Color(0, 0, 0));
      expect(value2).toEqual(new Color(0, 255, 0));
      
      // Query with no namespace
      const value3 = ea.getAttribute('diffuseColor', new Color(0, 0, 0));
      expect(value3).toEqual(new Color(255, 0, 0));
    });
  });

  describe('getAttribute - hierarchical resolution with namespaces', () => {
    test('child namespaced attribute overrides parent base attribute', () => {
      const parentApp = new Appearance();
      parentApp.setAttribute('diffuseColor', new Color(255, 0, 0));
      
      const childApp = new Appearance();
      childApp.setAttribute('point.diffuseColor', new Color(0, 255, 0));
      
      const ea = EffectiveAppearance.create()
        .createChild(parentApp)
        .createChild(childApp);
      
      const value = ea.getAttribute('point.diffuseColor', new Color(0, 0, 0));
      expect(value).toEqual(new Color(0, 255, 0));
    });

    test('inherits parent namespaced attribute', () => {
      const parentApp = new Appearance();
      parentApp.setAttribute('point.diffuseColor', new Color(255, 0, 0));
      
      const childApp = new Appearance();
      // Child does not override
      
      const ea = EffectiveAppearance.create()
        .createChild(parentApp)
        .createChild(childApp);
      
      const value = ea.getAttribute('point.diffuseColor', new Color(0, 0, 0));
      expect(value).toEqual(new Color(255, 0, 0));
    });

    test('complex hierarchy with mixed namespace levels', () => {
      const grandparent = new Appearance('grandparent');
      grandparent.setAttribute('diffuseColor', new Color(100, 100, 100));
      
      const parent = new Appearance('parent');
      parent.setAttribute('point.diffuseColor', new Color(150, 150, 150));
      
      const child = new Appearance('child');
      child.setAttribute('line.diffuseColor', new Color(200, 200, 200));
      
      const ea = EffectiveAppearance.create()
        .createChild(grandparent)
        .createChild(parent)
        .createChild(child);
      
      // Point color comes from parent
      const pointColor = ea.getAttribute('point.diffuseColor', new Color(0, 0, 0));
      expect(pointColor).toEqual(new Color(150, 150, 150));
      
      // Line color comes from child
      const lineColor = ea.getAttribute('line.diffuseColor', new Color(0, 0, 0));
      expect(lineColor).toEqual(new Color(200, 200, 200));
      
      // Face color falls back to grandparent base
      const faceColor = ea.getAttribute('polygon.diffuseColor', new Color(0, 0, 0));
      expect(faceColor).toEqual(new Color(100, 100, 100));
    });
  });

  describe('getAppearanceHierarchy', () => {
    test('returns hierarchy from deepest to root', () => {
      const app1 = new Appearance('app1');
      const app2 = new Appearance('app2');
      const app3 = new Appearance('app3');
      
      const ea = EffectiveAppearance.create()
        .createChild(app1)
        .createChild(app2)
        .createChild(app3);
      
      const hierarchy = ea.getAppearanceHierarchy();
      
      expect(hierarchy.length).toBeGreaterThanOrEqual(3);
      expect(hierarchy[0]).toBe(app3); // Deepest first
      expect(hierarchy[1]).toBe(app2);
      expect(hierarchy[2]).toBe(app1);
    });
  });

  describe('matches', () => {
    test('matches path with corresponding appearances', () => {
      const root = new SceneGraphComponent();
      const rootApp = new Appearance('root-app');
      root.setAppearance(rootApp);
      
      const child = new SceneGraphComponent();
      const childApp = new Appearance('child-app');
      child.setAppearance(childApp);
      root.addChild(child);
      
      const path = new SceneGraphPath(root, child);
      const ea = EffectiveAppearance.createFromPath(path);
      
      expect(EffectiveAppearance.matches(ea, path)).toBe(true);
    });

    test('does not match path with different appearances', () => {
      const root = new SceneGraphComponent();
      const rootApp = new Appearance('root-app');
      root.setAppearance(rootApp);
      
      const child = new SceneGraphComponent();
      const childApp = new Appearance('child-app');
      child.setAppearance(childApp);
      root.addChild(child);
      
      const path = new SceneGraphPath(root, child);
      const ea = EffectiveAppearance.createFromPath(path);
      
      // Change the appearance
      child.setAppearance(new Appearance('different-app'));
      
      expect(EffectiveAppearance.matches(ea, path)).toBe(false);
    });
  });

  describe('toString', () => {
    test('returns string representation of appearance chain', () => {
      const app1 = new Appearance('app1');
      const app2 = new Appearance('app2');
      
      const ea = EffectiveAppearance.create()
        .createChild(app1)
        .createChild(app2);
      
      const str = ea.toString();
      
      expect(typeof str).toBe('string');
      expect(str).toContain('app2');
      expect(str).toContain('app1');
    });
  });

  describe('real-world usage scenarios', () => {
    test('CommonAttributes hierarchy with defaults', () => {
      const root = new SceneGraphComponent();
      const rootApp = new Appearance('root');
      rootApp.setAttribute(CommonAttributes.BACKGROUND_COLOR, new Color(200, 200, 200));
      rootApp.setAttribute(CommonAttributes.DIFFUSE_COLOR, new Color(100, 100, 100));
      root.setAppearance(rootApp);
      
      const pointsNode = new SceneGraphComponent();
      const pointsApp = new Appearance('points');
      pointsApp.setAttribute(CommonAttributes.POINT_SIZE, 5.0);
      pointsApp.setAttribute('point.' + CommonAttributes.DIFFUSE_COLOR, new Color(255, 0, 0));
      pointsNode.setAppearance(pointsApp);
      root.addChild(pointsNode);
      
      const path = new SceneGraphPath(root, pointsNode);
      const ea = EffectiveAppearance.createFromPath(path);
      
      // Point-specific color
      const pointColor = ea.getAttribute('point.' + CommonAttributes.DIFFUSE_COLOR, new Color(0, 0, 0));
      expect(pointColor).toEqual(new Color(255, 0, 0));
      
      // Point size
      const pointSize = ea.getAttribute(CommonAttributes.POINT_SIZE, 1.0);
      expect(pointSize).toBe(5.0);
      
      // Background inherited from root
      const bgColor = ea.getAttribute(CommonAttributes.BACKGROUND_COLOR, new Color(255, 255, 255));
      expect(bgColor).toEqual(new Color(200, 200, 200));
      
      // Line color falls back to root diffuseColor
      const lineColor = ea.getAttribute('line.' + CommonAttributes.DIFFUSE_COLOR, new Color(0, 0, 0));
      expect(lineColor).toEqual(new Color(100, 100, 100));
    });
  });

});

