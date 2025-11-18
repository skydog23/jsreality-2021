// JavaScript port of jReality's SphereUtility class (from SphereUtility.java)

import { IndexedFaceSet } from '../scene/IndexedFaceSet.js';
import { IndexedFaceSetFactory } from './IndexedFaceSetFactory.js';
import { IndexedFaceSetUtility } from './IndexedFaceSetUtility.js';
import { Primitives } from './Primitives.js';
import { PointSet } from '../scene/PointSet.js';
import { SceneGraphComponent } from '../scene/SceneGraphComponent.js';
import { Transformation } from '../scene/Transformation.js';
import { GeometryAttribute } from '../scene/GeometryAttribute.js';
import { Rectangle3D } from '../util/Rectangle3D.js';
import { ColorGradient } from '../util/ColorGradient.js';
import { Color } from '../util/Color.js';
import { fromDataList, toDataList } from '../scene/data/DataUtility.js';
import * as Rn from '../math/Rn.js';
import { getLogger } from '../util/LoggingSystem.js';
import { Category } from '../util/LoggingSystem.js';

// Note: Primitives.icosahedron() will be available after translating Primitives (#25)
// Note: QuadMeshFactory methods (sphericalPatch, oneHalfSphere) are skipped until QuadMeshFactory (#26) is translated

/**
 * Static methods for generating approximations to spheres. The approximations are based
 * either on subdividing a cube, or subdividing an icosahedron.
 */
export class SphereUtility {
  
  /**
   * Private constructor - all methods are static
   */
  constructor() {
    throw new Error('SphereUtility is a static utility class');
  }
  
  // Sphere quality constants
  static SPHERE_COARSE = 0;
  static SPHERE_FINE = 1;
  static SPHERE_FINER = 2;
  static SPHERE_FINEST = 3;
  static SPHERE_SUPERFINE = 4;
  static SPHERE_WAYFINE = 5;
  
  // Cached tessellated spheres
  static #numberOfTessellatedCubes = 16;
  static #numberOfTessellatedIcosahedra = 8;
  static #tessellatedIcosahedra = Array(SphereUtility.#numberOfTessellatedIcosahedra).fill(null);
  static #tessellatedCubes = Array(SphereUtility.#numberOfTessellatedCubes).fill(null);
  static #cubePanels = Array(SphereUtility.#numberOfTessellatedCubes).fill(null);
  static #sphereBB = null;
  static #cubeSyms = null;
  
  /**
   * Dispose of precomputed geometry and scene graph components.
   * Subsequent calls will reproduce them as needed.
   */
  static dispose() {
    for (let i = 0; i < SphereUtility.#tessellatedIcosahedra.length; i++) {
      SphereUtility.#tessellatedIcosahedra[i] = null;
    }
    
    for (let i = 0; i < SphereUtility.#tessellatedCubes.length; i++) {
      if (SphereUtility.#tessellatedCubes[i] != null) {
        SphereUtility.#tessellatedCubes[i].setGeometry(null);
        SphereUtility.#tessellatedCubes[i] = null;
      }
    }
    
    for (let i = 0; i < SphereUtility.#cubePanels.length; i++) {
      SphereUtility.#cubePanels[i] = null;
    }
  }
  
  /**
   * Return a tessellated icosahedron of order i (shared instance).
   * @param {number} i - Subdivision level
   * @returns {IndexedFaceSet}
   */
  static tessellatedIcosahedronSphere(i) {
    return SphereUtility.tessellatedIcosahedronSphere(i, false);
  }
  
