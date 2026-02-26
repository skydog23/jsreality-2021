/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

// Shader Property Manager - handles shader-specific property handling and tree node creation

import { Appearance, INHERITED } from '../scene/Appearance.js';
import { Color } from '../util/Color.js';
import { DefaultGeometryShader, DefaultPointShader, DefaultLineShader, DefaultPolygonShader, DefaultRenderingHintsShader, DefaultRootAppearance, DefaultFogShader, ShaderRegistry, ShaderUtility } from '../shader/index.js';
import { ImplodePolygonShader } from '../shader/ImplodePolygonShader.js';
import * as CommonAttributes from '../shader/CommonAttributes.js';
import { ShaderTreeNode } from './TreeViewManager.js';
import { formatAttributeName } from './PropertyFormatters.js';
import { EffectiveAppearance } from '../shader/EffectiveAppearance.js';
import { DescriptorType } from './descriptors/DescriptorTypes.js';
import { EUCLIDEAN, HYPERBOLIC, ELLIPTIC, PROJECTIVE } from '../math/Pn.js';

/**
 * Manages shader-specific property handling for the SceneGraphInspector
 */
export class ShaderPropertyManager {
  /**
   * @type {Map<Appearance, ShaderTreeNode[]>}
   */
  #shaderNodeCache = new Map();
  
  /**
   * @type {Function}
   */
  #onPropertyChange;
  
  /**
   * @type {Function}
   */
  #onRefreshPropertyPanel;
  
  /**
   * @param {Function} onPropertyChange - Callback when a property changes
   * @param {Function} onRefreshPropertyPanel - Callback to refresh property panel
   */
  constructor(onPropertyChange, onRefreshPropertyPanel) {
    this.#onPropertyChange = onPropertyChange;
    this.#onRefreshPropertyPanel = onRefreshPropertyPanel;
  }
  
