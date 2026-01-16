/**
 * JavaScript port/translation of jReality.
 *
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 *
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { GeometryAttribute } from '../scene/GeometryAttribute.js';
import { IndexedFaceSet } from '../scene/IndexedFaceSet.js';
import { IndexedLineSet } from '../scene/IndexedLineSet.js';
import { fromDataList, toDataList } from '../scene/data/DataUtility.js';

function getKeySet(map) {
  return new Set(map ? Array.from(map.keys()) : []);
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const key of a) {
    if (!b.has(key)) return false;
  }
  return true;
}

function assertSameAttributeKeys(sets, label) {
  if (sets.length === 0) return;
  const base = sets[0];
  for (let i = 1; i < sets.length; i++) {
    if (!setsEqual(base, sets[i])) {
      throw new Error(`GeometryMergeFactory: ${label} attribute sets do not match.`);
    }
  }
}

function assertArrayLength(arr, expected, label) {
  if (!Array.isArray(arr)) {
    throw new Error(`GeometryMergeFactory: ${label} must be an array.`);
  }
  if (arr.length !== expected) {
    throw new Error(`GeometryMergeFactory: ${label} length ${arr.length} != ${expected}.`);
  }
}

function mergeFixedAttribute(geoms, getter, expectedCounts, label) {
  const merged = [];
  let dataType = null;
  geoms.forEach((geom, i) => {
    const dl = getter(geom);
    if (!dl) throw new Error(`GeometryMergeFactory: missing ${label} attribute.`);
    if (dataType == null && dl.dataType) dataType = dl.dataType;
    const arr = fromDataList(dl);
    assertArrayLength(arr, expectedCounts[i], label);
    merged.push(...arr);
  });
  return { data: merged, dataType: dataType ?? 'float64' };
}

function mergeIndexAttribute(geoms, getter, expectedCounts, label) {
  const merged = [];
  let dataType = 'int32';
  let offset = 0;
  geoms.forEach((geom, i) => {
    const dl = getter(geom);
    if (!dl) throw new Error(`GeometryMergeFactory: missing ${label} attribute.`);
    const arr = fromDataList(dl);
    assertArrayLength(arr, expectedCounts[i], label);
    for (const row of arr) {
      if (!Array.isArray(row)) {
        throw new Error(`GeometryMergeFactory: ${label} rows must be arrays.`);
      }
      merged.push(row.map((v) => v + offset));
    }
    offset += geom.getNumPoints();
  });
  return { data: merged, dataType };
}

function toAttributeMap(mergedAttributes) {
  const map = new Map();
  for (const [name, value] of mergedAttributes) {
    map.set(name, value);
  }
  return map;
}

export class GeometryMergeFactory {
  /**
   * Merge multiple IndexedFaceSets into a single IndexedFaceSet.
   * Throws if any attribute sets differ across inputs.
   * @param {IndexedFaceSet[]|...IndexedFaceSet} inputs
   * @returns {IndexedFaceSet}
   */
  static mergeIndexedFaceSets(inputs) {
    const faceSets = Array.isArray(inputs) ? inputs : Array.from(arguments);
    if (!faceSets || faceSets.length === 0) {
      throw new Error('GeometryMergeFactory: mergeIndexedFaceSets requires at least one input.');
    }
    faceSets.forEach((fs) => {
      if (!(fs instanceof IndexedFaceSet)) {
        throw new Error('GeometryMergeFactory: all inputs must be IndexedFaceSet.');
      }
    });

    // Enforce identical attribute keys.
    const vertexKeySets = faceSets.map((fs) => getKeySet(fs.getVertexAttributes()));
    const edgeKeySets = faceSets.map((fs) => getKeySet(fs.getEdgeAttributes()));
    const faceKeySets = faceSets.map((fs) => getKeySet(fs.getFaceAttributes()));
    const geomKeySets = faceSets.map((fs) => getKeySet(fs.getGeometryAttributes()));
    assertSameAttributeKeys(vertexKeySets, 'vertex');
    assertSameAttributeKeys(edgeKeySets, 'edge');
    assertSameAttributeKeys(faceKeySets, 'face');
    assertSameAttributeKeys(geomKeySets, 'geometry');

    const vertexCounts = faceSets.map((fs) => fs.getNumPoints());
    const faceCounts = faceSets.map((fs) => fs.getNumFaces());
    const edgeCounts = faceSets.map((fs) => fs.getNumEdges());

    const vertexAttrs = new Map();
    for (const name of vertexKeySets[0]) {
      const { data, dataType } = mergeFixedAttribute(
        faceSets,
        (fs) => fs.getVertexAttribute(name),
        vertexCounts,
        `vertex.${name}`
      );
      vertexAttrs.set(name, toDataList(data, null, dataType));
    }

    const faceAttrs = new Map();
    for (const name of faceKeySets[0]) {
      if (name === GeometryAttribute.INDICES) {
        const { data, dataType } = mergeIndexAttribute(
          faceSets,
          (fs) => fs.getFaceAttribute(name),
          faceCounts,
          `face.${name}`
        );
        faceAttrs.set(name, toDataList(data, null, dataType));
      } else {
        const { data, dataType } = mergeFixedAttribute(
          faceSets,
          (fs) => fs.getFaceAttribute(name),
          faceCounts,
          `face.${name}`
        );
        faceAttrs.set(name, toDataList(data, null, dataType));
      }
    }

    const edgeAttrs = new Map();
    for (const name of edgeKeySets[0]) {
      if (name === GeometryAttribute.INDICES) {
        const { data, dataType } = mergeIndexAttribute(
          faceSets,
          (fs) => fs.getEdgeAttribute(name),
          edgeCounts,
          `edge.${name}`
        );
        edgeAttrs.set(name, toDataList(data, null, dataType));
      } else {
        const { data, dataType } = mergeFixedAttribute(
          faceSets,
          (fs) => fs.getEdgeAttribute(name),
          edgeCounts,
          `edge.${name}`
        );
        edgeAttrs.set(name, toDataList(data, null, dataType));
      }
    }

    const merged = new IndexedFaceSet();
    if (vertexAttrs.size > 0) merged.setVertexCountAndAttributes(toAttributeMap(vertexAttrs));
    if (faceAttrs.size > 0) merged.setFaceCountAndAttributes(toAttributeMap(faceAttrs));
    if (edgeAttrs.size > 0) merged.setEdgeCountAndAttributes(toAttributeMap(edgeAttrs));
    if (geomKeySets[0].size > 0) merged.setGeometryAttributes(faceSets[0].getGeometryAttributes());
    return merged;
  }

  /**
   * Merge multiple IndexedLineSets into a single IndexedLineSet.
   * Throws if any attribute sets differ across inputs.
   * @param {IndexedLineSet[]|...IndexedLineSet} inputs
   * @returns {IndexedLineSet}
   */
  static mergeIndexedLineSets(inputs) {
    const lineSets = Array.isArray(inputs) ? inputs : Array.from(arguments);
    if (!lineSets || lineSets.length === 0) {
      throw new Error('GeometryMergeFactory: mergeIndexedLineSets requires at least one input.');
    }
    lineSets.forEach((ls) => {
      if (!(ls instanceof IndexedLineSet)) {
        throw new Error('GeometryMergeFactory: all inputs must be IndexedLineSet.');
      }
    });

    const vertexKeySets = lineSets.map((ls) => getKeySet(ls.getVertexAttributes()));
    const edgeKeySets = lineSets.map((ls) => getKeySet(ls.getEdgeAttributes()));
    const geomKeySets = lineSets.map((ls) => getKeySet(ls.getGeometryAttributes()));
    assertSameAttributeKeys(vertexKeySets, 'vertex');
    assertSameAttributeKeys(edgeKeySets, 'edge');
    assertSameAttributeKeys(geomKeySets, 'geometry');

    const vertexCounts = lineSets.map((ls) => ls.getNumPoints());
    const edgeCounts = lineSets.map((ls) => ls.getNumEdges());

    const vertexAttrs = new Map();
    for (const name of vertexKeySets[0]) {
      const { data, dataType } = mergeFixedAttribute(
        lineSets,
        (ls) => ls.getVertexAttribute(name),
        vertexCounts,
        `vertex.${name}`
      );
      vertexAttrs.set(name, toDataList(data, null, dataType));
    }

    const edgeAttrs = new Map();
    for (const name of edgeKeySets[0]) {
      if (name === GeometryAttribute.INDICES) {
        const { data, dataType } = mergeIndexAttribute(
          lineSets,
          (ls) => ls.getEdgeAttribute(name),
          edgeCounts,
          `edge.${name}`
        );
        edgeAttrs.set(name, toDataList(data, null, dataType));
      } else {
        const { data, dataType } = mergeFixedAttribute(
          lineSets,
          (ls) => ls.getEdgeAttribute(name),
          edgeCounts,
          `edge.${name}`
        );
        edgeAttrs.set(name, toDataList(data, null, dataType));
      }
    }

    const merged = new IndexedLineSet();
    if (vertexAttrs.size > 0) merged.setVertexCountAndAttributes(toAttributeMap(vertexAttrs));
    if (edgeAttrs.size > 0) merged.setEdgeCountAndAttributes(toAttributeMap(edgeAttrs));
    if (geomKeySets[0].size > 0) merged.setGeometryAttributes(lineSets[0].getGeometryAttributes());
    return merged;
  }
}
