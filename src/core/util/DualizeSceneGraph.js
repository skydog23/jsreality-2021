/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

import * as Rn from '../math/Rn.js';
import * as Pn from '../math/Pn.js';
import { Matrix } from '../math/Matrix.js';
import { GeometryAttribute } from '../scene/GeometryAttribute.js';
import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';
import { SceneGraphPath } from '../scene/SceneGraphPath.js';
import { SceneGraphVisitor } from '../scene/SceneGraphVisitor.js';
import { Appearance, INHERITED } from '../scene/Appearance.js';
import { Camera } from '../scene/Camera.js';
import { IndexedFaceSet } from '../scene/IndexedFaceSet.js';
import { IndexedLineSet } from '../scene/IndexedLineSet.js';
import { PointSet } from '../scene/PointSet.js';
import { Transformation } from '../scene/Transformation.js';
import { PointSetFactory } from '../geometry/PointSetFactory.js';
import { IndexedLineSetUtility } from '../geometry/IndexedLineSetUtility.js';
import { LinePencilFactory } from '../geometry/projective/LinePencilFactory.js';
import { PointRangeFactory } from '../geometry/projective/PointRangeFactory.js';
import { intersectionPoint, normalize as normalizePluecker, lineFromPoints } from '../math/PlueckerLineGeometry.js';
import { EffectiveAppearance } from '../shader/EffectiveAppearance.js';
import { VERTEX_DRAW, EDGE_DRAW, DIFFUSE_COLOR } from '../shader/CommonAttributes.js';
import { CopyVisitor } from './CopyVisitor.js';
import { Color, RED, BLUE } from './Color.js';
import { SceneGraphUtility } from './SceneGraphUtility.js';
import { fromDataList } from '../scene/data/DataUtility.js';

/**
 * JavaScript translation of:
 *   ProjectiveGeometry/src/charlesgunn/jreality/geometry/projective/DualizeSceneGraph.java
 */
export class DualizeSceneGraph {
  static FAN_RADIUS = 'fanRadius';
  static FAN_COUNT = 'fanCount';
  static DO_FANS = 'doFans';
  static DUALIZE = 'dualize';
  static DUALIZE_POINTS = 'dualizePoints';
  static DUALIZE_LINES = 'dualizeLines';

  static FAN_RADIUS_DEFAULT = 0.1;
  static FAN_COUNT_DEFAULT = 12;

  static topAp = new Appearance();
  static #topInitialized = false;

  static #initTopAppearance() {
    if (DualizeSceneGraph.#topInitialized) return;
    DualizeSceneGraph.topAp.setAttribute(DualizeSceneGraph.FAN_RADIUS, DualizeSceneGraph.FAN_RADIUS_DEFAULT);
    DualizeSceneGraph.topAp.setAttribute(DualizeSceneGraph.FAN_COUNT, DualizeSceneGraph.FAN_COUNT_DEFAULT);
    DualizeSceneGraph.topAp.setAttribute(DualizeSceneGraph.DO_FANS, true);
    DualizeSceneGraph.topAp.setAttribute(DualizeSceneGraph.DUALIZE, true);
    DualizeSceneGraph.topAp.setAttribute(DualizeSceneGraph.DUALIZE_POINTS, true);
    DualizeSceneGraph.topAp.setAttribute(DualizeSceneGraph.DUALIZE_LINES, true);
    DualizeSceneGraph.#topInitialized = true;
  }

  /** @type {boolean} */
  doFan = true;
  /** @type {number} */
  fanRadius = 0.6;
  /** @type {number} */
  fanCount = 12;
  /** @type {boolean} */
  finiteLines = false;
  /** @type {boolean} */
  renderSphere = true;
  /** @type {boolean} */
  dualize = true;

  /** @type {CopyVisitor} */
  copier = new CopyVisitor();

  /** @type {SceneGraphComponent} */
  root;
  /** @type {SceneGraphComponent|null} */
  result = null;
  /** @type {DualizeVisitor} */
  dv;
  /** @type {SceneGraphPath} */
  sgp;