  /**
   * Return a tessellated icosahedron of order i.
   * The triangular faces of an icosahedron are binary subdivided i times,
   * the vertices are projected onto the unit sphere.
   * If sharedInstance is true, then the returned copy is a shared instance which should not be written on.
   * The resulting polyhedra has 20*(4^i) faces. If i>7, it is clamped to 7.
   * @param {number} i - Subdivision level
   * @param {boolean} sharedInstance - If true, return shared cached instance
   * @returns {IndexedFaceSet}
   */
  static tessellatedIcosahedronSphere(i, sharedInstance) {
    if (i < 0 || i >= SphereUtility.#numberOfTessellatedIcosahedra) {
      getLogger(SphereUtility).warn(Category.GEOMETRY, 'Invalid index');
      if (i < 0) i = 0;
      else i = SphereUtility.#numberOfTessellatedIcosahedra - 1;
    }
    
    if (SphereUtility.#tessellatedIcosahedra[i] == null) {
      let verts = null;
      
      if (i === 0) {
        SphereUtility.#tessellatedIcosahedra[i] = Primitives.icosahedron();
        const vertsData = SphereUtility.#tessellatedIcosahedra[i].getVertexAttribute(GeometryAttribute.COORDINATES);
        verts = fromDataList(vertsData);
      } else {
        SphereUtility.#tessellatedIcosahedra[i] = IndexedFaceSetUtility.binaryRefine(
          SphereUtility.tessellatedIcosahedronSphere(i - 1, true)
        );
        const vertsData = SphereUtility.#tessellatedIcosahedra[i].getVertexAttribute(GeometryAttribute.COORDINATES);
        verts = fromDataList(vertsData);
        const vlength = verts[0].length;
        Rn.normalize(verts, verts);
        const coordsDataList = toDataList(verts);
        SphereUtility.#tessellatedIcosahedra[i].setVertexAttribute(GeometryAttribute.COORDINATES, coordsDataList);
      }
      
      // Set texture coordinates
      const tc = SphereUtility.getTC(verts);
      const tcDataList = toDataList(tc);
      SphereUtility.#tessellatedIcosahedra[i].setVertexAttribute(GeometryAttribute.TEXTURE_COORDINATES, tcDataList);
      
      // Set normals (same as coordinates for unit sphere)
      SphereUtility.#tessellatedIcosahedra[i].setVertexAttribute(
        GeometryAttribute.NORMALS,
        SphereUtility.#tessellatedIcosahedra[i].getVertexAttribute(GeometryAttribute.COORDINATES)
      );
      
      IndexedFaceSetUtility.calculateAndSetFaceNormals(SphereUtility.#tessellatedIcosahedra[i]);
      IndexedFaceSetUtility.calculateAndSetEdgesFromFaces(SphereUtility.#tessellatedIcosahedra[i]);
    }
    
    if (sharedInstance) {
      return SphereUtility.#tessellatedIcosahedra[i];
    }
    
    // Create a copy using factory
    const ifs = SphereUtility.#tessellatedIcosahedra[i];
    const ifsf = new IndexedFaceSetFactory();
    ifsf.setFaceCount(ifs.getNumFaces());
    
    const faceIndicesData = ifs.getFaceAttribute(GeometryAttribute.INDICES);
    const faceIndices = fromDataList(faceIndicesData);
    ifsf.setFaceIndices(faceIndices);
    
    ifsf.setVertexCount(ifs.getNumPoints());
    
    const vertexCoordsData = ifs.getVertexAttribute(GeometryAttribute.COORDINATES);
    const vertexCoords = fromDataList(vertexCoordsData);
    ifsf.setVertexCoordinates(vertexCoords);
    
    const texCoordsData = ifs.getVertexAttribute(GeometryAttribute.TEXTURE_COORDINATES);
    if (texCoordsData != null) {
      const texCoords = fromDataList(texCoordsData);
      ifsf.setVertexTextureCoordinates(texCoords);
    }
    
    const normalsData = ifs.getVertexAttribute(GeometryAttribute.NORMALS);
    if (normalsData != null) {
      const normals = fromDataList(normalsData);
      ifsf.setVertexNormals(normals);
    }
    
    ifsf.setGenerateEdgesFromFaces(true);
    ifsf.setGenerateFaceNormals(true);
    ifsf.update();
    return ifsf.getIndexedFaceSet();
  }
  
