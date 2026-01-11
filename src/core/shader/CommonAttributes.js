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
 * Standard attributes which appear in Appearance instances.
 * 
 * Since Appearance is based on <String, value> pairs, it's important to make sure that
 * you are using the right strings as keys. This class provides a list of all the standard
 * attributes to help avoid mistakes in typing, etc.
 * 
 * JavaScript translation of jReality's CommonAttributes.
 * 
 * @author JavaScript translation
 */

import { Color, BLACK, BLUE, CYAN, DARK_GRAY, GRAY, GREEN, LIGHT_GRAY, MAGENTA, ORANGE, PINK, RED, WHITE, YELLOW } from '../util/Color.js';
import { Font } from '../util/Font.js';

// Background and rendering optimization attributes
export const SMALL_OBJ_OPTIMIZATION = "smallObjectsOptimization";
export const STEREOGRAM_RENDERING = "stereogramRendering";
export const STEREOGRAM_NUM_SLICES = "stereogramNumSlices";

export const SMALL_OBJ_OPTIMIZATION_DEFAULT = true;
export const STEREOGRAM_RENDERING_DEFAULT = false;
export const STEREOGRAM_NUM_SLICES_DEFAULT = 2;

// Background attributes
export const BACKGROUND_COLOR = "backgroundColor";
export const BACKGROUND_COLOR_DEFAULT = new Color(225, 225, 225);
export const BACKGROUND_COLORS = "backgroundColors";
export const BACKGROUND_COLORS_STRETCH_X = "backgroundColorsStretchX";
export const BACKGROUND_COLORS_STRETCH_Y = "backgroundColorsStretchY";
export const BACKGROUND_TEXTURE2D = "backgroundTexture2D";
export const SKY_BOX = "skyBox";

// Fog attributes
export const FOG_ENABLED = "fogEnabled";
export const FOG_ENABLED_DEFAULT = false;
export const FOG_COLOR = "fogColor";
export const FOG_DENSITY = "fogDensity";
export const FOG_BEGIN = "fogBegin";
export const FOG_END = "fogEnd";
export const FOG_MODE = "fogMode";
export const FOG_DENSITY_DEFAULT = 0.1;
export const FOG_MODE_DEFAULT = 0;

// Rendering hints that have to be in the root appearance to take effect
export const ONE_TEXTURE2D_PER_IMAGE = "oneTexture2DPerImage";
export const CLEAR_COLOR_BUFFER = "clearColorBuffer";
export const FORCE_RESIDENT_TEXTURES = "forceResidentTextures";
export const USE_OLD_TRANSPARENCY = "useOldTransparency";
export const ANTI_ALIASING_FACTOR = "antiAliasingFactor";
export const ANTI_ALIASING_FACTOR_DEFAULT = 2;

// Rendering hints that can appear anywhere in the scene graph
export const LIGHTING_ENABLED = "lightingEnabled";
export const LIGHTING_ENABLED_DEFAULT = true;
export const ANTIALIASING_ENABLED = "antiAliasing";
export const ANTIALIASING_ENABLED_DEFAULT = false;
export const TRANSPARENCY_ENABLED = "transparencyEnabled";
export const ADDITIVE_BLENDING_ENABLED = "additiveBlendingEnabled";
export const Z_BUFFER_ENABLED = "zBufferEnabled";
export const LEVEL_OF_DETAIL = "levelOfDetail";
export const LEVEL_OF_DETAIL_DEFAULT = 0.0;
export const OPAQUE_TUBES_AND_SPHERES = "opaqueTubesAndSpheres";
export const OPAQUE_TUBES_AND_SPHERES_DEFAULT = false;
export const CENTER_ON_BOUNDING_BOX = "centerOnBoundingBox";
export const BACKEND_RETAIN_GEOMETRY = "rendermanRetainGeometry";
export const LOCAL_LIGHT_MODEL = "localLightModel";
export const RADII_WORLD_COORDINATES = "radiiWorldCoordinates";
export const RADII_WORLD_COORDINATES_DEFAULT = false;

// OpenGL specific hints
export const DEPTH_FUDGE_FACTOR = "depthFudgeFactor";
export const IGNORE_ALPHA0 = "ignoreAlpha0";
export const BACK_FACE_CULLING_ENABLED = "backFaceCulling";
export const FLIP_NORMALS_ENABLED = "flipNormals";
export const MANY_DISPLAY_LISTS = "manyDisplayLists";
export const ANY_DISPLAY_LISTS = "anyDisplayLists";
export const SEPARATE_SPECULAR_COLOR = "separateSpecularColor";
export const COMPONENT_DISPLAY_LISTS = "componentDisplayLists";
export const USE_GLSL = "useGLSL";

