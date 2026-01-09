// ESM bridge for MathJS in the browser.
//
// We load MathJS as a classic script (UMD) into globalThis.math, then re-export
// the functions we need under a module-friendly API so code can do:
//   import { det, matrix, index, subset } from 'mathjs'
//
// This avoids requiring the dev server to expose /node_modules.

const math = globalThis.math;
if (!math) {
  throw new Error(
    "MathJS global not found. Ensure test/vendor/mathjs/math.js is loaded before importing 'mathjs'."
  );
}

export const det = math.det;
export const inv = math.inv;
export const sqrt = math.sqrt;
export const abs = math.abs;
export const max = math.max;
export const sign = math.sign;
export const cos = math.cos;
export const sin = math.sin;
export const pi = math.pi;

export const matrix = math.matrix;
export const index = math.index;
export const range = math.range;
export const subset = math.subset;

export default math;