  /**
   * @param {SceneGraphPath} thePath
   */
  constructor(thePath) {
    DualizeSceneGraph.#initTopAppearance();
    this.sgp = thePath;
    this.root = thePath.getLastComponent();
    this.dv = new DualizeVisitor(this, thePath);
  }

  /**
   * @returns {SceneGraphComponent}
   */
  visit() {
    this.dv.updateEAP();
    this.root.childrenAccept(this.dv);
    this.result = SceneGraphUtility.createFullSceneGraphComponent('DualizeSceneGraph result');
    this.result.addChild(this.dv.currentDualSGC);
    if (this.renderSphere) {
      const backBanana = SceneGraphUtility.createFullSceneGraphComponent('back banana');
      const mat = Rn.diagonalMatrix(null, [-1, -1, -1, -1]);
      new Matrix(mat).assignTo(backBanana);
      backBanana.addChild(this.dv.currentDualSGC);
      this.result.addChild(backBanana);
    }
    return this.result;
  }

  /**
   * Java overload collapse:
   * - dualize(SceneGraphPath)
   * - dualize(SceneGraphComponent)
   * @param {SceneGraphPath|SceneGraphComponent} arg
   * @returns {SceneGraphComponent}
   */
  static dualize(arg) {
    let sgp = null;
    if (arg instanceof SceneGraphPath) {
      sgp = arg;
    } else if (arg instanceof SceneGraphComponent) {
      sgp = new SceneGraphPath(arg);
    } else {
      throw new Error('DualizeSceneGraph.dualize expects SceneGraphPath or SceneGraphComponent');
    }
    const dsg = new DualizeSceneGraph(sgp);
    return dsg.visit();
  }

  /**
   * @param {number[]|null} pt
   * @param {number[]} line
   * @returns {number[]}
   */
  static dualizeLine2Point(pt, line) {
    if (pt == null) return [-line[4], -line[2], 0, DualizeSceneGraph.metric * line[0]];
    pt[0] = -line[4];
    pt[1] = -line[2];
    pt[2] = 0;
    pt[3] = DualizeSceneGraph.metric * line[0];
    return pt;
  }

  /**
   * @param {number} m
   */
  static setMetric(m) {
    DualizeSceneGraph.metric = m;
  }

  /**
   * @returns {number}
   */
  static getMetric() {
    return DualizeSceneGraph.metric;
  }

  static metric = Pn.HYPERBOLIC;

  /**
   * @param {number[]|null} line
   * @param {number[]} pt
   * @returns {number[]}
   */
  static dualizePoint2Line(line, pt) {
    const p3 = pt.length === 4 ? pt[3] : 1;
    const vals = [DualizeSceneGraph.metric * p3, 0, -pt[1], 0, -pt[0], 0];
    if (line == null) return vals;
    for (let i = 0; i < 6; i++) line[i] = vals[i];
    return line;
  }

  isFiniteLines() {
    return this.finiteLines;
  }

  setFiniteLines(finiteLines) {
    this.finiteLines = finiteLines;
  }

  /**
   * @param {number[]} p1
   * @param {number[]} p2
   * @param {number} n
   * @param {number} metric
   * @returns {PointSetFactory}
   */
  static segmentFactory(p1, p2, n, metric) {
    const psf = new PointSetFactory();
    const verts = new Array(n);
    for (let i = 0; i < n; ++i) {
      const t = i / (n - 1.0);
      verts[i] = Pn.linearInterpolation(null, p1, p2, t, metric);
    }
    psf.setVertexCount(n);
    psf.setVertexCoordinates(verts);
    psf.update();
    return psf;
  }

