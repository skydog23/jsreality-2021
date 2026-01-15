/**
 * Helper for TubeFactory scene graph visualization.
 *
 * This module exists to avoid a direct import cycle between TubeFactory and
 * BallAndStickFactory. It can be imported by TubeFactory without BallAndStickFactory
 * needing to import TubeFactory in return.
 */

import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';
import { Appearance } from '../scene/Appearance.js';
import { Transformation } from '../scene/Transformation.js';
import { Matrix } from '../math/Matrix.js';
import { MatrixBuilder } from '../math/MatrixBuilder.js';
import * as CommonAttributes from '../shader/CommonAttributes.js';
import { Color, RED, GREEN, BLUE } from '../util/Color.js';
import { IndexedLineSetFactory } from './IndexedLineSetFactory.js';
import { IndexedLineSetUtility } from './IndexedLineSetUtility.js';
import { BallAndStickFactory } from './BallAndStickFactory.js';
import * as Rn from '../math/Rn.js';
import * as P3 from '../math/P3.js';

const AXES = [
  [0, 0, 0, 1],
  [1, 0, 0, 1],
  [0, 1, 0, 1],
  [0, 0, 1, 1],
];

const AXES_INDICES = [
  [0, 1],
  [0, 2],
  [0, 3],
];

const AXES_COLORS = [RED, GREEN, BLUE];

/**
 * Create a small coordinate axes geometry for frame visualization.
 * @returns {SceneGraphComponent}
 */
export function getXYZAxes() {
  const ilsf = new IndexedLineSetFactory();
  ilsf.setVertexCount(4);
  ilsf.setVertexCoordinates(AXES);
  ilsf.setEdgeCount(3);
  ilsf.setEdgeIndices(AXES_INDICES);
  ilsf.setEdgeColors(AXES_COLORS);
  ilsf.update();

  const ils = ilsf.getIndexedLineSet();
  const basf = new BallAndStickFactory(ils);
  basf.setShowArrows(true);
  basf.setArrowPosition(1.0);
  basf.setStickRadius(0.05);
  basf.setArrowScale(0.15);
  basf.setArrowSlope(2.0);
  basf.setShowBalls(false);
  basf.setShowSticks(true);
  basf.update();
  return basf.getSceneGraphComponent();
}

/**
 * Build a scene graph representation of a frame field.
 *
 * Port of TubeFactory.getSceneGraphRepresentation(frames, scale)
 *
 * @param {import('./TubeUtility.js').FrameInfo[]|null} frames
 * @param {number} [scale=0.02]
 * @returns {SceneGraphComponent}
 */
export function getSceneGraphRepresentation(frames, scale = 0.02) {
  const result = new SceneGraphComponent();
  if (!frames || frames.length === 0) return result;

  const geometry = getXYZAxes();
  console.log('scale: ', scale);
  MatrixBuilder.euclidean().scale(scale).assignTo(geometry);

  const verts = new Array(frames.length);
  let i = 0;
  for (const f of frames) {
    const foo = new SceneGraphComponent();
    const scaledFrame = Rn.times(null, f.frame, P3.makeRotationMatrixZ(null, f.phi));
    const t = new Transformation(scaledFrame);
    foo.setTransformation(t);
    foo.addChild(geometry);
    result.addChild(foo);
    verts[i++] = new Matrix(f.frame).getColumn(3);
  }

  const sgc = new SceneGraphComponent();
  const ap = new Appearance();
  ap.setAttribute(`${CommonAttributes.LINE_SHADER}.${CommonAttributes.TUBE_RADIUS}`, 0.005);
  ap.setAttribute(`${CommonAttributes.LINE_SHADER}.${CommonAttributes.TUBES_DRAW}`, false);
  ap.setAttribute(`${CommonAttributes.LINE_SHADER}.${CommonAttributes.DIFFUSE_COLOR}`, new Color(100, 200, 200));
  ap.setAttribute(`${CommonAttributes.LINE_SHADER}.polygonShader.diffuseColor`, new Color(100, 200, 200));
  sgc.setAppearance(ap);

  const ils = IndexedLineSetUtility.createCurveFromPoints(verts, false);
  sgc.setGeometry(ils);
  result.addChild(sgc);

  return result;
}

