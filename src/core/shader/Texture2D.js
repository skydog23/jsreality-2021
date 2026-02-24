/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript port of jReality's Texture2D interface, redesigned for WebGL2.
//
// The Java Texture2D carried a large number of OpenGL fixed-function texture
// environment constants (GL_COMBINE, GL_SOURCE*, GL_OPERAND*, etc.).  None of
// these exist in WebGL — texture application is handled entirely in GLSL
// fragment shaders.  This JS version keeps the useful core properties (image,
// wrap, filter, matrix, apply-mode) and replaces the fixed-function machinery
// with a small ApplyMode enum whose semantics are implemented in the shader.

import * as Rn from '../math/Rn.js';

// ─────────────────────────────────────────────────────────────────────────────
// Apply mode enum — how the texture color is combined with the surface color.
// In WebGL these are implemented as branches in the fragment shader, not as
// OpenGL glTexEnv state.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Texture apply modes.
 *
 * | Mode       | GLSL equivalent                                     |
 * |------------|-----------------------------------------------------|
 * | MODULATE   | `fragColor = texColor * surfaceColor`               |
 * | REPLACE    | `fragColor = texColor`                              |
 * | DECAL      | `fragColor.rgb = mix(surfaceColor.rgb, texColor.rgb, texColor.a)` |
 * | BLEND      | `fragColor = mix(surfaceColor, blendColor, texColor)` |
 * | ADD        | `fragColor = surfaceColor + texColor`               |
 */
export const ApplyMode = Object.freeze({
  MODULATE: 'modulate',
  REPLACE:  'replace',
  DECAL:    'decal',
  BLEND:    'blend',
  ADD:      'add',
});

// ─────────────────────────────────────────────────────────────────────────────
// WebGL-compatible wrap mode constants (same hex values as GL).
// ─────────────────────────────────────────────────────────────────────────────

export const WrapMode = Object.freeze({
  REPEAT:          0x2901,
  MIRRORED_REPEAT: 0x8370,
  CLAMP_TO_EDGE:   0x812F,
});

// ─────────────────────────────────────────────────────────────────────────────
// WebGL-compatible filter constants (same hex values as GL).
// ─────────────────────────────────────────────────────────────────────────────

export const FilterMode = Object.freeze({
  NEAREST:                0x2600,
  LINEAR:                 0x2601,
  NEAREST_MIPMAP_NEAREST: 0x2700,
  LINEAR_MIPMAP_NEAREST:  0x2701,
  NEAREST_MIPMAP_LINEAR:  0x2702,
  LINEAR_MIPMAP_LINEAR:   0x2703,
});

// ─────────────────────────────────────────────────────────────────────────────
// Defaults — mirror the Java defaults where applicable.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULTS = Object.freeze({
  repeatS:       WrapMode.REPEAT,
  repeatT:       WrapMode.REPEAT,
  magFilter:     FilterMode.LINEAR,
  minFilter:     FilterMode.LINEAR_MIPMAP_LINEAR,
  applyMode:     ApplyMode.MODULATE,
  mipmapMode:    true,
  textureMatrix: null,   // null ⇒ identity (no transform)
  blendColor:    [1, 1, 1, 1],
  image:         null,
  externalSource: null,
  animated:      false,
});

// ─────────────────────────────────────────────────────────────────────────────
// Texture2D class
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Describes a 2-D texture to be applied to polygon surfaces.
 *
 * ## Image source
 *
 * The texture image can be supplied in two ways:
 *
 * 1. **Inline** via {@link setImage} — accepts any object that WebGL's
 *    `texImage2D` can consume: `HTMLImageElement`, `HTMLCanvasElement`,
 *    `ImageBitmap`, `ImageData`, `HTMLVideoElement`, or a
 *    `{ data, width, height }` plain object (RGBA byte array).
 *
 * 2. **By URL** via {@link setExternalSource} — the renderer fetches the
 *    image asynchronously and uploads it once loaded.
 *
 * ## Texture coordinates
 *
 * Texture coordinates come from the geometry's vertex attribute
 * `GeometryAttribute.TEXTURE_COORDINATES`.  An optional 4×4
 * {@link textureMatrix} transforms them before sampling.
 *
 * ## Apply mode
 *
 * The {@link applyMode} controls how the texture color is combined with the
 * surface (lit) color.  See {@link ApplyMode} for the available modes and
 * their GLSL equivalents.
 *
 * @example
 * ```js
 * import { Texture2D, ApplyMode } from '../shader/Texture2D.js';
 *
 * const tex = new Texture2D();
 * tex.setExternalSource('textures/brick.jpg');
 * tex.setApplyMode(ApplyMode.MODULATE);
 *
 * appearance.setAttribute('polygonShader.texture2d', tex);
 * ```
 */