  /**
   * Create shader tree nodes for an appearance
   * This builds a hierarchy: Geometry Shader -> Point/Line/Polygon Shaders
   * Also creates a RenderingHintsShader node
   * If isRootAppearance is true, also creates a RootAppearance node
   * @param {Appearance} appearance - The appearance
   * @param {boolean} isRootAppearance - Whether this is the root Appearance
   * @returns {ShaderTreeNode[]|ShaderTreeNode|null} Array of shader nodes
   */
  createShaderTreeNodes(appearance, isRootAppearance = false) {
    const allAttributes = appearance.getAttributes();
    
    let polygonShaderName = 'default';
    const base = CommonAttributes.POLYGON_SHADER;
    if (allAttributes.has(base)) {
      const value = allAttributes.get(base);
      if (value !== INHERITED && typeof value === 'string') {
        polygonShaderName = value;
      }
    }
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
    
    const cacheKey = isRootAppearance ? `${appearance}_root` : appearance;
    let cachedNodes = this.#shaderNodeCache.get(cacheKey);
    if (cachedNodes) {
      const geomNode = cachedNodes.find(n => n.type === 'geometry');
      if (geomNode) {
        const cachedPolygonNode = geomNode.children.find(c => c.type === 'polygon');
        if (cachedPolygonNode) {
          const cachedSchema = cachedPolygonNode.schema;
          const cachedIsDefault = cachedSchema === DefaultPolygonShader;
          const currentIsDefault = polygonShaderName === 'default';
          
          if (cachedIsDefault !== currentIsDefault) {
            cachedNodes = null;
            this.#shaderNodeCache.delete(cacheKey);
          } else if (!currentIsDefault) {
            try {
              const currentSchema = ShaderRegistry.resolveShader('polygon', polygonShaderName);
              if (cachedSchema !== currentSchema) {
                cachedNodes = null;
                this.#shaderNodeCache.delete(cacheKey);
              }
            } catch (e) {
              cachedNodes = null;
              this.#shaderNodeCache.delete(cacheKey);
            }
          }
        }
      }
    }
    
    if (cachedNodes) {
      return cachedNodes;
    }
    
    const effective = EffectiveAppearance.create().createChild(appearance);
    const geometryShaderData = effective.resolveShaderAttributes(
      DefaultGeometryShader,
      '',
      DefaultGeometryShader.getAllDefaults?.() || {}
    );
    const pointShaderData = effective.resolveShaderAttributes(
      DefaultPointShader,
      CommonAttributes.POINT_SHADER,
      DefaultPointShader.getAllDefaults?.() || {}
    );
    const lineShaderData = effective.resolveShaderAttributes(
      DefaultLineShader,
      CommonAttributes.LINE_SHADER,
      DefaultLineShader.getAllDefaults?.() || {}
    );
    const renderingHintsShaderData = effective.resolveShaderAttributes(
      DefaultRenderingHintsShader,
      '',
      DefaultRenderingHintsShader.getAllDefaults?.() || {}
    );
    
    const geomNode = new ShaderTreeNode(
      'Geometry Shader',
      'geometry',
      geometryShaderData,
      DefaultGeometryShader,
      appearance,
      ''
    );
    
    const schemaTypeToDisplayName = (typeName) => {
      if (!typeName) return 'Unknown Shader';
      return typeName.replace(/([A-Z])/g, ' $1').trim();
    };
    
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
    
    let polygonSchema = DefaultPolygonShader;
    
    if (polygonShaderName !== 'default' && typeof polygonShaderName === 'string') {
      try {
        polygonSchema = ShaderRegistry.resolveShader('polygon', polygonShaderName);
      } catch (e) {
        console.warn(`Shader "${polygonShaderName}" not found, using DefaultPolygonShader:`, e);
        polygonSchema = DefaultPolygonShader;
        polygonShaderName = 'default';
      }
    }
    
    const displayName = schemaTypeToDisplayName(polygonSchema.type);
    
    const polygonNode = new ShaderTreeNode(
      displayName,
      'polygon',
      effective.resolveShaderAttributes(
        polygonSchema,
        CommonAttributes.POLYGON_SHADER,
        polygonSchema.getAllDefaults?.() || {}
      ),
      polygonSchema,
      appearance,
      CommonAttributes.POLYGON_SHADER
    );
    
    geomNode.addChild(pointNode);
    geomNode.addChild(lineNode);
    geomNode.addChild(polygonNode);
    
    const renderingHintsNode = new ShaderTreeNode(
      'Rendering Hints Shader',
      'renderingHints',
      renderingHintsShaderData,
      DefaultRenderingHintsShader,
      appearance,
      ''
    );
    
    const nodes = [geomNode, renderingHintsNode];
    
    if (isRootAppearance) {
      const rootAppearanceNode = new ShaderTreeNode(
        'Root Appearance',
        'rootAppearance',
        effective.resolveShaderAttributes(
          DefaultRootAppearance,
          '',
          DefaultRootAppearance.getAllDefaults?.() || {}
        ),
        DefaultRootAppearance,
        appearance,
        ''
      );

      const fogNode = new ShaderTreeNode(
        schemaTypeToDisplayName(DefaultFogShader.type),
        'fog',
        effective.resolveShaderAttributes(
          DefaultFogShader,
          CommonAttributes.FOG_SHADER,
          DefaultFogShader.getAllDefaults?.() || {}
        ),
        DefaultFogShader,
        appearance,
        CommonAttributes.FOG_SHADER
      );
      rootAppearanceNode.addChild(fogNode);

      nodes.push(rootAppearanceNode);
    }
    
    this.#shaderNodeCache.set(cacheKey, nodes);
    
    return nodes;
  }
  
