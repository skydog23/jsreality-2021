// JavaScript port of jReality's Attribute constants
// Simplified string-based attributes for geometry data

/**
 * Standard geometry attribute names used throughout jReality.
 * These replace the Java Attribute singleton pattern with simple string constants.
 */
export const GeometryAttribute = {
  // Vertex attributes
  COORDINATES: 'coordinates',
  NORMALS: 'normals',
  COLORS: 'colors',
  TEXTURE_COORDINATES: 'texture coordinates',
  TEXTURE_COORDINATES1: 'texture coordinates 1',
  TEXTURE_COORDINATES2: 'texture coordinates 2',
  POINT_SIZE: 'pointSize',
  RELATIVE_RADII: 'relativeRadii',
  LABELS: 'labels',
  
  // Edge/Face attributes
  INDICES: 'indices',
  
  // Additional common attributes
  TANGENTS: 'tangents',
  BINORMALS: 'binormals'
};

/**
 * Create a custom attribute name (for extensibility)
 * @param {string} name - The attribute name
 * @returns {string} The attribute name (pass-through for consistency with Java API)
 */
export function attributeForName(name) {
  return name;
}

/**
 * Check if an attribute name is a standard geometry attribute
 * @param {string} attributeName - The attribute name to check
 * @returns {boolean} True if it's a standard attribute
 */
export function isStandardAttribute(attributeName) {
  return Object.values(GeometryAttribute).includes(attributeName);
}

/**
 * Get all standard attribute names
 * @returns {string[]} Array of all standard attribute names
 */
export function getAllStandardAttributes() {
  return Object.values(GeometryAttribute);
}
