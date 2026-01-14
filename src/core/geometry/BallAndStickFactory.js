/**
 * JavaScript port/translation of jReality.
 *
 * Port of: de.jreality.geometry.BallAndStickFactory
 *
 * Policy (jsreality):
 * - This implementation enforces **4D homogeneous vertex coordinates only**.
 *   If 3D points are detected, we throw and require upstream homogenization.
 */

import * as CommonAttributes from '../shader/CommonAttributes.js';
import * as Pn from '../math/Pn.js';
import { MatrixBuilder } from '../math/MatrixBuilder.js';
import { FactoredMatrix } from '../math/FactoredMatrix.js';
import { Appearance } from '../scene/Appearance.js';
import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';
import { Sphere } from '../scene/Sphere.js';
import { GeometryAttribute } from '../scene/GeometryAttribute.js';
import { SceneGraphUtility } from '../util/SceneGraphUtility.js';
import { Color, YELLOW, GREEN, RED } from '../util/Color.js';
import * as TubeUtility from './TubeUtility.js';
import { Primitives } from './Primitives.js';
import { IndexedFaceSetUtility } from './IndexedFaceSetUtility.js';

/** @type {import('../scene/Geometry.js').Geometry|null} */
let urCone = null;

/** Java octagonal cross section (3D) used to build the arrow cone geometry. */
const OCTAGONAL_CROSS_SECTION_3D = [
  [1, 0, 0,1 ],
  [0.707, 0.707, 0,1 ],
  [0, 1, 0,1 ],
  [-0.707, 0.707, 0,1 ],
  [-1, 0, 0,1 ],
  [-0.707, -0.707, 0,1 ],
  [0, -1, 0,1 ],
  [0.707, -0.707, 0,1 ],
];

function getUrCone() {
  if (urCone) return urCone;
  urCone = Primitives.pyramid(OCTAGONAL_CROSS_SECTION_3D, [0, 0, 1,1 ]);
  IndexedFaceSetUtility.calculateAndSetVertexNormals(urCone);
  return urCone;
}

/**
 * Try to coerce a vertex/edge color entry into a jsreality `Color`.
 * Supports:
 * - `Color`
 * - numeric `[r,g,b]` or `[r,g,b,a]` where components are either 0..255 or 0..1
 *
 * @param {any} v
 * @returns {Color|null}
 */
function toColor(v) {
  if (v == null) return null;
  if (v instanceof Color) return v;

  if (Array.isArray(v) || ArrayBuffer.isView(v)) {
    const a = Array.from(v);
    if (a.length < 3) return null;
    const max = Math.max(a[0], a[1], a[2], a.length >= 4 ? a[3] : 1);
    const scale = max <= 1.0 ? 255.0 : 1.0;
    const r = a[0] * scale;
    const g = a[1] * scale;
    const b = a[2] * scale;
    const alpha = a.length >= 4 ? a[3] * scale : 255;
    return new Color(r, g, b, alpha);
  }
  return null;
}

export class BallAndStickFactory {
  /** @type {import('../scene/IndexedLineSet.js').IndexedLineSet} */
  #ils;

  /** @type {number} */
  stickRadius = 0.025;
  /** @type {number} */
  ballRadius = 0.05;

  /** @type {Color|null} */
  stickColor = YELLOW;
  /** @type {Color|null} */
  ballColor = GREEN;
  /** @type {Color|null} */
  arrowColor = RED;

  /** @type {number} */
  metric = Pn.EUCLIDEAN;

  /** @type {boolean} */
  showBalls = true;
  /** @type {boolean} */
  showSticks = true;
  /** @type {boolean} */
  realSpheres = true;
  /** @type {boolean} */
  drawArrows = false;

  /** @type {SceneGraphComponent} */
  #theResult;
  /** @type {SceneGraphComponent} */
  #sticks;
  /** @type {SceneGraphComponent} */
  #balls;

