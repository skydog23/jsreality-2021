/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import * as Pn from '../math/Pn.js';
import { Camera } from '../scene/Camera.js';

/**
 * Compatibility port of `charlesgunn.jreality.CameraUtilityOverflow`.
 */
export class CameraUtilityOverflow {
  static reset(camera, metric) {
    let near = 0.1;
    let far = 50.0;
    let fieldOfView = 60.0;
    let focus = 3.0;

    switch (metric) {
      case Pn.HYPERBOLIC:
        near = 0.01;
        far = 100.0;
        fieldOfView = 60.0;
        focus = 2.5;
        break;
      case Pn.ELLIPTIC:
        near = 0.01;
        far = -0.05;
        fieldOfView = 60.0;
        focus = 0.5;
        break;
      case Pn.EUCLIDEAN:
      default:
        near = 0.1;
        far = 50.0;
        fieldOfView = 60.0;
        focus = 3.0;
        break;
    }
    camera.setNear(near);
    camera.setFar(far);
    camera.setFocus(focus);
    camera.setFieldOfView(fieldOfView);
  }

  static isCameraPathValid(cameraPath) {
    return cameraPath != null
      && cameraPath.isValid?.()
      && (cameraPath.getLastElement?.() instanceof Camera);
  }
}

