/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

import { Color } from '../util/Color.js';

/**
 * The default fog shader for jReality/jsReality.
 *
 * This shader controls scene-wide fog that blends geometry with a fog color
 * based on view-space distance. It improves on the classic OpenGL fog model
 * by offering smoothstep blending, radial distance, two-color atmospheric
 * perspective, and (future) height-based fog.
 *
 * ## Curve Modes
 *
 * - 0 = linear:  `f = (end - dist) / (end - begin)`
 * - 1 = smooth:  `f = 1 - smoothstep(begin, end, dist)`  (default, recommended)
 * - 2 = exp:     `f = exp(-density * dist)`
 * - 3 = exp2:    `f = exp(-(density * dist)^2)`
 *
 * ## Distance Metrics
 *
 * - 0 = radial:  `dist = length(viewPos)`   (default, physically correct)
 * - 1 = planar:  `dist = abs(viewPos.z)`    (classic GL behavior)
 *
 * ## Attribute Schema
 *
 * Attributes are namespaced under `fogShader.*` on the root Appearance:
 *
 * ```javascript
 * rootAppearance.setAttribute('fogShader', 'default');
 * rootAppearance.setAttribute('fogShader.enabled', true);
 * rootAppearance.setAttribute('fogShader.color', new Color(200, 210, 220));
 * rootAppearance.setAttribute('fogShader.curve', 1);
 * rootAppearance.setAttribute('fogShader.begin', 5.0);
 * rootAppearance.setAttribute('fogShader.end', 50.0);
 * ```
 *
 * @module DefaultFogShader
 */
export const DefaultFogShader = {
  type: 'DefaultFogShader',
  extends: 'FogShader',

  ATTRIBUTES: [
    'enabled',
    'color',
    'farColor',
    'begin',
    'end',
    'density',
    'curve',
    'distanceMetric',
    'heightEnabled',
    'heightOrigin',
    'heightFalloff'
  ],

  ENABLED_DEFAULT: false,
  COLOR_DEFAULT: new Color(200, 210, 220),
  FAR_COLOR_DEFAULT: null,
  BEGIN_DEFAULT: 1.0,
  END_DEFAULT: 30.0,
  DENSITY_DEFAULT: 0.08,
  /** 0=linear, 1=smooth(step), 2=exp, 3=exp2 */
  CURVE_DEFAULT: 1,
  /** 0=radial, 1=planar */
  DISTANCE_METRIC_DEFAULT: 0,
  HEIGHT_ENABLED_DEFAULT: false,
  HEIGHT_ORIGIN_DEFAULT: 0.0,
  HEIGHT_FALLOFF_DEFAULT: 1.0,

  /**
   * @param {string} attribute
   * @returns {*} Default value, or undefined
   */
  getDefault(attribute) {
    const map = {
      enabled: this.ENABLED_DEFAULT,
      color: this.COLOR_DEFAULT,
      farColor: this.FAR_COLOR_DEFAULT,
      begin: this.BEGIN_DEFAULT,
      end: this.END_DEFAULT,
      density: this.DENSITY_DEFAULT,
      curve: this.CURVE_DEFAULT,
      distanceMetric: this.DISTANCE_METRIC_DEFAULT,
      heightEnabled: this.HEIGHT_ENABLED_DEFAULT,
      heightOrigin: this.HEIGHT_ORIGIN_DEFAULT,
      heightFalloff: this.HEIGHT_FALLOFF_DEFAULT
    };
    return map[attribute];
  },

  hasAttribute(attribute) {
    return this.ATTRIBUTES.includes(attribute);
  },

  getAllDefaults() {
    return {
      enabled: this.ENABLED_DEFAULT,
      color: this.COLOR_DEFAULT,
      farColor: this.FAR_COLOR_DEFAULT,
      begin: this.BEGIN_DEFAULT,
      end: this.END_DEFAULT,
      density: this.DENSITY_DEFAULT,
      curve: this.CURVE_DEFAULT,
      distanceMetric: this.DISTANCE_METRIC_DEFAULT,
      heightEnabled: this.HEIGHT_ENABLED_DEFAULT,
      heightOrigin: this.HEIGHT_ORIGIN_DEFAULT,
      heightFalloff: this.HEIGHT_FALLOFF_DEFAULT
    };
  },

  /**
   * Placeholder for future pluggable GLSL support.
   * Returns null to indicate the renderer should use its built-in fog GLSL.
   * A custom FogShader could override this to provide a GLSL function body.
   * @returns {string|null}
   */
  getGLSLSnippet() {
    return null;
  }
};
