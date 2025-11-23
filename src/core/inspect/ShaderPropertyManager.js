/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// Shader Property Manager - handles shader-specific property handling and tree node creation

import { Appearance, INHERITED } from '../scene/Appearance.js';
import { Color } from '../util/Color.js';
import { DefaultGeometryShader, DefaultPointShader, DefaultLineShader, DefaultPolygonShader, DefaultRenderingHintsShader, ShaderRegistry, ShaderUtility } from '../shader/index.js';
import { ImplodePolygonShader } from '../shader/ImplodePolygonShader.js';
import * as CommonAttributes from '../shader/CommonAttributes.js';
import { ShaderTreeNode } from './TreeViewManager.js';
import { WidgetFactory } from './WidgetFactory.js';
import { formatAttributeName } from './PropertyFormatters.js';

/**
 * Manages shader-specific property handling for the SceneGraphInspector
 */
export class ShaderPropertyManager {
  /**
   * @type {Map<Appearance, ShaderTreeNode[]>}
   */
  #shaderNodeCache = new Map();
  
  /**
   * @type {WidgetFactory}
   */
  #widgetFactory;
  
  /**
   * @type {Function}
   */
  #onPropertyChange;
  
  /**
   * @type {Function}
   */
  #onRefreshPropertyPanel;
  
  /**
   * @param {WidgetFactory} widgetFactory - Widget factory instance
   * @param {Function} onPropertyChange - Callback when a property changes
   * @param {Function} onRefreshPropertyPanel - Callback to refresh property panel
   */
  constructor(widgetFactory, onPropertyChange, onRefreshPropertyPanel) {
    this.#widgetFactory = widgetFactory;
    this.#onPropertyChange = onPropertyChange;
    this.#onRefreshPropertyPanel = onRefreshPropertyPanel;
  }
  