// Backwards-compatible aliases (older code may use these names)
export const FLIP_NORMALS = FLIP_NORMALS_ENABLED;

// Default geometry shader
export const FACE_DRAW = "showFaces";
export const FACE_DRAW_DEFAULT = true;
export const EDGE_DRAW = "showLines";
export const EDGE_DRAW_DEFAULT = true;
export const VERTEX_DRAW = "showPoints";
export const VERTEX_DRAW_DEFAULT = true;
export const POINT = "point";
export const LINE = "line";
export const POLYGON = "polygon";
export const VERTEX = "vertex";
export const VOLUME = "volume";
export const TEXT = "text";

const SHADER = "Shader";
export const POINT_SHADER = POINT + SHADER;
export const LINE_SHADER = LINE + SHADER;
export const POLYGON_SHADER = POLYGON + SHADER;
export const VERTEX_SHADER = VERTEX + SHADER;
export const VOLUME_SHADER = VOLUME + SHADER;
export const TEXT_SHADER = TEXT + SHADER;

// Default point shader
export const SPRITES_DRAW = "spritesDraw";
export const SPHERES_DRAW = "spheresDraw";
export const SPHERES_DRAW_DEFAULT = true;
export const POINT_RADIUS = "pointRadius";
export const POINT_RADIUS_DEFAULT = 0.0125;
export const POINT_SIZE = "pointSize";
export const POINT_SIZE_DEFAULT = 2.0;
export const POINT_DIFFUSE_COLOR_DEFAULT = RED;
export const SPHERE_RESOLUTION = "sphereResolution";
export const ATTENUATE_POINT_SIZE = "attenuatePointSize";
export const ATTENUATE_POINT_SIZE_DEFAULT = true;

// Default line shader
export const TUBES_DRAW = "tubeDraw";
export const TUBES_DRAW_DEFAULT = true;
export const TUBE_RADIUS = "tubeRadius";
export const TUBE_RADIUS_DEFAULT = 0.02;
export const TUBE_STYLE = "tubeStyle";
// Note: TUBE_STYLE_DEFAULT would require FrameFieldType - omitted for now
export const VERTEX_COLORS_ENABLED = "vertexColors";
export const VERTEX_COLORS_ENABLED_DEFAULT = false;
export const SMOOTH_LINE_SHADING = "smoothLineShading";
export const SMOOTH_LINE_SHADING_DEFAULT = false;
export const LINE_WIDTH = "lineWidth";
export const LINE_WIDTH_DEFAULT = 1.0;
// Screen-space line smoothing (used by WebGL quad-lines and similar techniques)
export const EDGE_FADE = "edgeFade";
export const EDGE_FADE_DEFAULT = 0.1;
// Backwards-compatible aliases (some code used these names)
export const LINE_EDGE_FADE = EDGE_FADE;
export const LINE_EDGE_FADE_DEFAULT = EDGE_FADE_DEFAULT;
export const NORMAL_SCALE = "normalScale";
export const LINE_STIPPLE = "lineStipple";
export const LINE_STIPPLE_FACTOR = "lineStippleFactor";
export const LINE_STIPPLE_PATTERN = "lineStipplePattern";
export const LINE_DIFFUSE_COLOR_DEFAULT = BLACK;
export const POINT_SPRITE = "pointSprite";
export const LINE_LIGHTING_ENABLED = "lineLighting";
export const LINE_LIGHTING_ENABLED_DEFAULT = false;

// Default polygon shader
export const SMOOTH_SHADING = "smoothShading";
export const SMOOTH_SHADING_DEFAULT = true;
export const TEXTURE_2D = "texture2d";
export const TEXTURE_2D_1 = "texture2d[1]";
export const TEXTURE_2D_2 = "texture2d[2]";
export const TEXTURE_2D_3 = "texture2d[3]";
export const REFLECTION_MAP = "reflectionMap";
export const TRANSPARENCY = "transparency";
export const TRANSPARENCY_DEFAULT = 0.0;
export const AMBIENT_COLOR = "ambientColor";
export const AMBIENT_COLOR_DEFAULT = WHITE;
export const DIFFUSE_COLOR = "diffuseColor";
export const DIFFUSE_COLOR_DEFAULT = BLUE;
export const SPECULAR_COLOR = "specularColor";
export const SPECULAR_COLOR_DEFAULT = WHITE;
export const SPECULAR_EXPONENT = "specularExponent";
export const SPECULAR_EXPONENT_DEFAULT = 60.0;
export const AMBIENT_COEFFICIENT = "ambientCoefficient";
export const AMBIENT_COEFFICIENT_DEFAULT = 0.0;
export const DIFFUSE_COEFFICIENT = "diffuseCoefficient";
export const DIFFUSE_COEFFICIENT_DEFAULT = 1.0;
export const SPECULAR_COEFFICIENT = "specularCoefficient";
export const SPECULAR_COEFFICIENT_DEFAULT = 0.7;
export const LIGHT_DIRECTION = "lightDirection";