  /**
   * @param {number[][]} verts
   * @param {number} fcount
   * @param {number} scount
   * @param {number} rad
   * @returns {SceneGraphComponent}
   */
  static completePolygon(verts, fcount, scount, rad) {
    const all = SceneGraphUtility.createFullSceneGraphComponent('all');
    const segments = SceneGraphUtility.createFullSceneGraphComponent('segments');
    const fans = SceneGraphUtility.createFullSceneGraphComponent('fans');
    const trad = SceneGraphUtility.createFullSceneGraphComponent('trad');
    segments.getAppearance().setAttribute(`pointShader.${DIFFUSE_COLOR}`, RED);
    segments.getAppearance().setAttribute('pointShader.pointRadius', 0.01);
    fans.getAppearance().setAttribute(`lineShader.${DIFFUSE_COLOR}`, BLUE);
    fans.getAppearance().setAttribute('lineShader.tubeRadius', 0.005);
    fans.getAppearance().setAttribute(VERTEX_DRAW, false);
    const n = verts.length;
    all.addChildren(segments, fans, trad);
    const lines = new Array(n);
    for (let i = 0; i < n; ++i) {
      lines[i] = lineFromPoints(null, verts[i], verts[(i + 1) % n]);
      normalizePluecker(lines[i], lines[i]);
    }
    for (let i = 0; i < n; ++i) {
      const psf = DualizeSceneGraph.segmentFactory(verts[i], verts[(i + 1) % n], scount, Pn.EUCLIDEAN);
      const seg = new SceneGraphComponent();
      seg.setGeometry(psf.getPointSet());
      segments.addChild(seg);
      const lpf = LinePencilFactory.linePencilFactoryForIntersectingLines(null, lines[i], lines[(i + 1) % n]);
      lpf.setFan(true);
      lpf.setFiniteSphere(true);
      lpf.setSphereRadius(rad);
      lpf.setNumLines(fcount);
      lpf.update();
      fans.addChild(lpf.getPencil());
    }
    const tradIls = IndexedLineSetUtility.createCurveFromPoints(verts, true);
    trad.setGeometry(tradIls);
    trad.getAppearance().setAttribute(`lineShader.${DIFFUSE_COLOR}`, new Color(255, 0, 255));
    trad.getAppearance().setAttribute('lineShader.tubeRadius', 0.005);
    trad.getAppearance().setAttribute(VERTEX_DRAW, false);
    return all;
  }
}

class DualizeVisitor extends SceneGraphVisitor {
  /**
   * Java overload collapse:
   * - DualizeVisitor(SceneGraphPath path)
   * - DualizeVisitor(DualizeVisitor parent, SceneGraphComponent c)
   * @param {DualizeSceneGraph} owner
   * @param {SceneGraphPath|DualizeVisitor} arg1
   * @param {SceneGraphComponent} [arg2]
   */
  constructor(owner, arg1, arg2 = undefined) {
    super();
    this.owner = owner;
    this.currentSGC = null;
    this.currentDualSGC = null;
    this.eap = null;
    this.dualLines = null;
    if (arg1 instanceof SceneGraphPath) {
      const path = arg1;
      this.eap = EffectiveAppearance.createFromPath(path);
      if (this.eap == null) throw new Error('null eap');
      this.init(null, path.getLastComponent());
      return;
    }
    if (arg1 instanceof DualizeVisitor && arg2 instanceof SceneGraphComponent) {
      this.init(arg1, arg2);
      return;
    }
    throw new Error('DualizeVisitor: unsupported constructor arguments');
  }

  /**
   * @param {DualizeVisitor|null} parent
   * @param {SceneGraphComponent} c
   */
  init(parent, c) {
    this.currentSGC = c;
    this.owner.copier.visitComponent(c);
    this.currentDualSGC = /** @type {SceneGraphComponent} */ (this.owner.copier.getCopy());
    this.currentDualSGC.setName(`${c.getName()} dual`);
    if (parent == null) return;
    if (parent.currentSGC && parent.currentSGC.isDirectAncestor(this.currentSGC)) {
      parent.currentDualSGC.addChild(this.currentDualSGC);
    }
    if (this.currentSGC.getAppearance() != null) {
      this.eap = parent.eap.createChild(this.currentSGC.getAppearance());
    } else {
      this.eap = parent.eap;
    }
  }

  /**
   * @param {IndexedFaceSet} f
   */
  visitIndexedFaceSet(f) {
    this.visitIndexedLineSet(/** @type {IndexedLineSet} */ (f));
  }