  /**
   * Build descriptor groups for a shader tree node's properties.
   *
   * Each attribute from the shader schema becomes an INHERITABLE descriptor
   * that delegates to the appropriate inner descriptor based on value type.
   *
   * @param {ShaderTreeNode} shaderNode
   * @returns {import('./descriptors/DescriptorTypes.js').DescriptorGroup[]}
   */
  getDescriptors(shaderNode) {
    const { schema, appearance, prefix } = shaderNode;
    
    let allAttributeNames;
    if (schema === DefaultGeometryShader) {
      allAttributeNames = [
        CommonAttributes.VERTEX_DRAW,
        CommonAttributes.EDGE_DRAW,
        CommonAttributes.FACE_DRAW
      ];
    } else if (schema === DefaultRenderingHintsShader) {
      allAttributeNames = schema.ATTRIBUTES || [];
    } else if (schema === DefaultRootAppearance) {
      allAttributeNames = schema.ATTRIBUTES || [];
    } else {
      allAttributeNames = schema.ATTRIBUTES || [];
    }
    
    const items = [];
    for (const attrName of allAttributeNames) {
      const fullKey = (schema === DefaultGeometryShader || schema === DefaultRenderingHintsShader || schema === DefaultRootAppearance) 
        ? attrName 
        : (prefix ? `${prefix}.${attrName}` : attrName);
      
      const label = (schema === DefaultGeometryShader)
        ? attrName.replace('VERTEX_DRAW', 'Show Points').replace('EDGE_DRAW', 'Show Lines').replace('FACE_DRAW', 'Show Faces')
        : formatAttributeName(attrName);
      
      items.push({
        key: `inheritable-${fullKey}`,
        type: DescriptorType.INHERITABLE,
        label,
        attributeKey: fullKey,
        appearance,
        schema,
        innerDescriptorFactory: () => this.#createInnerDescriptor(fullKey, appearance, shaderNode),
        onToggle: () => {
          this.#onPropertyChange();
          this.#onRefreshPropertyPanel(shaderNode);
        }
      });
    }
    
    return [
      {
        key: `shader-${shaderNode.type}`,
        title: shaderNode.name + ' Attributes',
        items
      }
    ];
  }
  
  /**
   * Create the inner (value-editing) descriptor for a shader attribute.
   *
   * Mirrors the type-dispatch logic from the old WidgetFactory.createWidgetForValue.
   *
   * @param {string} fullKey
   * @param {Appearance} appearance
   * @param {ShaderTreeNode} shaderNode
   * @returns {import('./descriptors/DescriptorTypes.js').InspectorDescriptor}
   */
  #createInnerDescriptor(fullKey, appearance, shaderNode) {
    const attrName = fullKey.split('.').pop();
    const schemaDefault = shaderNode.schema?.getDefault?.(attrName);
    const effective = EffectiveAppearance.create().createChild(appearance);
    const value = effective.getAttribute(fullKey, schemaDefault);
    
    const resolve = () => effective.getAttribute(fullKey, schemaDefault);

    const onChange = (newValue) => {
      appearance.setAttribute(fullKey, newValue);
      this.#onPropertyChange();
    };
    
    if (value instanceof Color) {
      return {
        key: `val-${fullKey}`,
        type: DescriptorType.COLOR,
        label: '',
        getValue: () => {
          const c = resolve();
          return { hex: c?.toHexString?.() ?? '#ffffff', alpha: c?.a ?? 255 };
        },
        setValue: ({ hex, alpha }) => {
          const rgb = Color.fromHex(hex);
          onChange(new Color(rgb.r, rgb.g, rgb.b, alpha));
        }
      };
    }
    
