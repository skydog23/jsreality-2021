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
 * A collection of static methods related to the jReality Camera class.
 * 
 * Most of the methods involve calculating various transformations related to the
 * camera and an instance of Viewer.
 * 
 * Translated from Java CameraUtility.java
 * @author Charles Gunn (original Java)
 */

import { Rectangle2D } from '../scene/Camera.js';
import * as Rn from '../math/Rn.js';
import * as Pn from '../math/Pn.js';
import * as P3 from '../math/P3.js';
import { Matrix } from '../math/Matrix.js';
import { FactoredMatrix } from '../math/FactoredMatrix.js';
import { BoundingBoxUtility } from '../geometry/BoundingBoxUtility.js';
import { Rectangle3D } from './Rectangle3D.js';
import * as CommonAttributes from '../shader/CommonAttributes.js';
import { EncompassFactory } from './EncompassFactory.js';

/** @typedef {import('../scene/Viewer.js').Viewer} Viewer */
/** @typedef {import('../scene/Camera.js').Camera} Camera */
/** @typedef {import('../scene/SceneGraphComponent.js').SceneGraphComponent} SceneGraphComponent */
/** @typedef {import('../scene/SceneGraphPath.js').SceneGraphPath} SceneGraphPath */

// Constants for support of stereo viewing
export const MIDDLE_EYE = 0;
export const LEFT_EYE = 1;
export const RIGHT_EYE = 2;

/**
 * Determine the camera for this viewer.
 * @param {Viewer} v - The viewer
 * @returns {Camera} The camera
 * @throws {Error} If viewer has no camera
 */
export function getCamera(v) {
  if (v == null || v.getCameraPath() == null || v.getCameraPath().getLength() === 0) {
    throw new Error('Viewer has no camera!');
  }
  const lastElement = v.getCameraPath().getLastElement();
  // Or it might directly be a Camera
  if (lastElement && lastElement.constructor.name === 'Camera') {
    return lastElement;
  }
  throw new Error('Viewer has no camera!');
}

/**
 * Determine the SceneGraphComponent which contains the camera for this viewer.
 * @param {Viewer} v - The viewer
 * @returns {*} The camera's SceneGraphComponent
 */
export function getCameraNode(v) {
  return v.getCameraPath().getLastComponent();
}

/**
 * Determine the aspect ratio of the output window of a viewer.
 * @param {Viewer} v - The viewer
 * @returns {number} The aspect ratio (width/height)
 */
export function getAspectRatio(v) {
  if (!v.hasViewingComponent()) return 1.0;
  const d = v.getViewingComponentSize();
  return d.height > 0 ? d.width / d.height : 1.0;
}

/**
 * Calculate the camera to NDC (normalized device coordinates) transformation
 * for a given viewer/camera.
 *
 * Java overloads collapsed into one runtime-dispatch function:
 * - getCameraToNDC(v: Viewer): number[]
 * - getCameraToNDC(cam: Camera, aspectRatio: number): number[]
 * - getCameraToNDC(cam: Camera, aspectRatio: number, which: number): number[]
 * - getCameraToNDC(cam: Camera, aspectRatio: number, which: number, metric: number): number[]
 *
 * @param {Viewer|Camera} arg0 - Viewer or Camera
 * @param {number} [arg1] - aspectRatio (when arg0 is Camera)
 * @param {number} [arg2] - which (MIDDLE_EYE/LEFT_EYE/RIGHT_EYE)
 * @param {number} [arg3] - metric (Pn.EUCLIDEAN, etc.)
 * @returns {number[]} 4x4 transformation matrix
 */
export function getCameraToNDC(arg0, arg1, arg2, arg3) {
  // Viewer signature
  if (arg0 != null && typeof arg0.getCameraPath === 'function') {
    /** @type {Viewer} */ // @ts-ignore
    const v = arg0;
    const cam = getCamera(v);
    const aspectRatio = getAspectRatio(v);
    return _getCameraToNDCImpl(cam, aspectRatio, MIDDLE_EYE, Pn.EUCLIDEAN);
  }

  // Camera signatures
  /** @type {Camera} */ // @ts-ignore
  const cam = arg0;
  const aspectRatio = /** @type {number} */ (arg1);
  const which = arg2 ?? MIDDLE_EYE;
  const metric = arg3 ?? Pn.EUCLIDEAN;
  return _getCameraToNDCImpl(cam, aspectRatio, which, metric);
}

