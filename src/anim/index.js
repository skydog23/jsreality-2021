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
 * @fileoverview Animation system for jSReality.
 * @author Charles Gunn
 */

// Core animation interfaces and classes
export { 
    Named, 
    Settable, 
    Animated, 
    TimeDescriptor, 
    KeyFrame,
    KeyFrameAnimated,
    SortedKeyFrameList,
    AnimatedDelegate,
    KeyFrameAnimatedDelegate,
    SimpleKeyFrameAnimated,
    KeyFrameAnimatedDouble,
    KeyFrameAnimatedBoolean,
    KeyFrameAnimatedInteger,
    KeyFrameAnimatedColor,
    KeyFrameAnimatedIsometry,
    TimeMapper,
    FramedCurve,
    ControlPoint
} from './core/index.js';

// Scenegraph adapters (depend on src/core/scene/*)
export { KeyFrameAnimatedTransformation } from './scenegraph/index.js';

// Animation utilities
export { 
    AnimationUtility,
    InterpolationTypes,
    BoundaryModes,
    PlaybackModes,
    playbackModeNames
} from './util/index.js';

// Animation sets
export {
    AbstractAnimatedSet,
    AnimatedDoubleSet,
    AnimatedDoubleArraySet,
    AnimatedDoubleArrayArraySet,
    AnimatedRectangle2DSet
} from './sets/index.js';