  /** @type {Appearance} */
  #ballsAp;
  /** @type {Appearance} */
  #sticksAp;
  /** @type {Appearance} */
  #arrowsAp;
  /** @type {Appearance} */
  #topAp;

  /** @type {import('../scene/Geometry.js').Geometry|null} */
  stickGeometry = null;
  /** @type {import('../scene/Geometry.js').Geometry|null} */
  ballGeometry = null;

  /** @type {number[][]|null} */
  crossSection = null;

  /** where is tip of arrow placed? */
  arrowPosition = 0.5;
  /** scale=1: height of cone is length of edge */
  arrowScale = 0.1;
  /** bigger slope: more pointy arrow profile */
  arrowSlope = 1.0;

  /**
   * @param {import('../scene/IndexedLineSet.js').IndexedLineSet} ils
   */
  constructor(ils) {
    this.#ils = ils;

    this.#sticks = new SceneGraphComponent('sticks');
    this.#balls = new SceneGraphComponent('balls');

    this.#topAp = new Appearance();
    this.#theResult = new SceneGraphComponent('BAS');
    this.#theResult.setAppearance(this.#topAp);

    this.#sticksAp = new Appearance();
    this.#sticksAp.setAttribute(CommonAttributes.FACE_DRAW, true);
    this.#sticksAp.setAttribute(CommonAttributes.EDGE_DRAW, false);
    this.#sticksAp.setAttribute(CommonAttributes.VERTEX_DRAW, false);
    this.#sticks.setAppearance(this.#sticksAp);

    this.#ballsAp = new Appearance();
    this.#balls.setAppearance(this.#ballsAp);

    this.#arrowsAp = new Appearance();

    this.#theResult.addChild(this.#sticks);
    this.#theResult.addChild(this.#balls);
  }

  /** @returns {SceneGraphComponent} */
  getSceneGraphComponent() {
    return this.#theResult;
  }

  /** @param {boolean} b */
  setRealSpheres(b) {
    this.realSpheres = b;
  }

  /** @param {number} r */
  setStickRadius(r) {
    this.stickRadius = r;
  }

  /** @param {number} r */
  setBallRadius(r) {
    this.ballRadius = r;
  }

  /** @param {Color|null} c */
  setBallColor(c) {
    this.ballColor = c;
  }

  /** @param {Color|null} c */
  setStickColor(c) {
    this.stickColor = c;
  }

  /** @param {Color|null} c */
  setArrowColor(c) {
    this.arrowColor = c;
  }

  /** @param {number} m */
  setMetric(m) {
    this.metric = m;
  }

  /** @param {boolean} b */
  setShowArrows(b) {
    this.drawArrows = b;
  }

  /** @param {boolean} b */
  setShowBalls(b) {
    this.showBalls = b;
  }

  /** @param {boolean} b */
  setShowSticks(b) {
    this.showSticks = b;
  }

  /** @param {number} v */
  setArrowPosition(v) {
    this.arrowPosition = v;
  }

  /** @param {number} v */
  setArrowScale(v) {
    this.arrowScale = v;
  }

  /** @param {number} v */
  setArrowSlope(v) {
    this.arrowSlope = v;
  }

  /** @param {number[][]|null} cs */
  setCrossSection(cs) {
    this.crossSection = cs;
  }

  /** @param {import('../scene/Geometry.js').Geometry|null} g */
  setBallGeometry(g) {
    this.ballGeometry = g;
  }

  /** @param {import('../scene/Geometry.js').Geometry|null} g */
  setStickGeometry(g) {
    this.stickGeometry = g;
  }