/**
 * Backward-compatible wrapper (non-Java name). Prefer {@link getCameraToNDC}.
 * @deprecated
 * @param {Camera} cam - The camera
 * @param {number} aspectRatio - The aspect ratio
 * @returns {number[]} 4x4 transformation matrix
 */
export function getCameraToNDCWithAspect(cam, aspectRatio) {
  return getCameraToNDC(cam, aspectRatio);
}

/**
 * Backward-compatible wrapper (non-Java name). Prefer {@link getCameraToNDC}.
 * @deprecated
 * @param {Camera} cam - The camera
 * @param {number} aspectRatio - The aspect ratio
 * @param {number} which - MIDDLE_EYE, LEFT_EYE, or RIGHT_EYE
 * @returns {number[]} 4x4 transformation matrix
 */
export function getCameraToNDCWithEye(cam, aspectRatio, which) {
  return getCameraToNDC(cam, aspectRatio, which);
}

/**
 * Calculate a 4x4 projection matrix for this camera.
 * 
 * If which is MIDDLE_EYE, calculate a normal "monocular" camera. If which is
 * LEFT_EYE or RIGHT_EYE, calculate the projection matrix corresponding to the
 * given eye of a stereo-ocular camera.
 * 
 * The stereo case can be derived from the monocular case as follows:
 * Define V to be the intersection of the viewing frustum with the plane z = focus.
 * Second, define the positions Pl = (d,0,0,0) and Pr = (-d,0,0,0) where d = eyeSeparation/2.0.
 * Then the position of the left eye in camera coordinates is O.Pl (where O is the camera's
 * orientation matrix, or the identity matrix if none has been set), and similarly for the right eye.
 * Then the viewing frustum for the left eye is the unique viewing frustum determined by the
 * position at the left (right) eye and the rectangle V; similarly for the right eye.
 * 
 * In plain English, the monocular, left, and right views all show the same picture if the world
 * lies in the z = focus plane. This plane is in fact the focal plane in this sense.
 * 
 * @param {Camera} cam
 * @param {number} aspectRatio
 * @param {number} which
 * @param {number} metric
 * @returns {number[]} 4x4 transformation matrix
 */
function _getCameraToNDCImpl(cam, aspectRatio, which, metric) {
  const viewPort = getViewport(cam, aspectRatio);
  
  if (which === MIDDLE_EYE) {
    let cameraToNDC = null;
    if (cam.isPerspective()) {
      cameraToNDC = P3.makePerspectiveProjectionMatrix(null, viewPort, cam.getNear(), cam.getFar());
    } else {
      cameraToNDC = P3.makeOrthographicProjectionMatrix(null, viewPort, cam.getNear(), cam.getFar());
    }
    return cameraToNDC;
  }
  
  // Stereo mode
  const eyePosition = getEyePosition(cam, which);
  // TODO make this work also for non-euclidean cameras
  const moveToEye = P3.makeTranslationMatrix(null, eyePosition, metric);
  const newVP = getOffAxisViewPort(cam, viewPort, eyePosition);
  // TODO should we adjust near and far?
  const c2ndc = P3.makePerspectiveProjectionMatrix(null, newVP, cam.getNear(), cam.getFar());
  const iMoveToEye = Rn.inverse(null, moveToEye);
  const ret = Rn.times(null, c2ndc, iMoveToEye);
  return ret;
}

/**
 * Backward-compatible wrapper (non-Java name). Prefer {@link getCameraToNDC}.
 * @deprecated
 * @param {Camera} cam - The camera
 * @param {number} aspectRatio - The aspect ratio
 * @param {number} which - MIDDLE_EYE, LEFT_EYE, or RIGHT_EYE
 * @param {number} metric - The metric (Pn.EUCLIDEAN, etc.)
 * @returns {number[]} 4x4 transformation matrix
 */
export function getCameraToNDCFull(cam, aspectRatio, which, metric) {
  return _getCameraToNDCImpl(cam, aspectRatio, which, metric);
}

/**
 * Calculate NDC to camera transformation (inverse of getCameraToNDC).
 *
 * Java overloads collapsed into one runtime-dispatch function:
 * - getNDCToCamera(v: Viewer): number[]
 * - getNDCToCamera(cam: Camera, aspectRatio: number): number[]
 *
 * @param {Viewer|Camera} arg0 - Viewer or Camera
 * @param {number} [arg1] - aspectRatio (when arg0 is Camera)
 * @returns {number[]} 4x4 transformation matrix
 */