  /**
   * Create shader tree nodes for an appearance
   * This builds a hierarchy: Geometry Shader -> Point/Line/Polygon Shaders
   * Also creates a RenderingHintsShader node
   * @param {Appearance} appearance - The appearance
   * @returns {ShaderTreeNode[]|ShaderTreeNode|null} Array of shader nodes
   */
  createShaderTreeNodes(appearance) {
    // Get all attributes from the appearance first to check shader name
    const allAttributes = appearance.getAttributes();
    
    // First, check for polygon shader name (stored as CommonAttributes.POLYGON_SHADER itself)
    let polygonShaderName = 'default';
    const base = CommonAttributes.POLYGON_SHADER;
    if (allAttributes.has(base)) {
      const value = allAttributes.get(base);
      if (value !== INHERITED && typeof value === 'string') {
        polygonShaderName = value;
      }
    }
    // Try alternative keys
    if (polygonShaderName === 'default' && allAttributes.has(base + 'name')) {
      const value = allAttributes.get(base + 'name');
      if (value !== INHERITED && typeof value === 'string') {
        polygonShaderName = value;
      }
    }
    if (polygonShaderName === 'default' && allAttributes.has(ShaderUtility.nameSpace(base, 'name'))) {
      const value = allAttributes.get(ShaderUtility.nameSpace(base, 'name'));
      if (value !== INHERITED && typeof value === 'string') {
        polygonShaderName = value;
      }
    }
    
    // Check cache, but invalidate if shader name has changed
    let cachedNodes = this.#shaderNodeCache.get(appearance);
    if (cachedNodes) {
      // Find the polygon shader node in cached nodes
      const geomNode = cachedNodes.find(n => n.type === 'geometry');
      if (geomNode) {
        const cachedPolygonNode = geomNode.children.find(c => c.type === 'polygon');
        if (cachedPolygonNode) {
          // Check if cached schema matches current shader name
          const cachedSchema = cachedPolygonNode.schema;
          const cachedIsDefault = cachedSchema === DefaultPolygonShader;
          const currentIsDefault = polygonShaderName === 'default';
          
          // If shader type changed, invalidate cache
          if (cachedIsDefault !== currentIsDefault) {
            cachedNodes = null; // Force recreation
            this.#shaderNodeCache.delete(appearance);
          } else if (!currentIsDefault) {
            // Both are non-default, check if they match
            try {
              const currentSchema = ShaderRegistry.resolveShader('polygon', polygonShaderName);
              if (cachedSchema !== currentSchema) {
                cachedNodes = null; // Force recreation
                this.#shaderNodeCache.delete(appearance);
              }
            } catch (e) {
              // Shader not found, invalidate cache
              cachedNodes = null;
              this.#shaderNodeCache.delete(appearance);
            }
          }
        }
      }
    }
    
    if (cachedNodes) {
      // Nodes are cached and shader name matches
      return cachedNodes;
    }
    
    // Organize attributes by shader namespace
    const pointAttrs = new Map();
    const lineAttrs = new Map();
    const polygonAttrs = new Map();
    const geometryAttrs = new Map();
    const renderingHintsAttrs = new Map();
    
    const pointPrefix = CommonAttributes.POINT_SHADER + '.';
    const linePrefix = CommonAttributes.LINE_SHADER + '.';
    const polygonPrefix = CommonAttributes.POLYGON_SHADER + '.';
    
    // List of rendering hints attribute names (from DefaultRenderingHintsShader.ATTRIBUTES)
    const renderingHintsAttributeNames = new Set(DefaultRenderingHintsShader.ATTRIBUTES);
    
    for (const [key, value] of allAttributes) {
      if (key.startsWith(pointPrefix)) {
        const shortKey = key.substring(pointPrefix.length);
        pointAttrs.set(shortKey, value);
      } else if (key.startsWith(linePrefix)) {
        const shortKey = key.substring(linePrefix.length);
        lineAttrs.set(shortKey, value);
      } else if (key.startsWith(polygonPrefix)) {
        const shortKey = key.substring(polygonPrefix.length);
        polygonAttrs.set(shortKey, value);
      } else if (renderingHintsAttributeNames.has(key)) {
        // Rendering hints attributes (no prefix)
        renderingHintsAttrs.set(key, value);
      } else {
        // Geometry-level attributes (like vertexDraw, edgeDraw, faceDraw, polygonShader)
        // Skip the polygonShader name itself - it's not a geometry attribute to display
        if (key !== base && key !== base + 'name' && key !== ShaderUtility.nameSpace(base, 'name')) {
          geometryAttrs.set(key, value);
        }
      }
    }
    
    // Create simple shader data objects (not actual shader instances)
    const pointShaderData = Object.fromEntries(pointAttrs);
    const lineShaderData = Object.fromEntries(lineAttrs);
    const polygonShaderData = Object.fromEntries(polygonAttrs);
    const geometryShaderData = Object.fromEntries(geometryAttrs);
    const renderingHintsShaderData = Object.fromEntries(renderingHintsAttrs);
    
    // Create new geometry shader node
    const geomNode = new ShaderTreeNode(
      'Geometry Shader',
      'geometry',
      geometryShaderData, // Just the attributes map
      DefaultGeometryShader,
      appearance,
      '' // No prefix
    );
    
    /**
     * Convert schema type name to display name
     * Examples: "DefaultPolygonShader" -> "Default Polygon Shader"
     *           "ImplodePolygonShader" -> "Implode Polygon Shader"
     * @param {string} typeName - Schema type name
     * @returns {string} Display name
     */
    const schemaTypeToDisplayName = (typeName) => {
      if (!typeName) return 'Unknown Shader';
      // Insert space before capital letters (except first)
      return typeName.replace(/([A-Z])/g, ' $1').trim();
    };
    
    // Create sub-shader nodes
    const pointNode = new ShaderTreeNode(
      schemaTypeToDisplayName(DefaultPointShader.type),
      'point',
      pointShaderData,
      DefaultPointShader,
      appearance,
      CommonAttributes.POINT_SHADER
    );
    
    const lineNode = new ShaderTreeNode(
      schemaTypeToDisplayName(DefaultLineShader.type),
      'line',
      lineShaderData,
      DefaultLineShader,
      appearance,
      CommonAttributes.LINE_SHADER
    );
    
    // Determine which polygon shader schema to use based on shader name found above
    let polygonSchema = DefaultPolygonShader;
    
    // polygonShaderName was already determined from allAttributes above
    if (polygonShaderName !== 'default' && typeof polygonShaderName === 'string') {
      try {
        polygonSchema = ShaderRegistry.resolveShader('polygon', polygonShaderName);
      } catch (e) {
        // If shader not found, fall back to DefaultPolygonShader
        console.warn(`Shader "${polygonShaderName}" not found, using DefaultPolygonShader:`, e);
        polygonSchema = DefaultPolygonShader;
        polygonShaderName = 'default';
      }
    }
    
    // Use schema's type property for display name
    const displayName = schemaTypeToDisplayName(polygonSchema.type);
    
    const polygonNode = new ShaderTreeNode(
      displayName,
      'polygon',
      polygonShaderData,
      polygonSchema,
      appearance,
      CommonAttributes.POLYGON_SHADER
    );
    
    geomNode.addChild(pointNode);
    geomNode.addChild(lineNode);
    geomNode.addChild(polygonNode);
    
    // Create rendering hints shader node
    const renderingHintsNode = new ShaderTreeNode(
      'Rendering Hints Shader',
      'renderingHints',
      renderingHintsShaderData,
      DefaultRenderingHintsShader,
      appearance,
      '' // No prefix for rendering hints attributes
    );
    
    // Return array of both nodes
    const nodes = [geomNode, renderingHintsNode];
    
    // Cache the nodes
    this.#shaderNodeCache.set(appearance, nodes);
    
    return nodes;
  }
  