    if (Array.isArray(value) && (value.length === 3 || value.length === 4) && value.every(v => typeof v === 'number')) {
      return {
        key: `val-${fullKey}`,
        type: DescriptorType.COLOR,
        label: '',
        getValue: () => {
          const c = resolve();
          if (c instanceof Color) return { hex: c.toHexString(), alpha: c.a };
          if (Array.isArray(c)) {
            const [r = 0, g = 0, b = 0, a = 1] = c;
            return {
              hex: new Color(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)).toHexString(),
              alpha: Math.round(a * 255)
            };
          }
          return { hex: '#ffffff', alpha: 255 };
        },
        setValue: ({ hex, alpha }) => {
          const rgb = Color.fromHex(hex);
          onChange([rgb.r / 255, rgb.g / 255, rgb.b / 255, alpha / 255]);
        }
      };
    }
    
    if (typeof value === 'boolean') {
      return {
        key: `val-${fullKey}`,
        type: DescriptorType.TOGGLE,
        label: '',
        getValue: () => Boolean(resolve()),
        setValue: (v) => onChange(Boolean(v))
      };
    }
    
    if (typeof value === 'number') {
      const isMetric = attrName === 'metric' || attrName.endsWith('.metric');
      if (isMetric) {
        return {
          key: `val-${fullKey}`,
          type: DescriptorType.ENUM,
          label: '',
          options: [
            { value: EUCLIDEAN, label: 'Euclidean' },
            { value: HYPERBOLIC, label: 'Hyperbolic' },
            { value: ELLIPTIC, label: 'Elliptic' },
            { value: PROJECTIVE, label: 'Projective' }
          ],
          getValue: () => {
            const v = resolve();
            return typeof v === 'number' ? v : EUCLIDEAN;
          },
          setValue: (v) => onChange(Number(v))
        };
      }
      if (attrName === CommonAttributes.FOG_CURVE || attrName === 'curve') {
        return {
          key: `val-${fullKey}`,
          type: DescriptorType.ENUM,
          label: '',
          options: [
            { value: 0, label: 'Linear' },
            { value: 1, label: 'Smooth' },
            { value: 2, label: 'Exp' },
            { value: 3, label: 'Exp2' }
          ],
          getValue: () => {
            const v = resolve();
            return typeof v === 'number' ? v : 1;
          },
          setValue: (v) => onChange(Number(v))
        };
      }
      if (attrName === CommonAttributes.FOG_DISTANCE_METRIC || attrName === 'distanceMetric') {
        return {
          key: `val-${fullKey}`,
          type: DescriptorType.ENUM,
          label: '',
          options: [
            { value: 0, label: 'Radial' },
            { value: 1, label: 'Planar' }
          ],
          getValue: () => {
            const v = resolve();
            return typeof v === 'number' ? v : 0;
          },
          setValue: (v) => onChange(Number(v))
        };
      }
      return {
        key: `val-${fullKey}`,
        type: DescriptorType.FLOAT,
        label: '',
        getValue: () => {
          const v = resolve();
          return typeof v === 'number' ? v : 0;
        },
        setValue: (v) => onChange(Number(v))
      };
    }
    
    if (typeof value === 'string') {
      return {
        key: `val-${fullKey}`,
        type: DescriptorType.TEXT,
        label: '',
        getValue: () => String(resolve() ?? ''),
        setValue: (v) => onChange(String(v))
      };
    }
    
    if (Array.isArray(value)) {
      return {
        key: `val-${fullKey}`,
        type: DescriptorType.VECTOR,
        label: '',
        getValue: () => {
          const v = resolve();
          return Array.isArray(v) ? [...v] : [];
        },
        setValue: (v) => onChange(v)
      };
    }
    
    if (value && typeof value.getInspectorDescriptors === 'function') {
      const groups = value.getInspectorDescriptors(() => this.#onPropertyChange());
      const items = groups.flatMap(g => g.items ?? []);
      return {
        key: `val-${fullKey}`,
        type: DescriptorType.CONTAINER,
        label: '',
        containerLabel: groups[0]?.containerLabel ?? '',
        items
      };
    }
    
    return {
      key: `val-${fullKey}`,
      type: DescriptorType.LABEL,
      label: '',
      getValue: () => String(value ?? '')
    };
  }
}
