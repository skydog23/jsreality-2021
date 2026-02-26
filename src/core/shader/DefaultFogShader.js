/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

import * as CA from './CommonAttributes.js';

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
 * Fog attributes use the constants from CommonAttributes and can be set
 * directly on the root Appearance.  The EffectiveAppearance namespace-
 * stripping mechanism matches these when queried under the `fogShader.*`
 * prefix.
 *
 * ```javascript
 * import * as CA from './CommonAttributes.js';
 * rootAppearance.setAttribute(CA.FOG_ENABLED, true);
 * rootAppearance.setAttribute(CA.FOG_COLOR, new Color(200, 210, 220));
 * rootAppearance.setAttribute(CA.FOG_CURVE, 1);
 * rootAppearance.setAttribute(CA.FOG_BEGIN, 5.0);
 * rootAppearance.setAttribute(CA.FOG_END, 50.0);
 * ```
 *
 * @module DefaultFogShader
 */
export const DefaultFogShader = {
  type: 'DefaultFogShader',
  extends: 'FogShader',

  ATTRIBUTES: [
    CA.FOG_ENABLED,
    CA.FOG_COLOR,
    CA.FOG_FAR_COLOR,
    CA.FOG_BEGIN,
    CA.FOG_END,
    CA.FOG_DENSITY,
    CA.FOG_CURVE,
    CA.FOG_DISTANCE_METRIC,
    CA.FOG_HEIGHT_ENABLED,
    CA.FOG_HEIGHT_ORIGIN,
    CA.FOG_HEIGHT_FALLOFF
  ],

  ENABLED_DEFAULT:       CA.FOG_ENABLED_DEFAULT,
  COLOR_DEFAULT:         CA.FOG_COLOR_DEFAULT,
  FAR_COLOR_DEFAULT:     CA.FOG_FAR_COLOR_DEFAULT,
  BEGIN_DEFAULT:         CA.FOG_BEGIN_DEFAULT,
  END_DEFAULT:           CA.FOG_END_DEFAULT,
  DENSITY_DEFAULT:       CA.FOG_DENSITY_DEFAULT,
  /** 0=linear, 1=smooth(step), 2=exp, 3=exp2 */
  CURVE_DEFAULT:         CA.FOG_CURVE_DEFAULT,
  /** 0=radial, 1=planar */
  DISTANCE_METRIC_DEFAULT: CA.FOG_DISTANCE_METRIC_DEFAULT,
  HEIGHT_ENABLED_DEFAULT:  CA.FOG_HEIGHT_ENABLED_DEFAULT,
  HEIGHT_ORIGIN_DEFAULT:   CA.FOG_HEIGHT_ORIGIN_DEFAULT,
  HEIGHT_FALLOFF_DEFAULT:  CA.FOG_HEIGHT_FALLOFF_DEFAULT,

  /**
   * @param {string} attribute
   * @returns {*} Default value, or undefined
   */
  getDefault(attribute) {
    const map = {
      [CA.FOG_ENABLED]:         this.ENABLED_DEFAULT,
      [CA.FOG_COLOR]:           this.COLOR_DEFAULT,
      [CA.FOG_FAR_COLOR]:       this.FAR_COLOR_DEFAULT,
      [CA.FOG_BEGIN]:           this.BEGIN_DEFAULT,
      [CA.FOG_END]:             this.END_DEFAULT,
      [CA.FOG_DENSITY]:         this.DENSITY_DEFAULT,
      [CA.FOG_CURVE]:           this.CURVE_DEFAULT,
      [CA.FOG_DISTANCE_METRIC]: this.DISTANCE_METRIC_DEFAULT,
      [CA.FOG_HEIGHT_ENABLED]:  this.HEIGHT_ENABLED_DEFAULT,
      [CA.FOG_HEIGHT_ORIGIN]:   this.HEIGHT_ORIGIN_DEFAULT,
      [CA.FOG_HEIGHT_FALLOFF]:  this.HEIGHT_FALLOFF_DEFAULT
    };
    return map[attribute];
  },

  hasAttribute(attribute) {
    return this.ATTRIBUTES.includes(attribute);
  },

  getAllDefaults() {
    return {
      [CA.FOG_ENABLED]:         this.ENABLED_DEFAULT,
      [CA.FOG_COLOR]:           this.COLOR_DEFAULT,
      [CA.FOG_FAR_COLOR]:       this.FAR_COLOR_DEFAULT,
      [CA.FOG_BEGIN]:           this.BEGIN_DEFAULT,
      [CA.FOG_END]:             this.END_DEFAULT,
      [CA.FOG_DENSITY]:         this.DENSITY_DEFAULT,
      [CA.FOG_CURVE]:           this.CURVE_DEFAULT,
      [CA.FOG_DISTANCE_METRIC]: this.DISTANCE_METRIC_DEFAULT,
      [CA.FOG_HEIGHT_ENABLED]:  this.HEIGHT_ENABLED_DEFAULT,
      [CA.FOG_HEIGHT_ORIGIN]:   this.HEIGHT_ORIGIN_DEFAULT,
      [CA.FOG_HEIGHT_FALLOFF]:  this.HEIGHT_FALLOFF_DEFAULT
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
