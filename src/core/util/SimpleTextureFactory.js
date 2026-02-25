/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// JavaScript port of SimpleTextureFactory.java (ProjectiveGeometry).
// Generates procedural RGBA textures as browser-native ImageData objects
// suitable for passing to Texture2D.setImage().
// The SPHERE type is omitted (requires ShadedSphereImage).

import { Color } from './Color.js';
import { Texture2D } from '../shader/Texture2D.js';
import { DescriptorType } from '../inspect/descriptors/DescriptorTypes.js';

/**
 * @enum {string}
 */
export const TextureType = Object.freeze({
  WEAVE:        'WEAVE',
  GRAPH_PAPER:  'GRAPH_PAPER',
  DISK:         'DISK',
  ANTI_DISK:    'ANTI_DISK',
  CHECKERBOARD: 'CHECKERBOARD',
  STRIPES:      'STRIPES',
  LINE:         'LINE',
  GRADIENT:     'GRADIENT',
  RING:         'RING',
});

// ── helpers ──────────────────────────────────────────────────────────────────

function clamp01(t) { return t <= 0 ? 0 : t >= 1 ? 1 : t; }

function remapClamp(t, minIn, maxIn, minOut, maxOut) {
  if (t <= minIn) return minOut;
  if (t >= maxIn) return maxOut;
  return minOut + ((t - minIn) / (maxIn - minIn)) * (maxOut - minOut);
}

function lerpColorFloat(c1, c2, t) {
  t = clamp01(t);
  const f1 = c1.toFloatArray();
  const f2 = c2.toFloatArray();
  return [
    (1 - t) * f1[0] + t * f2[0],
    (1 - t) * f1[1] + t * f2[1],
    (1 - t) * f1[2] + t * f2[2],
    (1 - t) * f1[3] + t * f2[3],
  ];
}

function copy4(src, dst, offset) {
  dst[offset]     = src[0];
  dst[offset + 1] = src[1];
  dst[offset + 2] = src[2];
  dst[offset + 3] = src[3];
}

// ── factory ──────────────────────────────────────────────────────────────────

export class SimpleTextureFactory {

  #type = TextureType.WEAVE;
  #size = 64;
  #channels = [0, 1, 2, 3];
  #colors;
  #bcolors;
  #params = [0.5, 1.0];
  #indices = [0, 1];
  #opaqueTexture = false;
  #imageData = null;

  #appearance = null;
  #textureID = 0;
  #texture2d = null;