  /**
   * @param {IndexedLineSet} p
   */
  visitIndexedLineSet(p) {
    this.visitPointSet(/** @type {PointSet} */ (p));
    if (!this.eap.getAttribute(DualizeSceneGraph.DUALIZE_LINES, true)) return;
    const eIdxDl = p.getEdgeAttribute(GeometryAttribute.INDICES);
    if (!eIdxDl) return;

    let verts = fromDataList(p.getVertexAttribute(GeometryAttribute.COORDINATES));
    const edges = fromDataList(eIdxDl);
    let ecolors = null;
    const eColorDl = p.getEdgeAttribute(GeometryAttribute.COLORS);
    if (eColorDl) ecolors = fromDataList(eColorDl);
    const numEdges = edges.length;
    if (verts[0].length === 3) verts = Pn.homogenize(null, verts);
    const dualPoints = [];
    const dualPointsSGC = new SceneGraphComponent('dual points');
    this.currentDualSGC.addChild(dualPointsSGC);

    for (let i = 0; i < numEdges; ++i) {
      const edge = edges[i];
      const numLines = edge.length - 1;
      const numFans = numLines;
      const edgeSGC = new SceneGraphComponent(`edge ${i}`);
      edgeSGC.setAppearance(new Appearance());
      this.currentDualSGC.addChild(edgeSGC);
      edgeSGC.getAppearance().setAttribute(VERTEX_DRAW, false);
      if (ecolors != null) {
        const j = i;
        const color = DualizeVisitor.#toColor(ecolors[j]);
        edgeSGC.getAppearance().setAttribute('lineShader.diffuseColor', color);
        edgeSGC.getAppearance().setAttribute('pointShader.diffuseColor', color);
      }
      const doFans = this.eap.getAttribute(DualizeSceneGraph.DO_FANS, true);
      for (let j = 0; j < numFans; ++j) {
        dualPoints.push(
          intersectionPoint(null, this.dualLines[edge[j]], this.dualLines[edge[(j + 1) % edge.length]])
        );
        if (!doFans) continue;
        let lpf = null;
        lpf = LinePencilFactory.linePencilFactoryForIntersectingLines(
          lpf,
          this.dualLines[edge[j]],
          this.dualLines[edge[(j + 1) % edge.length]]
        );
        lpf.setFan(true);
        lpf.setFiniteSphere(true);
        lpf.setSphereRadius(this.owner.fanRadius);
        lpf.setNumLines(this.owner.fanCount);
        lpf.update();
        edgeSGC.addChild(lpf.getPencil());
      }
    }
    if (dualPoints.length === 0) return;
    const psf = new PointSetFactory();
    const dualPointA = dualPoints;
    psf.setVertexCount(dualPointA.length);
    psf.setVertexCoordinates(dualPointA);
    if (ecolors != null && ecolors.length === dualPointA.length) psf.setVertexColors(ecolors);
    psf.update();
    dualPointsSGC.setGeometry(psf.getPointSet());
  }

