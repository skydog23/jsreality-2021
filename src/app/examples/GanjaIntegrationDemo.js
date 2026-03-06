/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

/**
 * Demo showing PGA points, lines, and segments rendered via GanjaAdapter
 * into a jsReality viewer, with a live code editor in the inspector panel.
 */

import { GanjaAdapter } from '../../ganja/GanjaAdapter.js';
import { loadAlgebra } from '../../ganja/loadAlgebra.js';
import { DescriptorType } from '../../core/inspect/descriptors/DescriptorTypes.js';
import { RotateTool } from '../../core/tools/RotateTool.js';
import * as CommonAttributes from '../../core/shader/CommonAttributes.js';
import { Color } from '../../core/util/Color.js';
import { SceneGraphUtility } from '../../core/util/SceneGraphUtility.js';
import { JSRApp } from '../JSRApp.js';

const Algebra = await loadAlgebra();
const PGA3D = Algebra(3, 0, 1);

const DEFAULT_CODE = `\
// PGA 3D: points, lines, segments, subtrees, appearances, transforms
var p1 = 1e123 + 0.5e012,
    p2 = 1e123 - 0.8e023,
    p3 = 1e123 + 0.6e013 - 0.4e023,
    p4 = 1e123 - 0.3e012 + 0.2e013 + 0.5e023;

var L1 = p1 & p2,
    L2 = p3 & p4;

// Motors: translation and rotation
var T = 1 + 0.5*1e01 + 0.25*1e02;
var R = Math.cos(Math.PI/6) + Math.sin(Math.PI/6)*1e12;

return [
  // Red points and blue line at root level
  0xff0000, p1, p2,
  0x0088ff, L1,

  // Nested array = green subtree (own color scope)
  [0x00cc44, p3, p4, L2],

  // Segment at root (orange)
  0xff8800, [p1, p3],

  // Transformed group: translate the points
  {
    name: "translated",
    transform: T,
    children: [0xcc00ff, p1, p2, p3]
  },

  // Appearance override: thicker tubes for subsequent geometry
  { appearance: { "lineShader.tubeRadius": 0.04 } },
  0xffcc00, L1,

  // Rotated group with custom appearance
  {
    name: "rotated",
    transform: R,
    appearance: {
      "pointShader.pointRadius": 0.06,
      "lineShader.tubeRadius": 0.005
    },
    children: [0x00ffcc, p4, L2, [p2, p4]]
  }
];`;

export class GanjaIntegrationDemo extends JSRApp {

    _code = DEFAULT_CODE;
    _adapter = new GanjaAdapter(PGA3D, { clip: 3, pointRadius: 0.04, tubeRadius: 0.015 });
    _contentSGC = null;
    _status = '';

    getHelpSummary() {
        return 'PGA points, lines, and segments rendered via the GanjaAdapter bridge into jsReality.';
    }

    getContent() {
        this._contentSGC = SceneGraphUtility.createFullSceneGraphComponent('ganja-content');
        this._contentSGC.addTool(new RotateTool());
        this._runCode();
        return this._contentSGC;
    }

    _runCode() {
        try {
            const userFn = new Function(this._code);
            const translated = PGA3D.inline(userFn);
            const elements = translated();
            if (!Array.isArray(elements)) {
                throw new Error('Code must return an array of PGA elements');
            }
            const scene = this._adapter.buildScene(elements);

            this._contentSGC.removeAllChildren();
            this._contentSGC.setGeometry(null);
            for (const child of scene.getChildComponents()) {
                this._contentSGC.addChild(child);
            }
            const ap = scene.getAppearance();
            if (ap) {
                for (const [key, val] of ap.getAttributes()) {
                    this._contentSGC.getAppearance().setAttribute(key, val);
                }
            }

            this._status = 'OK';
            this.getViewer()?.render();
        } catch (e) {
            this._status = e.message;
            console.error('GanjaIntegrationDemo: code evaluation failed:', e);
        }
    }

    display() {
        super.display();
        this.setup3DCamera();
        const rootAp = this.getViewer().getSceneRoot().getAppearance();
        rootAp.setAttribute(CommonAttributes.BACKGROUND_COLOR, new Color(30, 30, 40));
        this.getViewer().render();
    }

    getInspectorDescriptors() {
        return [
            {
                type: DescriptorType.TEXTAREA,
                label: 'PGA Code',
                rows: 20,
                placeholder: 'Enter PGA code using ganja operator syntax...',
                getValue: () => this._code,
                setValue: (v) => { this._code = v; }
            },
            {
                type: DescriptorType.BUTTON,
                label: 'Run',
                variant: 'primary',
                action: () => { this._runCode(); }
            },
            {
                type: DescriptorType.LIVE_LABEL,
                label: 'Status',
                getValue: () => this._status,
                updateIntervalMs: 500
            }
        ];
    }
}
