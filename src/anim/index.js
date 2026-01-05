/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
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

// Animation GUI (DOM-free model/controller + recording state)
export {
    AnimationPanel,
    AnimationPanelEvent,
    EventType,
    AnimationPanelListenerImpl,
    AnimationPanelRecordListener,
    RecordingPreferences
} from './gui/index.js';