  /**
   * @param {PointSet} p
   */
  visitPointSet(p) {
    const vertexAttributes = p.getVertexAttribute(GeometryAttribute.COORDINATES);
    if (!vertexAttributes) return;
    const verts = fromDataList(vertexAttributes);
    let colors = null;
    const vColors = p.getVertexAttribute(GeometryAttribute.COLORS);
    if (vColors) colors = fromDataList(vColors);
    const numVerts = verts.length;
    this.dualLines = new Array(numVerts);
    for (let i = 0; i < numVerts; ++i) {
      this.dualLines[i] = DualizeSceneGraph.dualizePoint2Line(this.dualLines[i], verts[i]);
    }
    if (!this.eap.getAttribute(DualizeSceneGraph.DUALIZE_POINTS, true)) return;
    for (let i = 0; i < numVerts; ++i) {
      const prf = new PointRangeFactory();
      prf.setPluckerLine(this.dualLines[i]);
      prf.setFiniteSphere(this.owner.finiteLines);
      prf.setSphereRadius(500.0);
      prf.update();
      prf.getLine().setName(`${p.getName()} dual line ${i}`);
      const child = new SceneGraphComponent(`${p.getName()} dual line ${i}`);
      child.setGeometry(prf.getLine());
      child.setAppearance(new Appearance());
      child.getAppearance().setAttribute(VERTEX_DRAW, false);
      if (colors != null) {
        child.getAppearance().setAttribute('lineShader.diffuseColor', DualizeVisitor.#toColor(colors[i]));
      }
      this.currentDualSGC.addChild(child);
    }
  }

  /**
   * @param {SceneGraphComponent} c
   */
  visitComponent(c) {
    this.updateEAP();
    if (!this.owner.dualize) return;
    c.childrenAccept(new DualizeVisitor(this.owner, this, c));
  }

  updateEAP() {
    if (this.eap != null) {
      this.owner.dualize = this.eap.getAttribute(DualizeSceneGraph.DUALIZE, true);
      this.owner.fanRadius = this.eap.getAttribute(DualizeSceneGraph.FAN_RADIUS, DualizeSceneGraph.FAN_RADIUS_DEFAULT);
      this.owner.fanCount = this.eap.getAttribute(DualizeSceneGraph.FAN_COUNT, DualizeSceneGraph.FAN_COUNT_DEFAULT);
    }
  }

  /**
   * @param {Transformation} t
   */
  visitTransformation(t) {
    let mat = t.getMatrix();
    mat = Rn.transpose(null, Rn.inverse(null, mat));
    this.currentDualSGC.setTransformation(new Transformation(mat));
  }

  /**
   * @param {Appearance} a
   */
  visitAppearance(a) {
    this.owner.copier.visitAppearance(a);
    const copied = /** @type {Appearance} */ (this.owner.copier.getCopy());
    let foo = copied.getAttribute('pointShader.diffuseColor');
    let bar = copied.getAttribute('lineShader.diffuseColor');
    if (foo instanceof Color) {
      copied.setAttribute('lineShader.diffuseColor', foo);
      copied.setAttribute('pointShader.diffuseColor', INHERITED);
    }
    if (bar instanceof Color) {
      copied.setAttribute('pointShader.diffuseColor', bar);
      if (foo == null) copied.setAttribute('lineShader.diffuseColor', INHERITED);
    }
    foo = copied.getAttribute(VERTEX_DRAW);
    bar = copied.getAttribute(EDGE_DRAW);
    if (typeof foo === 'boolean') {
      copied.setAttribute(EDGE_DRAW, foo);
      if (bar == null) copied.setAttribute(VERTEX_DRAW, INHERITED);
    }
    if (typeof bar === 'boolean') {
      copied.setAttribute(VERTEX_DRAW, bar);
      if (foo == null) copied.setAttribute('lineShader.diffuseColor', INHERITED);
    }
    this.currentDualSGC.setAppearance(copied);
  }

  /**
   * @param {Camera} c
   */
  visitCamera(c) {
    this.owner.copier.visitCamera(c);
    const copied = /** @type {Camera} */ (this.owner.copier.getCopy());
    this.currentDualSGC.setCamera(copied);
  }

  /**
   * @param {PointSet|IndexedLineSet|IndexedFaceSet|Appearance|Transformation|Camera|SceneGraphComponent} n
   */
  visit(n) {
    // Keep generic fallback quiet; specific typed visit methods above are used by accept().
  }

  /**
   * @param {number[]|Color} c
   * @returns {Color}
   */
  static #toColor(c) {
    if (c instanceof Color) return c;
    if (!Array.isArray(c)) return new Color(255, 255, 255);
    const r = c[0] <= 1 ? c[0] * 255 : c[0];
    const g = c[1] <= 1 ? c[1] * 255 : c[1];
    const b = c[2] <= 1 ? c[2] * 255 : c[2];
    const a = c.length > 3 ? (c[3] <= 1 ? c[3] * 255 : c[3]) : 255;
    return new Color(r, g, b, a);
  }
}