  /**
   * Add shader-specific properties to the property panel
   * Displays ALL attributes of the selected shader schema, showing "inherited" for unset ones
   * @param {ShaderTreeNode} shaderNode - The shader tree node
   * @param {HTMLElement} propertyPanel - The property panel element
   */
  addShaderProperties(shaderNode, propertyPanel) {
    const { schema, appearance, prefix } = shaderNode;
    
    // Get all possible attributes from the shader schema
    let allAttributeNames;
    if (schema === DefaultGeometryShader) {
      // Geometry shader attributes are not namespaced
      allAttributeNames = [
        CommonAttributes.VERTEX_DRAW,  // showPoints
        CommonAttributes.EDGE_DRAW,     // showLines
        CommonAttributes.FACE_DRAW      // showFaces
      ];
    } else if (schema === DefaultRenderingHintsShader) {
      // Rendering hints shader attributes are not namespaced
      allAttributeNames = schema.ATTRIBUTES || [];
    } else {
      // Other shaders have ATTRIBUTES array
      allAttributeNames = schema.ATTRIBUTES || [];
    }
    
    // Create a row for each attribute in the schema
    const properties = [];
    for (const attrName of allAttributeNames) {
      // For geometry shader and rendering hints shader, attrName is already the full key
      // For other shaders, we need to construct the full key with prefix
      const fullKey = (schema === DefaultGeometryShader || schema === DefaultRenderingHintsShader) 
        ? attrName 
        : (prefix ? `${prefix}.${attrName}` : attrName);
      
      // Check if this attribute is set in the Appearance
      const value = appearance.getAttribute(fullKey);
      const isInherited = value === INHERITED;
      
      // Create a container for the value display
      const container = document.createElement('div');
      container.style.display = 'flex';
      container.style.gap = '5px';
      container.style.alignItems = 'center';
      
      if (isInherited) {
        // Show "inherited" button that can be clicked to set a default value
        const inheritedBtn = this.#createInheritedButton(fullKey, value, appearance, schema, shaderNode);
        container.appendChild(inheritedBtn);
      } else {
        // Show widget for the actual value
        // For geometry shader, use the display name (showPoints, showLines, showFaces)
        const displayName = (schema === DefaultGeometryShader) 
          ? attrName.replace('VERTEX_DRAW', 'showPoints').replace('EDGE_DRAW', 'showLines').replace('FACE_DRAW', 'showFaces')
          : attrName;
        
        const widget = this.#widgetFactory.createWidgetForValue(displayName, value, (newValue) => {
          appearance.setAttribute(fullKey, newValue);
          this.#onPropertyChange();
          this.#onRefreshPropertyPanel(shaderNode);
        });
        container.appendChild(widget);
        
        // Add inherited button to clear it (set back to inherited)
        const inheritedBtn = this.#createInheritedButton(fullKey, value, appearance, schema, shaderNode);
        container.appendChild(inheritedBtn);
      }
      
      // Format the label - for geometry shader, use friendly names
      const label = (schema === DefaultGeometryShader)
        ? attrName.replace('VERTEX_DRAW', 'Show Points').replace('EDGE_DRAW', 'Show Lines').replace('FACE_DRAW', 'Show Faces')
        : formatAttributeName(attrName);
      