// Implode polygon shader
export const IMPLODE = "implode";
export const IMPLODE_FACTOR = "implodeFactor";
export const IMPLODE_FACTOR_DEFAULT = 0.6;

// Text shader constants
export const SCALE = "scale";
export const OFFSET = "offset";
export const ALIGNMENT = "alignment";
export const FONT = "font";
export const TEXT_SCALE = "scale";
export const TEXT_SCALE_DEFAULT = 0.01;
export const TEXT_OFFSET = "offset";
export const TEXT_ALIGNMENT = "alignment";

// SwingConstants equivalent for alignment
export const NORTH_EAST = 3; // SwingConstants.NORTH_EAST equivalent
export const TEXT_ALIGNMENT_DEFAULT = NORTH_EAST;
export const TEXT_OFFSET_DEFAULT = [0.0, 0.0, 0.0];
export const TEXT_FONT = "font";
export const TEXT_COLOR = TEXT_SHADER + ".diffuseColor";

// Miscellaneous
export const RENDER_S3 = "renderS3";
export const PICKABLE = "pickable";
export const SIGNATURE = "metric"; // @deprecated
export const METRIC = "metric";
export const INFO_STRING = "infoString";
export const GLSL = "glsl";

// RenderMan backend attributes
export const RMAN_ATTRIBUTE = "rendermanAttribute";
export const RMAN_SHADOWS_ENABLED = "rendermanShadowsEnabled";
export const RMAN_RAY_TRACING_REFLECTIONS = "rendermanRayTracingReflectionsEnabled";
export const RMAN_RAY_TRACING_VOLUMES = "rendermanRayTracingVolumesEnabled";
export const RMAN_SURFACE_SHADER = "rendermanSurfaceShader";
export const RMAN_SL_SHADER = "rendermanSLShader";
export const RMAN_DISPLACEMENT_SHADER = "rendermanDisplacementShader";
export const RMAN_IMAGER_SHADER = "rendermanImagerShader";
export const RMAN_VOLUME_EXTERIOR_SHADER = "rendermanVolumeExteriorShader";
export const RMAN_VOLUME_INTERIOR_SHADER = "rendermanVolumeInteriorShader";
export const RMAN_VOLUME_ATMOSPHERE_SHADER = "rendermanVolumeAtmosphereShader";
export const RMAN_LIGHT_SHADER = "rendermanLightShader";
export const RMAN_SEARCHPATH_SHADER = "rendermanSearchpathShader";
export const RMAN_TEXTURE_FILE = "rendermanTexFile";
export const RMAN_TEXTURE_FILE_SUFFIX = "rendermanTextureFileSuffix";
export const RMAN_REFLECTIONMAP_FILE = "rendermanReflectionmapFile";
export const RMAN_GLOBAL_INCLUDE_FILE = "rendermanGlobalIncludeFile";
export const RMAN_OUTPUT_DISPLAY_FORMAT = "rendermanOutputDisplayFormat";
export const RMAN_PROXY_COMMAND = "rendermanProxyCommand";
export const RMAN_ARCHIVE_CURRENT_NODE = "rendermanArchiveCurrentNode";
export const RMAN_MAX_EYE_SPLITS = "rendermanMaxEyeSplits";

// Haptic attributes
export const HAPTIC_SHADER = "hapticShader";
export const HAPTIC_ENABLED = "hapticEnabled";
export const HAPTIC_TOUCHABLE_FRONT = "hapticToutchableFront";
export const HAPTIC_TOUCHABLE_FRONT_DEFAULT = true;
export const HAPTIC_TOUCHABLE_BACK = "hapticToutchableBack";
export const HAPTIC_TOUCHABLE_BACK_DEFAULT = false;
export const HAPTIC_ENABLED_DEFAULT = false;
export const HAPTIC_STIFFNESS = "stiffness";
export const HAPTIC_STIFFNESS_DEFAULT = 0.3;
export const HAPTIC_DAMPING = "damping";
export const HAPTIC_DAMPING_DEFAULT = 0.1;
export const HAPTIC_STATIC_FRICTION = "staticFriction";
export const HAPTIC_STATIC_FRICTION_DEFAULT = 0.2;
export const HAPTIC_DYNAMIC_FRICTION = "dynamicFriction";
export const HAPTIC_DYNAMIC_FRICTION_DEFAULT = 0.3;