  #assertILSIs4D() {
    const vertices = this.#ils.getVertexAttribute(GeometryAttribute.COORDINATES);
    if (!vertices || vertices.length === 0) return;
    const p0 = vertices.item(0);
    if (!p0 || p0.length !== 4) {
      throw new Error('BallAndStickFactory: expected 4D homogeneous vertex coordinates (no 3D allowed)');
    }
  }

  update() {
    this.#assertILSIs4D();

    // metric on root
    this.#topAp.setAttribute(CommonAttributes.METRIC, this.metric);

    this.#sticks.setVisible(this.showSticks);
    this.#balls.setVisible(this.showBalls);

    if (this.stickColor != null) {
      this.#sticksAp.setAttribute(
        `${CommonAttributes.POLYGON_SHADER}.${CommonAttributes.DIFFUSE_COLOR}`,
        this.stickColor
      );
    }
    if (this.arrowColor != null) {
      this.#arrowsAp.setAttribute(
        `${CommonAttributes.POLYGON_SHADER}.${CommonAttributes.DIFFUSE_COLOR}`,
        this.arrowColor
      );
    }

    // balls
    if (this.showBalls) {
      if (!this.realSpheres) {
        this.#balls.setGeometry(this.#ils);
        this.#ballsAp.setAttribute(`${CommonAttributes.POINT_SHADER}.${CommonAttributes.POINT_RADIUS}`, this.ballRadius);
        this.#ballsAp.setAttribute(CommonAttributes.FACE_DRAW, false);
        this.#ballsAp.setAttribute(CommonAttributes.EDGE_DRAW, false);
        this.#ballsAp.setAttribute(CommonAttributes.VERTEX_DRAW, true);
        this.#ballsAp.setAttribute(`${CommonAttributes.POINT_SHADER}.${CommonAttributes.SPHERES_DRAW}`, true);
        if (this.ballColor != null) {
          this.#ballsAp.setAttribute(`${CommonAttributes.POINT_SHADER}.${CommonAttributes.DIFFUSE_COLOR}`, this.ballColor);
          this.#ballsAp.setAttribute(
            `${CommonAttributes.POINT_SHADER}.${CommonAttributes.POLYGON_SHADER}.${CommonAttributes.DIFFUSE_COLOR}`,
            this.ballColor
          );
        }
      } else {
        this.#balls.setGeometry(null);
        this.#ballsAp.setAttribute(CommonAttributes.FACE_DRAW, true);
        this.#ballsAp.setAttribute(CommonAttributes.EDGE_DRAW, false);
        this.#ballsAp.setAttribute(CommonAttributes.VERTEX_DRAW, false);
        if (this.ballColor != null) {
          this.#ballsAp.setAttribute(
            `${CommonAttributes.POLYGON_SHADER}.${CommonAttributes.DIFFUSE_COLOR}`,
            this.ballColor
          );
        }

        const vertices = this.#ils.getVertexAttribute(GeometryAttribute.COORDINATES);
        const vertexColors = this.#ils.getVertexAttribute(GeometryAttribute.COLORS);
        const vertexRadii = this.#ils.getVertexAttribute(GeometryAttribute.POINT_SIZE);
        const n = this.#ils.getNumPoints();
        SceneGraphUtility.removeChildren(this.#balls);

        for (let i = 0; i < n; i++) {
          let r = this.ballRadius;
          if (vertexRadii != null) {
            const rr = vertexRadii.item(i);
            if (rr && rr.length > 0) r = rr[0];
          }

          const p1 = vertices.item(i);
          if (!p1 || p1.length !== 4) {
            throw new Error('BallAndStickFactory: expected 4D points (no 3D allowed)');
          }

          const cc = new SceneGraphComponent(`ball${i}`);
          MatrixBuilder.init(null, this.metric).translate(p1).scale(r).assignTo(cc);
          cc.setGeometry(this.ballGeometry != null ? this.ballGeometry : new Sphere());

          if (vertexColors != null) {
            const c = Color.fromFloatArray(vertexColors.item(i));
            if (c != null) {
              const ap = new Appearance();
              ap.setAttribute(`${CommonAttributes.POLYGON_SHADER}.${CommonAttributes.DIFFUSE_COLOR}`, c);
              cc.setAppearance(ap);
            }
          }
          this.#balls.addChild(cc);
        }
      }
    }

    // sticks
    if (this.showSticks) {
      const vertices = this.#ils.getVertexAttribute(GeometryAttribute.COORDINATES);
      const edgeColors = this.#ils.getEdgeAttribute(GeometryAttribute.COLORS);
      const indices = this.#ils.getEdgeAttribute(GeometryAttribute.INDICES);
      const n = this.#ils.getNumEdges();

      SceneGraphUtility.removeChildren(this.#sticks);

      for (let i = 0; i < n; i++) {
        if (!indices) throw new Error('BallAndStickFactory: missing edge indices attribute');
        const ed = Array.from(indices.item(i));
        const m = ed.length;
        for (let j = 0; j < m - 1; j++) {
          const p1 = vertices.item(ed[j]);
          const p2 = vertices.item(ed[j + 1]);
          if (!p1 || !p2 || p1.length !== 4 || p2.length !== 4) {
            throw new Error('BallAndStickFactory: expected 4D points (no 3D allowed)');
          }

          const cc = TubeUtility.tubeOneEdge(p1, p2, this.stickRadius, this.crossSection, this.metric);
          if (this.stickGeometry != null) cc.setGeometry(this.stickGeometry);

          if (edgeColors != null) {
            const c = toColor(edgeColors.item(i));
            if (c != null) {
              const ap = new Appearance();
              ap.setAttribute(`${CommonAttributes.POLYGON_SHADER}.${CommonAttributes.DIFFUSE_COLOR}`, c);
              cc.setAppearance(ap);
            }
          }
          this.#sticks.addChild(cc);

          if (this.drawArrows) {
            const arrow = new SceneGraphComponent('Arrow');
            const arrowM = new FactoredMatrix(this.metric);
            const d = Pn.distanceBetween(p1, p2, this.metric);
            const flatten = this.arrowSlope / d;
            const stretch = this.arrowScale / this.stickRadius;
            arrowM.setStretchComponents(stretch, stretch, this.arrowScale * flatten);
            arrowM.setTranslation(0, 0, this.arrowPosition - 0.5);
            arrowM.update();
            arrowM.assignTo(arrow);
            arrow.setAppearance(this.#arrowsAp);
            arrow.setGeometry(getUrCone());
            cc.addChild(arrow);
          }
        }
      }
    }
  }

  /**
   * Static helper mirroring the Java utility: generate sticks (tubes) for all edges.
   *
   * @param {SceneGraphComponent|null} sgc
   * @param {import('../scene/IndexedLineSet.js').IndexedLineSet} ils
   * @param {number} rad
   * @param {number} metric
   * @returns {SceneGraphComponent}
   */
  static sticks(sgc, ils, rad, metric) {
    const out = sgc ?? new SceneGraphComponent();
    const vertices = ils.getVertexAttribute(GeometryAttribute.COORDINATES);
    const indices = ils.getEdgeAttribute(GeometryAttribute.INDICES);
    const n = ils.getNumEdges();

    for (let i = 0; i < n; i++) {
      if (!indices) throw new Error('BallAndStickFactory.sticks: missing edge indices attribute');
      const ed = Array.from(indices.item(i));
      for (let j = 0; j < ed.length - 1; j++) {
        const p1 = vertices.item(ed[j]);
        const p2 = vertices.item(ed[j + 1]);
        if (!p1 || !p2 || p1.length !== 4 || p2.length !== 4) {
          throw new Error('BallAndStickFactory.sticks: expected 4D points (no 3D allowed)');
        }
        const cc = TubeUtility.tubeOneEdge(p1, p2, rad, null, metric);
        if (cc != null) out.addChild(cc);
      }
    }
    return out;
  }

  /**
   * Convenience overload: sticks(null, ils, rad, metric)
   * @param {import('../scene/IndexedLineSet.js').IndexedLineSet} ils
   * @param {number} rad
   * @param {number} metric
   * @returns {SceneGraphComponent}
   */
  static sticksSimple(ils, rad, metric) {
    return BallAndStickFactory.sticks(null, ils, rad, metric);
  }
}