export class Texture2D {

  #repeatS;
  #repeatT;
  #magFilter;
  #minFilter;
  #applyMode;
  #mipmapMode;
  #textureMatrix;
  #blendColor;
  #image;
  #externalSource;
  #animated;

  // Monotonically increasing stamp so the renderer knows when to re-upload.
  #version = 0;

  constructor(opts = {}) {
    this.#repeatS       = opts.repeatS       ?? DEFAULTS.repeatS;
    this.#repeatT       = opts.repeatT       ?? DEFAULTS.repeatT;
    this.#magFilter     = opts.magFilter     ?? DEFAULTS.magFilter;
    this.#minFilter     = opts.minFilter     ?? DEFAULTS.minFilter;
    this.#applyMode     = opts.applyMode     ?? DEFAULTS.applyMode;
    this.#mipmapMode    = opts.mipmapMode    ?? DEFAULTS.mipmapMode;
    this.#textureMatrix = opts.textureMatrix ?? DEFAULTS.textureMatrix;
    this.#blendColor    = opts.blendColor    ? [...opts.blendColor] : [...DEFAULTS.blendColor];
    this.#image         = opts.image         ?? DEFAULTS.image;
    this.#externalSource = opts.externalSource ?? DEFAULTS.externalSource;
    this.#animated      = opts.animated      ?? DEFAULTS.animated;
  }

  // ── version tracking ─────────────────────────────────────────────────────