      properties.push({
        label: label,
        value: container,
        editable: true
      });
    }
    
    this.#addPropertyGroup(propertyPanel, shaderNode.name + ' Attributes', properties);
  }
  
  /**
   * Add a property group to the panel
   * @param {HTMLElement} propertyPanel - The property panel element
   * @param {string} title - Group title
   * @param {Array<{label: string, value: *, editable: boolean}>} properties - Properties
   * @private
   */
  #addPropertyGroup(propertyPanel, title, properties) {
    const group = document.createElement('div');
    group.className = 'sg-prop-group';
    
    const titleEl = document.createElement('div');
    titleEl.className = 'sg-prop-group-title';
    titleEl.textContent = title;
    group.appendChild(titleEl);
    
    for (const prop of properties) {
      const row = document.createElement('div');
      row.className = 'sg-prop-row';
      
      const label = document.createElement('div');
      label.className = 'sg-prop-label';
      label.textContent = prop.label;
      
      const value = document.createElement('div');
      value.className = 'sg-prop-value';
      
      if (prop.value instanceof HTMLElement) {
        value.appendChild(prop.value);
      } else {
        value.textContent = String(prop.value);
      }
      
      row.appendChild(label);
      row.appendChild(value);
      group.appendChild(row);
    }
    
    propertyPanel.appendChild(group);
  }
  
  /**
   * Create an inherited indicator button
   * @param {string} attributeKey - The attribute key (e.g., 'point.diffuseColor')
   * @param {*} currentValue - The current value (or INHERITED symbol)
   * @param {Appearance} appearance - The appearance to modify
   * @param {Object} schema - The shader schema
   * @param {ShaderTreeNode} refreshNode - Node to refresh after change
   * @returns {HTMLElement} The button element
   * @private
   */
  #createInheritedButton(attributeKey, currentValue, appearance, schema, refreshNode = null) {
    const isInherited = currentValue === INHERITED;
    
    const button = document.createElement('button');
    button.className = 'sg-inherited-button';
    button.textContent = isInherited ? 'Inherited' : 'Clear';
    button.title = isInherited 
      ? 'Click to set a default value' 
      : 'Click to remove this attribute (set to inherited)';
    
    if (!isInherited) {
      button.classList.add('explicit');
    }
    
    // Add click handler
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      
      if (isInherited) {
        // Set a default value from the schema
        const attrName = attributeKey.split('.').pop(); // Get attribute name without prefix
        
        let defaultValue = null;
        
        // Special handling for geometry shader attributes (VERTEX_DRAW, EDGE_DRAW, FACE_DRAW)
        if (schema === DefaultGeometryShader) {
          // Geometry shader attributes have defaults in CommonAttributes
          if (attributeKey === CommonAttributes.VERTEX_DRAW) {
            defaultValue = CommonAttributes.VERTEX_DRAW_DEFAULT;
          } else if (attributeKey === CommonAttributes.EDGE_DRAW) {
            defaultValue = CommonAttributes.EDGE_DRAW_DEFAULT;
          } else if (attributeKey === CommonAttributes.FACE_DRAW) {
            defaultValue = CommonAttributes.FACE_DRAW_DEFAULT;
          }
        } else if (schema === DefaultRenderingHintsShader) {
          // Rendering hints shader attributes have defaults in DefaultRenderingHintsShader
          const defaults = schema.getAllDefaults();
          defaultValue = defaults[attrName];
        } else {
          // For other shaders, try to get default from schema's getAllDefaults method
          if (schema.getAllDefaults && typeof schema.getAllDefaults === 'function') {
            const allDefaults = schema.getAllDefaults();
            defaultValue = allDefaults[attrName];
          }
          
          // If not found, try direct property access (e.g., DIFFUSE_COLOR_DEFAULT)
          if (defaultValue === undefined || defaultValue === null) {
            // Convert camelCase to UPPER_SNAKE_CASE for constant names
            const constantName = attrName
              .replace(/([A-Z])/g, '_$1')
              .toUpperCase() + '_DEFAULT';
            defaultValue = schema[constantName];
          }
        }
        
        if (defaultValue !== undefined && defaultValue !== null) {
          appearance.setAttribute(attributeKey, defaultValue);
        } else {
          // Fallback: use reasonable defaults based on attribute name patterns
          if (attrName.includes('Color') || attrName.toLowerCase().endsWith('color')) {
            appearance.setAttribute(attributeKey, new Color(255, 255, 255));
          } else if (attrName.includes('Size') || attrName.includes('Radius') || attrName.includes('Width')) {
            appearance.setAttribute(attributeKey, 1.0);
          } else if (attrName.includes('Coefficient')) {
            appearance.setAttribute(attributeKey, 1.0);
          } else if (attrName.includes('Exponent')) {
            appearance.setAttribute(attributeKey, 60.0);
          } else if (attrName.includes('Draw') || attrName.includes('Enabled') || attrName.includes('Shading')) {
            appearance.setAttribute(attributeKey, true);
          } else {
            // Unknown type, skip setting
            console.warn(`No default value found for attribute: ${attributeKey}`);
            return;
          }
        }
      } else {
        // Clear the attribute (set to inherited)
        appearance.setAttribute(attributeKey, INHERITED);
      }
      
      this.#onPropertyChange();
      
      // Refresh the property panel
      if (refreshNode) {
        this.#onRefreshPropertyPanel(refreshNode);
      } else {
        this.#onRefreshPropertyPanel(appearance);
      }
    });
    
    return button;
  }
}