export function getNDCToCamera(arg0, arg1) {
  // Viewer signature
  if (arg0 != null && typeof arg0.getCameraPath === 'function') {
    return Rn.inverse(null, getCameraToNDC(arg0));
  }

  // Camera signature
  /** @type {Camera} */ // @ts-ignore
  const cam = arg0;
  const aspectRatio = /** @type {number} */ (arg1);
  return Rn.inverse(null, getCameraToNDC(cam, aspectRatio));
}

/**
 * Backward-compatible wrapper (non-Java name). Prefer {@link getNDCToCamera}.
 * @deprecated
 * @param {Camera} cam - The camera
 * @param {number} aspectRatio - The aspect ratio
 * @returns {number[]} 4x4 transformation matrix
 */
export function getNDCToCameraWithAspect(cam, aspectRatio) {
  return getNDCToCamera(cam, aspectRatio);
}

/**
 * Determine the viewport of the given camera: the intersection of the viewing frustum
 * with the z=1 plane.
 * 
 * @param {Camera} cam - The camera
 * @param {number} aspectRatio - The aspect ratio
 * @returns {Rectangle2D} The viewport rectangle
 */
export function getViewport(cam, aspectRatio) {
  let viewPort = null;
  
  if (cam.isOnAxis() || cam.getViewPort() == null) {
    viewPort = new Rectangle2D();
    let hwidth = Math.tan((Math.PI / 180.0) * cam.getFieldOfView() / 2.0);
    if (!cam.isPerspective()) {
      hwidth *= cam.getFocus();
    }
    if (aspectRatio > 1.0) {
      viewPort.setFrameFromDiagonal(
        -hwidth * aspectRatio, -hwidth,
        hwidth * aspectRatio, hwidth
      );
    } else {
      viewPort.setFrameFromDiagonal(
        -hwidth, -hwidth / aspectRatio,
        hwidth, hwidth / aspectRatio
      );
    }
  } else {
    viewPort = cam.getViewPort();
  }
  
  return viewPort;
}

/**
 * A method required for calculating cam2NDC transformation for an off-axis camera.
 * NOTE: a stereo camera is an off-axis camera.
 * 
 * @param {Camera} cam - The camera
 * @param {Rectangle2D} viewPort - The viewport
 * @param {number[]} eyePosition - The eye position [x, y, z, w]
 * @returns {Rectangle2D} The adjusted viewport
 */
export function getOffAxisViewPort(cam, viewPort, eyePosition) {
  const x = eyePosition[0];
  const y = eyePosition[1];
  const z = eyePosition[2];
  const newVP = new Rectangle2D();
  const focus = cam.getFocus();
  const newFocus = focus + z;
  const fscale = 1.0 / newFocus;
  
  // We want the slice of the non-stereo frustum at z = focus to be also a slice
  // of the new, stereo frustum. Make that happen:
  // Scale the camera viewport to lie in the z=focus plane,
  // translate it into the coordinates of the eye position (left or right),
  // then project it onto the z=1 plane in this coordinate system.
  newVP.setFrameFromDiagonal(
    fscale * (viewPort.getMinX() * focus - x),
    fscale * (viewPort.getMinY() * focus - y),
    fscale * (viewPort.getMaxX() * focus - x),
    fscale * (viewPort.getMaxY() * focus - y)
  );
  
  return newVP;
}

/**
 * A method required for calculating cam2NDC for a CAVE-like environment.
 * 
 * @param {Camera} cam - The camera
 * @param {number} which - MIDDLE_EYE, LEFT_EYE, or RIGHT_EYE
 * @returns {number[]} Eye position [x, y, z, w]
 */
export function getEyePosition(cam, which) {
  if (which === MIDDLE_EYE) {
    return [0, 0, 0, 1];
  }
  
  const factor = (which === LEFT_EYE) ? -1 : 1;
  const eyePosition = [factor * cam.getEyeSeparation() / 2.0, 0, 0, 0];
  
  if (cam.getOrientationMatrix() != null) {
    Rn.matrixTimesVector(eyePosition, cam.getOrientationMatrix(), eyePosition);
    Pn.dehomogenize(eyePosition, eyePosition);
  }
  
  if (eyePosition[3] === 0.0) {
    eyePosition[3] = 1.0;
  }
  
  return eyePosition;
}