// Labels
export const SHOW_LABELS_DEFAULT = true;
export const SHOW_LABELS = "showLabels";

/**
 * Get default value for a given attribute key
 * @param {string} key - The attribute key
 * @param {*} value - Fallback value if no default is found
 * @returns {*} Default value for the key or the fallback value
 */
export function getDefault(key, value) {
    switch (key) {
        case SHOW_LABELS:
            return SHOW_LABELS_DEFAULT;
        case "reflectionMap":
            return false;
        case "ambientColor":
            return AMBIENT_COLOR_DEFAULT;
        case "diffuseColor":
            return DIFFUSE_COLOR_DEFAULT;
        case "specularColor":
            return SPECULAR_COLOR_DEFAULT;
        case "specularCoefficient":
            return SPECULAR_COEFFICIENT_DEFAULT;
        case "diffuseCoefficient":
            return DIFFUSE_COEFFICIENT_DEFAULT;
        case "ambientCoefficient":
            return AMBIENT_COEFFICIENT_DEFAULT;
        case "specularExponent":
            return SPECULAR_EXPONENT_DEFAULT;
        case "backgroundColors":
            return BACKGROUND_COLOR_DEFAULT;
        case "fogEnabled":
            return FOG_ENABLED_DEFAULT;
        case "fogDensity":
            return FOG_DENSITY_DEFAULT;
        case "levelOfDetail":
            return LEVEL_OF_DETAIL_DEFAULT;
        case "opaqueTubesAndSpheres":
            return OPAQUE_TUBES_AND_SPHERES_DEFAULT;
        case "radiiWorldCoordinates":
            return RADII_WORLD_COORDINATES_DEFAULT;
        case "spheresDraw":
            return SPHERES_DRAW_DEFAULT;
        case "pointRadius":
            return POINT_RADIUS_DEFAULT;
        case "pointSize":
            return POINT_SIZE_DEFAULT;
        case "pointDiffuseColor":
            return POINT_DIFFUSE_COLOR_DEFAULT;
        case "attenuatePointSize":
            return ATTENUATE_POINT_SIZE_DEFAULT;
        case "tubesDraw":
            return TUBES_DRAW_DEFAULT;
        case "tubeRadius":
            return TUBE_RADIUS_DEFAULT;
        case TUBE_STYLE:
            return null; // TUBE_STYLE_DEFAULT requires FrameFieldType
        case "VERTEX_COLORS_ENABLED":
            return VERTEX_COLORS_ENABLED_DEFAULT;
        case SMOOTH_LINE_SHADING:
            return SMOOTH_LINE_SHADING_DEFAULT;
        case LINE_WIDTH:
            return LINE_WIDTH_DEFAULT;
        case "lineDiffuseColor":
            return LINE_DIFFUSE_COLOR_DEFAULT;
        case SMOOTH_SHADING:
            return SMOOTH_SHADING_DEFAULT;
        case VERTEX_COLORS_ENABLED:
            return VERTEX_COLORS_ENABLED_DEFAULT;
        case TRANSPARENCY:
            return TRANSPARENCY_DEFAULT;
        case LINE_LIGHTING_ENABLED:
            return LINE_LIGHTING_ENABLED_DEFAULT;
        case LIGHTING_ENABLED:
            return LIGHTING_ENABLED_DEFAULT;
        case FONT:
            return new Font(Font.SANS_SERIF, Font.BOLD, 30);
        case TEXT_SCALE:
            return TEXT_SCALE_DEFAULT;
        case TEXT_OFFSET:
            return TEXT_OFFSET_DEFAULT;
        case TEXT_ALIGNMENT:
            return TEXT_ALIGNMENT_DEFAULT;
        case SMALL_OBJ_OPTIMIZATION:
            return SMALL_OBJ_OPTIMIZATION_DEFAULT;
        case STEREOGRAM_RENDERING:
            return STEREOGRAM_RENDERING_DEFAULT;
        case STEREOGRAM_NUM_SLICES:
            return STEREOGRAM_NUM_SLICES_DEFAULT;
        case ANTI_ALIASING_FACTOR:
            return ANTI_ALIASING_FACTOR_DEFAULT;
        case ANTIALIASING_ENABLED:
            return ANTIALIASING_ENABLED_DEFAULT;
        default:
            return value;
    }
}