  /**
   * Get vertices of a hemisphere (z >= 0)
   * @param {number} level - Subdivision level
   * @returns {number[][]} Array of vertex coordinates
   */
  static getHemisphereVerts(level) {
    const ifs = SphereUtility.tessellatedIcosahedronSphere(level, true);
    const vertsData = ifs.getVertexAttribute(GeometryAttribute.COORDINATES);
    const verts = fromDataList(vertsData);
    
    let count = 0;
    for (let i = 0; i < verts.length; ++i) {
      if (verts[i][2] >= 0) count++;
    }
    
    const pverts = Array(count);
    count = 0;
    for (let i = 0; i < verts.length; ++i) {
      if (verts[i][2] >= 0) {
        pverts[count++] = [...verts[i]];
      } else if (verts[i][2] === 0) {
        if (verts[i][0] >= 0) {
          pverts[count++] = [...verts[i]];
        }
      }
    }
    
    return pverts;
  }
  
  /**
   * Generate texture coordinates for sphere vertices
   * @param {number[][]} sphere - Vertex coordinates
   * @returns {number[][]} Texture coordinates (4D)
   */
  static getTC(sphere) {
    return SphereUtility.getTC(sphere, [0, 1, 2]);
  }
  
  /**
   * Generate texture coordinates for sphere vertices with custom channels
   * @param {number[][]} sphere - Vertex coordinates
   * @param {number[]} channels - Channel indices [x, y, z]
   * @returns {number[][]} Texture coordinates (4D)
   */
  static getTC(sphere, channels) {
    const tc = Array(sphere.length);
    for (let i = 0; i < sphere.length; ++i) {
      const i0 = channels[0];
      const i1 = channels[1];
      const i2 = channels[2];
      const r = Math.sqrt(sphere[i][i0] * sphere[i][i0] + sphere[i][i1] * sphere[i][i1]);
      tc[i] = [
        (Math.atan2(sphere[i][i0], sphere[i][i1]) + Math.PI) / (2 * Math.PI),
        Math.atan2(sphere[i][i2], r) / Math.PI,
        0,
        1.0
      ];
    }
    return tc;
  }
  
  /**
   * Return a tessellated cube sphere of order i (shared instance).
   * @param {number} i - Subdivision level
   * @returns {SceneGraphComponent}
   */
  static tessellatedCubeSphere(i) {
    return SphereUtility.tessellatedCubeSphere(i, false);
  }
  