/**
 * Encompass the world displayed by a viewer and possibly set derived parameters
 * in the camera.
 *
 * Java overloads collapsed into one runtime-dispatch function:
 * - encompass(viewer: Viewer): void
 * - encompass(viewer: Viewer, sgc: SceneGraphComponent, setStereoParameters: boolean): void
 * - encompass(viewer: Viewer, sgc: SceneGraphComponent, setStereoParameters: boolean, metric: number): void
 * - encompass(avatarPath: SceneGraphPath, scene: SceneGraphPath, cameraPath: SceneGraphPath, margin: number, metric: number): void
 *
 * Note: The SceneGraphPath-based variants delegate to EncompassFactory in Java. Since EncompassFactory
 * has not been translated yet, those variants are currently unimplemented here.
 *
 * @param {Viewer|SceneGraphPath} arg0
 * @param {*} [arg1]
 * @param {*} [arg2]
 * @param {*} [arg3]
 * @param {*} [arg4]
 */
export function encompass(arg0, arg1, arg2, arg3, arg4) {
  // Viewer signature(s)
  if (arg0 != null && typeof arg0.getCameraPath === 'function') {
    /** @type {Viewer} */ // @ts-ignore
    const viewer = arg0;

    // encompass(viewer)
    if (arg1 == null) {
      _encompassViewer(viewer);
      return;
    }

    // encompass(viewer, sgc, setStereoParameters[, metric])
    /** @type {SceneGraphComponent} */ // @ts-ignore
    const sgc = arg1;
    const setStereoParameters = Boolean(arg2);
    const metric = (arg3 != null) ? /** @type {number} */ (arg3) : Pn.EUCLIDEAN;
    _encompassViewer(viewer, sgc, setStereoParameters, metric);
    return;
  }

  // SceneGraphPath signature(s)
  if (arg0 != null && typeof arg0.getMatrix === 'function' && typeof arg0.getInverseMatrix === 'function') {
    // encompass(avatarPath, scene, cameraPath, margin, metric) in Java delegates to EncompassFactory.
    // TODO: Implement once EncompassFactory is translated.
    const avatarPath = arg0;
    const scenePath = arg1;
    const cameraPath = arg2;
    const margin = (arg3 != null) ? arg3 : 0.0;
    const metric = (arg4 != null) ? arg4 : Pn.EUCLIDEAN;
    const ef = new EncompassFactory();
    ef.setAvatarPath(avatarPath);
    ef.setScenePath(scenePath);
    ef.setCameraPath(cameraPath);
    ef.setMargin(margin);
    ef.setMetric(metric);
    ef.update();
    return;
  }

  throw new Error('Invalid arguments to encompass(...)');
}

/**
 * Internal helper implementing the Viewer-based encompass overloads from Java.
 *
 * - _encompassViewer(viewer) matches Java encompass(Viewer)
 * - _encompassViewer(viewer, sgc, setStereoParameters, metric) matches Java
 *   encompass(Viewer, SceneGraphComponent, boolean, int)
 *
 * @param {Viewer} viewer
 * @param {SceneGraphComponent} [sgc]
 * @param {boolean} [setStereoParameters]
 * @param {number} [metric]
 */
