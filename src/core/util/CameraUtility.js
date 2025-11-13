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

/** @typedef {import('../scene/Viewer.js').Viewer} Viewer */
/** @typedef {import('../scene/Camera.js').Camera} Camera */

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
  // The camera path typically ends with a SceneGraphComponent that contains the camera
  if (lastElement && lastElement.getCamera) {
    return lastElement.getCamera();
  }
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
 * for a given viewer.
 * @param {Viewer} v - The viewer
 * @returns {number[]} 4x4 transformation matrix
 */
export function getCameraToNDC(v) {
  const cam = getCamera(v);
  const aspectRatio = getAspectRatio(v);
  return getCameraToNDCWithAspect(cam, aspectRatio);
}

/**
 * Calculate camera to NDC transformation with explicit aspect ratio.
 * @param {Camera} cam - The camera
 * @param {number} aspectRatio - The aspect ratio
 * @returns {number[]} 4x4 transformation matrix
 */
export function getCameraToNDCWithAspect(cam, aspectRatio) {
  return getCameraToNDCWithEye(cam, aspectRatio, MIDDLE_EYE);
}

/**
 * Calculate camera to NDC transformation for a specific eye (stereo support).
 * @param {Camera} cam - The camera
 * @param {number} aspectRatio - The aspect ratio
 * @param {number} which - MIDDLE_EYE, LEFT_EYE, or RIGHT_EYE
 * @returns {number[]} 4x4 transformation matrix
 */
export function getCameraToNDCWithEye(cam, aspectRatio, which) {
  return getCameraToNDCFull(cam, aspectRatio, which, Pn.EUCLIDEAN);
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
 * @param {Camera} cam - The camera
 * @param {number} aspectRatio - The aspect ratio
 * @param {number} which - MIDDLE_EYE, LEFT_EYE, or RIGHT_EYE
 * @param {number} metric - The metric (Pn.EUCLIDEAN, etc.)
 * @returns {number[]} 4x4 transformation matrix
 */
export function getCameraToNDCFull(cam, aspectRatio, which, metric) {
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
 * Calculate NDC to camera transformation (inverse of getCameraToNDC).
 * @param {Viewer} v - The viewer
 * @returns {number[]} 4x4 transformation matrix
 */
export function getNDCToCamera(v) {
  return Rn.inverse(null, getCameraToNDC(v));
}

/**
 * Calculate NDC to camera transformation with explicit aspect ratio.
 * @param {Camera} cam - The camera
 * @param {number} aspectRatio - The aspect ratio
 * @returns {number[]} 4x4 transformation matrix
 */
export function getNDCToCameraWithAspect(cam, aspectRatio) {
  return Rn.inverse(null, getCameraToNDCWithAspect(cam, aspectRatio));
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

