/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';
import { Geometry } from '../scene/Geometry.js';
import { Camera } from '../scene/Camera.js';

const componentSchema = {
  title: 'Component',
  fields: [
    {
      label: 'Visible',
      type: 'boolean',
      get: (node) => node.isVisible(),
      set: (node, value) => node.setVisible(value)
    },
    {
      label: 'Pickable',
      type: 'boolean',
      get: (node) => node.isPickable(),
      set: (node, value) => node.setPickable(value)
    },
    {
      label: 'Children',
      type: 'readonly',
      get: (node) => node.getChildComponentCount?.() ?? 0
    }
  ]
};

const cameraSchema = {
  title: 'Camera',
  fields: [
    {
      label: 'Perspective',
      type: 'boolean',
      get: (node) => node.isPerspective(),
      set: (node, value) => node.setPerspective(Boolean(value))
    },
    {
      label: 'Field of View',
      type: 'number',
      get: (node) => node.getFieldOfView(),
      set: (node, value) => node.setFieldOfView(Number(value))
    },
    {
      label: 'Near',
      type: 'number',
      get: (node) => node.getNear(),
      set: (node, value) => node.setNear(Number(value))
    },
    {
      label: 'Far',
      type: 'number',
      get: (node) => node.getFar(),
      set: (node, value) => node.setFar(Number(value))
    }
  ]
};

function buildGeometrySchema(geometry) {
  const fields = [];
  const numVertices = geometry.getNumPoints
    ? geometry.getNumPoints()
    : geometry.getNumVertices
      ? geometry.getNumVertices()
      : geometry.getVertexAttributes?.().size ?? 0;

  fields.push({
    label: 'Vertex Count',
    type: 'readonly',
    get: () => numVertices
  });

  if (typeof geometry.getNumEdges === 'function') {
    fields.push({
      label: 'Edge Count',
      type: 'readonly',
      get: () => geometry.getNumEdges()
    });
  }

  if (typeof geometry.getNumFaces === 'function') {
    fields.push({
      label: 'Face Count',
      type: 'readonly',
      get: () => geometry.getNumFaces()
    });
  }

  return {
    title: 'Geometry',
    fields
  };
}

/**
 * Return schema groups for a given node.
 * @param {*} node
 * @returns {Array<{title: string, fields: Array}>}
 */
export function getPropertySchemasForNode(node) {
  const schemas = [];
  if (node instanceof SceneGraphComponent) {
    schemas.push(componentSchema);
  }
  if (node instanceof Camera) {
    schemas.push(cameraSchema);
  }
  if (node instanceof Geometry) {
    schemas.push(buildGeometrySchema(node));
  }
  return schemas;
}