function _encompassViewer(viewer, sgc, setStereoParameters, metric) {
  // encompass(Viewer)
  if (sgc == null) {
    // remove camera from the sceneRoot and encompass the result
    const cp = viewer.getCameraPath();
    if (cp == null) throw new Error('camerapath == null');
    if (cp.getLength() < 3) {
      throw new Error("can't encompass: possibly Camera attached to root");
    }

    // Second element of camerapath: the "cameraBranch"
    const cameraBranch = /** @type {SceneGraphComponent} */ (cp.get(1));
    const root = viewer.getSceneRoot();
    if (root == null) throw new Error('sceneRoot == null');

    let m = Pn.EUCLIDEAN;
    const app = root.getAppearance?.() ?? null;
    if (app != null) {
      const foo = app.getAttribute(CommonAttributes.METRIC);
      if (typeof foo === 'number') {
        m = foo;
      }
    }

    let visible = false;
    try {
      // TODO this is always true if camerapath starts at root
      if (root.isDirectAncestor(cameraBranch)) {
        visible = cameraBranch.isVisible();
        cameraBranch.setVisible(false);
      }
      _encompassViewer(viewer, root, true, m);
    } finally {
      cameraBranch.setVisible(visible);
    }
    return;
  }

  // encompass(Viewer, SceneGraphComponent, boolean, int)
  const m = metric ?? Pn.EUCLIDEAN;
  const setStereo = Boolean(setStereoParameters);

  /** @type {Rectangle3D} */
  const worldBox = BoundingBoxUtility.calculateBoundingBox(sgc);
  console.log('worldBox = ', worldBox.toString());
  if (worldBox == null || worldBox.isEmpty()) {
    console.warn('encompass: empty bounding box');
    return;
  }

  // Transform world bounding box into avatar coordinates
  /** @type {SceneGraphPath} */ // @ts-ignore
  const w2a = viewer.getCameraPath().popNew();
  w2a.pop();
  const w2ava = w2a.getInverseMatrix(null);
  worldBox.transformByMatrix(worldBox, w2ava);

  if (worldBox == null || worldBox.isEmpty()) {
    console.warn('encompass: empty bounding box');
    return;
  }

  const cam = getCamera(viewer);

  // the extent in camera coordinates
  const extent = worldBox.getExtent();
  const ww = (extent[1] > extent[0]) ? extent[1] : extent[0];
  const focus = 0.5 * ww / Math.tan(Math.PI * (cam.getFieldOfView()) / 360.0);

  const to = worldBox.getCenter();
  to[2] += extent[2] * 0.5;

  const tofrom = [0, 0, focus];
  const from = Rn.add(null, to, tofrom);

  const newCamToWorld = P3.makeTranslationMatrix(null, from, m);
  const newWorldToCam = Rn.inverse(null, newCamToWorld);
  const camNode = getCameraNode(viewer);
  camNode.getTransformation().setMatrix(newCamToWorld);

   console.log('newWorldToCam = ', Rn.matrixToString(newWorldToCam));
  console.log('worldBox.getCenter() = ', worldBox.getCenter());
  const centerWorld = Rn.matrixTimesVector(null, newWorldToCam, worldBox.getCenter());
  if (setStereo) {
    cam.setFocus(Math.abs(centerWorld[2]));
    cam.setEyeSeparation(cam.getFocus() / 12.0);
  }

  // TODO figure out why setting the near/far clipping planes sometimes doesn't work
  const cameraBox = worldBox.transformByMatrix(null, newWorldToCam);
  const zmin = cameraBox.getMinZ();
  const zmax = cameraBox.getMaxZ();

  // set the near and far parameters based on the transformed bounding box.
  // be generous but not too generous: openGL rendering quality depends on somewhat tight bounds here.
  if (zmax < 0.0) cam.setNear(-0.5 * zmax);
  if (zmin < 0.0) cam.setFar(-2.0 * zmin);
}

// Columns of standardFrame are the standard xyz axes + origin in homogeneous coordinates.
// This is Rn.transpose of [[1,0,0,1],[0,1,0,1],[0,0,1,1],[0,0,0,1]].
const standardFrame = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  1, 1, 1, 1
];

/**
 * Compute the maximum xy extent in NDC coordinates of the three unit vectors in object space.
 * @param {number[]} o2ndc - object to normalized device coordinate transformation (4x4)
 * @returns {number}
 */
export function getNDCExtent(o2ndc) {
  const imageFrame = new Matrix(Rn.times(null, o2ndc, standardFrame));
  const images = [];
  for (let i = 0; i < 4; i++) {
    images[i] = Pn.dehomogenize(null, imageFrame.getColumn(i));
  }
  let d = 0.0;
  for (let i = 0; i < 3; i++) {
    const tmp = Rn.subtract(null, images[3], images[i]);
    const t = Math.sqrt(Rn.innerProductN(tmp, tmp, 2));
    if (t > d) d = t;
  }
  return d;
}

/**
 * Extract the average scaling factor from a 4x4 transformation matrix.
 * @param {number[]} o2w - 4x4 transformation matrix
 * @param {number} metric - the metric type (Pn.EUCLIDEAN, etc.)
 * @returns {number}
 */
export function getScalingFactor(o2w, metric) {
  const fm = new FactoredMatrix(o2w, metric);
  const sv = fm.getStretch();
  return (sv[0] + sv[1] + sv[2]) / 3.0;
}