  constructor() {
    this.#colors = [
      Color.WHITE,
      Color.LIGHT_GRAY,
      Color.YELLOW,
      new Color(0, 0, 0, 0),
    ];
    this.#bcolors = [
      new Uint8Array(4),
      new Uint8Array(4),
      new Uint8Array(4),
      new Uint8Array(4),
    ];
    this.#updateBColors();
  }

  // ── accessors ──────────────────────────────────────────────────────────

  getType()         { return this.#type; }
  setType(type)     { this.#type = type; }

  getSize()         { return this.#size; }
  setSize(size)     { this.#size = size; }

  getColor0()       { return this.#colors[0]; }
  setColor0(c)      { this.setColor(0, c); }
  getColor1()       { return this.#colors[1]; }
  setColor1(c)      { this.setColor(1, c); }
  getColor2()       { return this.#colors[2]; }
  setColor2(c)      { this.setColor(2, c); }
  getColor3()       { return this.#colors[3]; }
  setColor3(c)      { this.setColor(3, c); }

  setColors(colors) { this.#colors = colors; this.#updateBColors(); }
  setColor(i, c)    { this.#colors[i] = c; this.#updateBColors(); }

  getParams()       { return this.#params; }
  setParams(p)      { this.#params = p; }
  getIndices()      { return this.#indices; }
  setIndices(idx)   { this.#indices = idx; }

  getChannels()     { return this.#channels; }
  setChannels(ch)   { this.#channels = ch; this.#updateBColors(); }

  isOpaqueTexture()         { return this.#opaqueTexture; }
  setOpaqueTexture(opaque)  { this.#opaqueTexture = opaque; }

  getAppearance()           { return this.#appearance; }
  setAppearance(app)        { this.#appearance = app; }
  getTextureID()            { return this.#textureID; }
  setTextureID(id)          { this.#textureID = id; }

  /** @returns {ImageData|null} The generated browser-native ImageData. */
  getImageData()            { return this.#imageData; }

  /**
   * The managed Texture2D instance, created lazily when an Appearance is
   * attached and {@link update} is called.
   * @returns {Texture2D|null}
   */
  getTexture2D()            { return this.#texture2d; }

  // ── internal ───────────────────────────────────────────────────────────

  #updateBColors() {
    for (let i = 0; i < this.#colors.length; i++) {
      const cc = this.#colors[i].toFloatArray();
      const ch = this.#channels;
      for (let j = 0; j < 4; j++) {
        this.#bcolors[i][j] = Math.round(cc[ch[j]] * 255);
      }
    }
  }

  // ── update ─────────────────────────────────────────────────────────────

  update() {
    const size = this.#size;
    const im = new Uint8ClampedArray(size * size * 4);
    const bc = this.#bcolors;
    const colors = this.#colors;

    switch (this.#type) {
      case TextureType.ANTI_DISK:
      case TextureType.DISK:
        this.#generateDisk(im, size, bc);
        break;
      case TextureType.RING:
        this.#generateRing(im, size, bc, colors);
        break;
      case TextureType.WEAVE:
        this.#generateWeave(im, size, bc);
        break;
      case TextureType.GRAPH_PAPER:
        this.#generateGraphPaper(im, size, bc);
        break;
      case TextureType.CHECKERBOARD:
        this.#generateCheckerboard(im, size, bc);
        break;
      case TextureType.STRIPES:
        this.#generateStripes(im, size, bc);
        break;
      case TextureType.LINE:
        this.#generateLine(im, size, bc, colors);
        break;
      case TextureType.GRADIENT:
        this.#generateGradient(im, size, colors);
        break;
      default:
        console.warn(`SimpleTextureFactory: unknown type '${this.#type}'`);
        break;
    }

    if (this.#opaqueTexture) {
      for (let i = 0; i < size * size; i++) im[4 * i + 3] = 255;
    }

    this.#imageData = new ImageData(im, size, size);

    if (this.#appearance) {
      if (!this.#texture2d) this.#texture2d = new Texture2D();
      this.#texture2d.setImage(this.#imageData);
      const key = this.#textureID === 0
        ? 'polygonShader.texture2d'
        : `polygonShader.texture2d[${this.#textureID}]`;
      this.#appearance.setAttribute(key, this.#texture2d);
    }
  }

  // ── DISK / ANTI_DISK ──────────────────────────────────────────────────

  #generateDisk(im, size, bc) {
    const isDisk = (this.#type === TextureType.DISK);
    const idx1 = isDisk ? 0 : 3;
    const idx2 = isDisk ? 3 : 0;
    const half = size / 2;
    const shrunk = half - 1;
    const size2 = (size * size) / 4;
    const shrunk2 = shrunk * shrunk;
    const fringe = new Uint8Array(4);

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const I = 4 * (i * size + j);
        const i2 = i - half, j2 = j - half;
        const sq = i2 * i2 + j2 * j2;

        if (sq > shrunk2) {
          if (sq <= size2) {
            const f = (Math.sqrt(sq) - shrunk) / (half - shrunk);
            for (let k = 0; k < 4; k++) fringe[k] = Math.round(f * bc[3][k]);
            copy4(fringe, im, I);
          } else {
            copy4(bc[idx2], im, I);
          }
        } else {
          copy4(bc[idx1], im, I);
        }
      }
    }
  }

  // ── RING ──────────────────────────────────────────────────────────────

  #generateRing(im, size, bc, colors) {
    const repeat = 2.8;
    const size2 = (size * size) / 4;
    const half = size / 2;
    const fringe = new Uint8Array(4);

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const I = 4 * (i * size + j);
        const i2 = i - half, j2 = j - half;
        const sq = i2 * i2 + j2 * j2;

        if (sq < size2) {
          const f = Math.sqrt(sq) / half;
          let intensity = Math.sin(Math.PI * 2 * f * repeat);
          intensity = remapClamp(intensity, -0.5, 0.5, 0, 1);
          const bcf = lerpColorFloat(colors[0], colors[3], 1 - intensity);
          for (let k = 0; k < 4; k++) fringe[k] = Math.round(255 * bcf[k]);
          copy4(fringe, im, I);
        } else {
          copy4(bc[3], im, I);
        }
      }
    }
  }

  // ── WEAVE ─────────────────────────────────────────────────────────────

  #generateWeave(im, size, bc) {
    const bandwidth = 16;
    const shwd = 2;
    const onewidth = 32;

    for (let i = 0; i < size; i++) {
      const iband = Math.floor(i / onewidth);
      const imod = i % onewidth;
      for (let j = 0; j < size; j++) {
        const where = 4 * (i * size + j);
        const jband = Math.floor(j / onewidth);
        const jmod = j % onewidth;
        const q = 2 * iband + jband;
        let which;

        if (imod > bandwidth && jmod > bandwidth) {
          which = 0;
        } else if (imod <= bandwidth && jmod <= bandwidth) {
          which = (q === 0 || q === 3) ? 1 : 2;
        } else if (jmod > bandwidth) {
          which = 1;
          if ((q === 0 || q === 3) && jmod > (onewidth - shwd)) which = 3;
          if ((q === 1 || q === 2) && jmod < (bandwidth + shwd)) which = 3;
        } else {
          which = 2;
          if ((q === 1 || q === 2) && imod > (onewidth - shwd)) which = 3;
          if ((q === 0 || q === 3) && imod < (bandwidth + shwd)) which = 3;
        }

        copy4(bc[which], im, where);
      }
    }
  }

  // ── GRAPH_PAPER ───────────────────────────────────────────────────────

  #generateGraphPaper(im, size, bc) {
    const bands = 4;
    const factor = Math.floor(size / 64);
    const widths = [factor * 4, factor * 2, factor * 2, factor * 2];
    const halfwidth = Math.floor(widths[0] / 2);
    const onewidth = Math.floor(size / bands);

    for (let i = 0; i < size; i++) {
      const iband = Math.floor(i / onewidth);
      const imod = i % onewidth;
      for (let j = 0; j < size; j++) {
        const where = 4 * (((i + size) % size) * size + ((j + size - halfwidth) % size));
        const jband = Math.floor(j / onewidth);
        const jmod = j % onewidth;
        let which = 0;

        if (jmod <= widths[jband]) {
          which = (jband === 0) ? 1 : 2;
        }
        if (which !== 1 && imod <= widths[iband]) {
          which = (iband === 0) ? 1 : 2;
        }

        copy4(bc[which], im, where);
      }
    }
  }

  // ── CHECKERBOARD ──────────────────────────────────────────────────────

  #generateCheckerboard(im, size, bc) {
    const half = Math.floor(size / 2);
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const where = 4 * (i * size + j);
        const which = ((i < half && j < half) || (i >= half && j >= half)) ? 0 : 1;
        copy4(bc[which], im, where);
      }
    }
  }

  // ── STRIPES ───────────────────────────────────────────────────────────

  #generateStripes(im, size, bc) {
    const params = this.#params;
    const indices = this.#indices;

    for (let i = 0; i < size; i++) {
      let which = 0;
      for (let k = 0; k < params.length; k++) {
        if (i < Math.floor(params[k] * size)) {
          which = k;
          break;
        }
      }
      for (let j = 0; j < size; j++) {
        copy4(bc[indices[which]], im, 4 * (i * size + j));
      }
    }
  }

  // ── LINE ──────────────────────────────────────────────────────────────

  #generateLine(im, size, bc, colors) {
    const width = 5;
    const alphas = [100, 200, 255, 200, 100];
    // JS Color.getAlpha() already returns 0–1 (unlike Java's int 0–255)
    const alpha0 = colors[0].getAlpha();
    const alpha2 = colors[2].getAlpha();
    const thicker = colors[0].a > colors[2].a ? 0 : 2;

    const blendFloat = lerpColorFloat(
      colors[2 - thicker], colors[thicker], colors[thicker].getAlpha());
    const ch = this.#channels;
    const blendcb = new Uint8Array(4);
    for (let j = 0; j < 4; j++) blendcb[j] = Math.round(blendFloat[ch[j]] * 255);

    const bc0 = new Uint8Array(bc[0]);
    const bc2 = new Uint8Array(bc[2]);

    for (let i = 0; i < size; i++) {
      if (i < width) {
        bc0[3] = Math.round(alpha0 * alphas[i]);
      }
      const index = (i + size - 2) % size;
      for (let j = 0; j < size; j++) {
        const jndex = (j + size - 2) % size;
        const where = 4 * (index * size + jndex);

        if (i < width && j < width) {
          const k = thicker === 2 ? j : i;
          blendcb[3] = Math.round(colors[thicker].getAlpha() * alphas[k]);
          copy4(blendcb, im, where);
        } else if (i < width) {
          copy4(bc0, im, where);
        } else if (j < width) {
          bc2[3] = Math.round(alpha2 * alphas[j]);
          copy4(bc2, im, where);
        } else {
          copy4(bc[3], im, where);
        }
      }
    }
  }

  // ── GRADIENT ──────────────────────────────────────────────────────────

  #generateGradient(im, size, colors) {
    const k1 = 0, k2 = size;

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const I = 4 * (j * size + i);
        let blend;
        if (j <= k1)      blend = 1.0;
        else if (j >= k2) blend = 0.0;
        else              blend = 1.0 - (j - k1) / (k2 - k1);

        const bcf = lerpColorFloat(colors[0], colors[1], blend);
        for (let k = 0; k < 4; k++) im[I + k] = Math.round(255 * bcf[k]);
      }
    }
  }

  // ── inspector descriptors ──────────────────────────────────────────────

  /**
   * Returns inspector descriptors for interactive control of the factory.
   * @param {function(): void} [updateCallback] Called after every parameter
   *   change so the caller can regenerate the texture (call update(), re-apply
   *   the ImageData to a Texture2D, etc.).
   * @returns {import('../inspect/descriptors/DescriptorTypes.js').InspectorDescriptor[]}
   */
  getInspectorDescriptors(updateCallback) {
    const typeOptions = Object.keys(TextureType).map(k => ({
      value: TextureType[k], label: k.charAt(0) + k.slice(1).toLowerCase().replace(/_/g, ' '),
    }));

    const colorDesc = (index, label) => ({
      type: DescriptorType.COLOR,
      label,
      getValue: () => {
        const c = this.#colors[index];
        return { hex: c?.toHexString?.() ?? '#000000', alpha: c?.a ?? 255 };
      },
      setValue: ({ hex, alpha }) => {
        const rgb = Color.fromHex(hex);
        this.setColor(index, new Color(rgb.r, rgb.g, rgb.b, alpha));
        updateCallback?.();
      },
    });

    return [{
      type: DescriptorType.CONTAINER,
      containerLabel: 'Texture Factory',
      items: [
        {
          type: DescriptorType.ENUM,
          label: 'Type',
          options: typeOptions,
          getValue: () => this.getType(),
          setValue: (v) => { this.setType(v); updateCallback?.(); },
        },
        {
          type: DescriptorType.TEXT_SLIDER,
          valueType: 'int',
          label: 'Size',
          getValue: () => this.getSize(),
          setValue: (v) => { this.setSize(v); updateCallback?.(); },
          min: 16,
          max: 512,
          step: 16,
        },
        colorDesc(0, 'Color 0'),
        colorDesc(1, 'Color 1'),
        colorDesc(2, 'Color 2'),
        colorDesc(3, 'Color 3'),
        {
          type: DescriptorType.TOGGLE,
          label: 'Opaque',
          getValue: () => this.isOpaqueTexture(),
          setValue: (v) => { this.setOpaqueTexture(v); updateCallback?.(); },
        },
      ],
    }];
  }

  // ── static utilities ──────────────────────────────────────────────────

  /**
   * Scale an image (HTMLImageElement, HTMLCanvasElement, or ImageBitmap) to
   * the given dimensions using an offscreen canvas with bilinear filtering.
   * @param {CanvasImageSource} srcImg
   * @param {number} w
   * @param {number} h
   * @returns {HTMLCanvasElement}
   */
  static getScaledImage(srcImg, w, h) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(srcImg, 0, 0, w, h);
    return canvas;
  }
}