  /**
   * Return a tessellated cube sphere of order i.
   * The square faces of a cube are evenly subdivided into i^2 smaller squares,
   * and the vertices are projected onto the unit sphere.
   * If sharedInstance is true, then the returned copy is a shared instance.
   * The resulting polyhedra has 6*(i^2) faces. If i>15, it is clamped to 15.
   * @param {number} i - Subdivision level
   * @param {boolean} sharedInstance - If true, return shared cached instance
   * @returns {SceneGraphComponent}
   */
  static tessellatedCubeSphere(i, sharedInstance) {
    if (sharedInstance) {
      if (i < 0 || i >= SphereUtility.#numberOfTessellatedCubes) {
        getLogger(SphereUtility).warn(Category.GEOMETRY, 'Invalid index');
        if (i < 0) i = 0;
        else i = SphereUtility.#numberOfTessellatedCubes - 1;
      }
    }
    
    if (SphereUtility.#cubeSyms == null) {
      SphereUtility.#cubeSyms = Array(2);
      SphereUtility.#cubeSyms[0] = new Transformation();
      SphereUtility.#cubeSyms[1] = new Transformation([
        -1, 0, 0, 0,
        0, 0, 1, 0,
        0, 1, 0, 0,
        0, 0, 0, 1
      ]);
    }
    
    if (sharedInstance && SphereUtility.#tessellatedCubes[i] != null) {
      return SphereUtility.#tessellatedCubes[i];
    }
    
    // TODO: oneHalfSphere requires AbstractQuadMeshFactory - skip for now
    throw new Error('tessellatedCubeSphere requires AbstractQuadMeshFactory (not yet translated). Use tessellatedIcosahedronSphere instead.');
    
    // const hemisphere = SphereUtility.#oneHalfSphere(2 * i + 2);
    // const parent = new SceneGraphComponent();
    // for (let j = 0; j < 2; ++j) {
    //   const sgc = new SceneGraphComponent();
    //   sgc.setTransformation(SphereUtility.#cubeSyms[j]);
    //   sgc.setGeometry(hemisphere);
    //   parent.addChild(sgc);
    // }
    // if (sharedInstance) {
    //   SphereUtility.#cubePanels[i] = hemisphere;
    //   SphereUtility.#tessellatedCubes[i] = parent;
    // }
    // return parent;
  }
  
  /**
   * Return a standard bounding box for a unit sphere.
   * @returns {Rectangle3D}
   */
  static getSphereBoundingBox() {
    if (SphereUtility.#sphereBB == null) {
      const bnds = [[-1, -1, -1], [1, 1, 1]];
      SphereUtility.#sphereBB = new Rectangle3D();
      SphereUtility.#sphereBB.setBounds(bnds);
    }
    return SphereUtility.#sphereBB;
  }
  
  /**
   * Colorize a PointSet based on distance from center using a ColorGradient.
   * @param {PointSet} ps - Point set to colorize
   * @param {number[]} [center] - Optional center point (defaults to [0,0,0])
   * @param {ColorGradient} [cg] - Optional color gradient (defaults to new ColorGradient())
   */
  static colorizeSphere(ps, center, cg) {
    if (cg == null) cg = new ColorGradient();
    
    const coordsData = ps.getVertexAttribute(GeometryAttribute.COORDINATES);
    const colors = fromDataList(coordsData);
    
    // Calculate min/max distances
    let min = Number.MAX_VALUE;
    let max = 0;
    
    for (let i = 0; i < colors.length; i++) {
      const point = [...colors[i]];
      if (center != null) {
        Rn.subtract(point, point, center);
      }
      const n = Rn.euclideanNorm(point);
      if (n < min) min = n;
      if (n > max) max = n;
    }
    
    // Calculate colors
    const colorArray = Array(colors.length);
    for (let i = 0; i < colors.length; i++) {
      const point = [...colors[i]];
      if (center != null) {
        Rn.subtract(point, point, center);
      }
      const n = Rn.euclideanNorm(point);
      const cc = (n - min) / (max - min);
      const c = cg.getColor(cc);
      colorArray[i] = [
        c.getRed() / 255.0,
        c.getGreen() / 255.0,
        c.getBlue() / 255.0
      ];
    }
    
    const colorDataList = toDataList(colorArray);
    ps.setVertexAttribute(GeometryAttribute.COLORS, colorDataList);
  }
  
  /**
   * Assign spherical UV texture coordinates to a PointSet.
   * @param {PointSet} ps - Point set to assign UVs to
   * @param {number[]} [center] - Optional center point (defaults to [0,0,0])
   */
  static assignSphericalUVs(ps, center) {
    const coordsData = ps.getVertexAttribute(GeometryAttribute.COORDINATES);
    const points = fromDataList(coordsData);
    
    const tc = Array(points.length * 2);
    let i = 0;
    
    for (const p of points) {
      const point = [...p];
      if (center != null) {
        Rn.subtract(point, point, center);
      }
      Rn.normalize(point, point);
      tc[i++] = 0.5 + Math.atan2(point[1], point[0]) / (Math.PI * 2);
      tc[i++] = Math.acos(point[2]) / Math.PI;
    }
    
    const tcDataList = toDataList(tc, 2);
    ps.setVertexAttribute(GeometryAttribute.TEXTURE_COORDINATES, tcDataList);
  }
  
  // Note: sphericalPatch() and sphericalPatchFactory() require QuadMeshFactory - skipped for now
  // Note: oneHalfSphere() requires AbstractQuadMeshFactory - skipped for now
}

