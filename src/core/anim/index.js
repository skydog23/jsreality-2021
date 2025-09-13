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
    KeyFrameAnimatedTransformation,
    TimeMapper,
    FramedCurve,
    ControlPoint
} from './core/index.js';

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