  /** Current version stamp; incremented on every mutation. */
  get version() { return this.#version; }

  #bump() { this.#version++; }

  // ── wrap mode ────────────────────────────────────────────────────────────

  /** @returns {number} WebGL wrap constant for the S (horizontal) axis. */
  getRepeatS()           { return this.#repeatS; }
  /** @param {number} v  One of the {@link WrapMode} constants. */
  setRepeatS(v)          { this.#repeatS = v; this.#bump(); }

  /** @returns {number} WebGL wrap constant for the T (vertical) axis. */
  getRepeatT()           { return this.#repeatT; }
  /** @param {number} v  One of the {@link WrapMode} constants. */
  setRepeatT(v)          { this.#repeatT = v; this.#bump(); }

  // ── filter mode ──────────────────────────────────────────────────────────

  /** @returns {number} Magnification filter (NEAREST or LINEAR). */
  getMagFilter()         { return this.#magFilter; }
  /** @param {number} v  {@link FilterMode.NEAREST} or {@link FilterMode.LINEAR}. */
  setMagFilter(v)        { this.#magFilter = v; this.#bump(); }

  /** @returns {number} Minification filter (any FilterMode constant). */
  getMinFilter()         { return this.#minFilter; }
  /** @param {number} v  One of the {@link FilterMode} constants. */
  setMinFilter(v)        { this.#minFilter = v; this.#bump(); }

  // ── apply mode ───────────────────────────────────────────────────────────

  /** @returns {string} One of the {@link ApplyMode} values. */
  getApplyMode()         { return this.#applyMode; }
  /**
   * Set how the texture is combined with the surface color.
   * @param {string} v  One of the {@link ApplyMode} values.
   */
  setApplyMode(v)        { this.#applyMode = v; this.#bump(); }

  // ── mipmap ───────────────────────────────────────────────────────────────

  /** @returns {boolean} Whether mipmaps are generated and used. */
  getMipmapMode()        { return this.#mipmapMode; }
  /** @param {boolean} v */
  setMipmapMode(v)       { this.#mipmapMode = !!v; this.#bump(); }

  // ── texture matrix ───────────────────────────────────────────────────────

  /**
   * Optional 4×4 matrix applied to texture coordinates before sampling.
   * `null` means identity (no transform).
   * @returns {number[]|Float32Array|null}
   */
  getTextureMatrix()     { return this.#textureMatrix; }
  /**
   * @param {number[]|Float32Array|null} m  A 16-element row-major 4×4 matrix,
   *   or `null` for identity.
   */
  setTextureMatrix(m) {
    this.#textureMatrix = m ? (Array.isArray(m) ? [...m] : new Float32Array(m)) : null;
    this.#bump();
  }

  // ── blend color ──────────────────────────────────────────────────────────

  /**
   * Blend color used when {@link applyMode} is {@link ApplyMode.BLEND}.
   * RGBA in [0,1].
   * @returns {number[]}
   */
  getBlendColor()        { return this.#blendColor; }
  /** @param {number[]} c  RGBA array, each component in [0,1]. */
  setBlendColor(c)       { this.#blendColor = [...c]; this.#bump(); }

  // ── image data ───────────────────────────────────────────────────────────

  /**
   * The texture image.  Accepts any type that `gl.texImage2D` can consume:
   * `HTMLImageElement`, `HTMLCanvasElement`, `ImageBitmap`, `ImageData`,
   * `HTMLVideoElement`, or a plain `{ data: Uint8Array, width, height }`.
   * @returns {*}
   */
  getImage()             { return this.#image; }
  /**
   * @param {HTMLImageElement|HTMLCanvasElement|ImageBitmap|ImageData|HTMLVideoElement|{data:Uint8Array,width:number,height:number}|null} img
   */
  setImage(img)          { this.#image = img; this.#bump(); }

  // ── external source ──────────────────────────────────────────────────────

  /**
   * URL of an image to fetch asynchronously.  When the renderer detects a
   * non-null externalSource and no inline image, it fetches the URL, creates
   * an `Image`, and calls {@link setImage} once loaded.
   * @returns {string|null}
   */
  getExternalSource()    { return this.#externalSource; }
  /** @param {string|null} url */
  setExternalSource(url) { this.#externalSource = url; this.#bump(); }

  // ── animated flag ────────────────────────────────────────────────────────

  /**
   * If `true`, the renderer re-uploads the texture image every frame.
   * Useful for video or canvas-based procedural textures.
   * @returns {boolean}
   */
  getAnimated()          { return this.#animated; }
  /** @param {boolean} v */
  setAnimated(v)         { this.#animated = !!v; this.#bump(); }

  // ── convenience helpers ──────────────────────────────────────────────────

  /**
   * Returns `true` if this texture has either an inline image or an
   * external source URL — i.e., there is something to render.
   * @returns {boolean}
   */
  hasImageSource() {
    return this.#image != null || (this.#externalSource != null && this.#externalSource !== '');
  }

  /**
   * Create a deep copy of this Texture2D.
   * @returns {Texture2D}
   */
  clone() {
    return new Texture2D({
      repeatS:        this.#repeatS,
      repeatT:        this.#repeatT,
      magFilter:      this.#magFilter,
      minFilter:      this.#minFilter,
      applyMode:      this.#applyMode,
      mipmapMode:     this.#mipmapMode,
      textureMatrix:  this.#textureMatrix ? [...this.#textureMatrix] : null,
      blendColor:     [...this.#blendColor],
      image:          this.#image,
      externalSource: this.#externalSource,
      animated:       this.#animated,
    });
  }

  toString() {
    const src = this.#externalSource ?? (this.#image ? '<inline>' : '<none>');
    return `Texture2D(source=${src}, apply=${this.#applyMode}, wrap=[${this.#repeatS},${this.#repeatT}])`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Static default constants — exposed for CommonAttributes / EffectiveAppearance
// ─────────────────────────────────────────────────────────────────────────────

Texture2D.DEFAULTS     = DEFAULTS;
Texture2D.ApplyMode    = ApplyMode;
Texture2D.WrapMode     = WrapMode;
Texture2D.FilterMode   = FilterMode;
