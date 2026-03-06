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
 * Adapter that translates ganja.js PGA element arrays into jsReality scene graphs.
 *
 * Supports:
 *  - Points (trivectors), lines (bivectors), segments (2-element arrays)
 *  - Colors as ARGB numbers (backward compatible)
 *  - Nested arrays as subtree SceneGraphComponents
 *  - Descriptor objects with appearance:/transform:/children:/name: keywords
 *  - PGA motor transforms converted to 4x4 matrices
 */

import { PointSetFactory } from '../core/geometry/PointSetFactory.js';
import { IndexedLineSetFactory } from '../core/geometry/IndexedLineSetFactory.js';
import { Matrix } from '../core/math/Matrix.js';
import * as CommonAttributes from '../core/shader/CommonAttributes.js';
import { Color } from '../core/util/Color.js';
import { SceneGraphUtility } from '../core/util/SceneGraphUtility.js';

export class GanjaAdapter {

    #Element;
    #options;
    #e14;
    #groupIndex = 0;

    /**
     * @param {Function} Element - The ganja Element class (returned by Algebra(3,0,1))
     * @param {Object} [options={}]
     * @param {number} [options.clip=3] - Clipping distance for line->segment conversion
     * @param {number} [options.pointRadius=0.03] - Sphere radius for points
     * @param {number} [options.tubeRadius=0.02] - Tube radius for lines/segments
     */
    constructor(Element, options = {}) {
        this.#Element = Element;
        this.#options = {
            clip: 3,
            pointRadius: 0.03,
            tubeRadius: 0.02,
            ...options
        };
        this.#e14 = Element.Coeff(14, 1);
    }

    /**
     * Extract Euclidean (x,y,z) from a PGA trivector.
     * PGA 3D layout: indices 11=e012, 12=e013, 13=e023, 14=e123.
     * Euclidean position: (-e023/e123, e013/e123, e012/e123).
     *
     * @param {Element} e - A PGA trivector
     * @returns {number[]} [x, y, z]
     */
    static trivectorToPoint(e) {
        const w = e[14];
        return [-e[13] / w, e[12] / w, e[11] / w];
    }

    /**
     * Clip a PGA line (bivector) into two trivector endpoints at +/-clip distance,
     * then return the Euclidean positions.
     *
     * @param {Element} e - A PGA bivector (line)
     * @returns {number[][]} [[x0,y0,z0], [x1,y1,z1]]
     */
    clipLine(e) {
        const Element = this.#Element;
        const clip = this.#options.clip;
        const e14 = this.#e14;
        const e1Coeff = Element.Coeff(1, 1);
        const endpoints = [
            e.LDot(e14).Wedge(e).Add(e.Wedge(e1Coeff).Mul(Element.Coeff(0, -clip))),
            e.LDot(e14).Wedge(e).Add(e.Wedge(e1Coeff).Mul(Element.Coeff(0, clip)))
        ].map(x => x[14] < 0 ? x.Scale(-1) : x);
        return endpoints.map(GanjaAdapter.trivectorToPoint);
    }

    /**
     * Convert a PGA motor (even-grade multivector) to a 4x4 matrix.
     * Replicates ganja.js's mtx() function for non-camera transforms.
     *
     * @param {Element} motor - A PGA motor element
     * @returns {number[]} 16-element column-major matrix
     */
    _motorToMatrix(motor) {
        const m = motor.Normalized;
        const y = m.Mul(m.Dual);
        const X = m.e23, Y = -m.e13, Z = -m.e12, W = m.s;
        const xx = X * X, xy = X * Y, xz = X * Z, xw = X * W;
        const yy = Y * Y, yz = Y * Z, yw = Y * W;
        const zz = Z * Z, zw = Z * W;
        return [
            1 - 2 * (yy + zz), 2 * (xy + zw), 2 * (xz - yw), 0,
            2 * (xy - zw), 1 - 2 * (xx + zz), 2 * (yz + xw), 0,
            2 * (xz + yw), 2 * (yz - xw), 1 - 2 * (xx + yy), 0,
            -2 * y.e23, -2 * y.e13, 2 * y.e12, 1
        ];
    }

    /**
     * Apply a PGA motor as a 4x4 transformation on a SceneGraphComponent.
     *
     * @param {SceneGraphComponent} sgc
     * @param {Element} motor - A PGA motor element
     */
    _applyTransform(sgc, motor) {
        const mat = this._motorToMatrix(motor);
        new Matrix(mat).assignTo(sgc);
    }

    /**
     * Apply an appearance descriptor object to a SceneGraphComponent.
     * Each key-value pair is passed to appearance.setAttribute().
     *
     * @param {SceneGraphComponent} sgc
     * @param {Object} attrObj - Key-value pairs for setAttribute
     */
    _applyAppearance(sgc, attrObj) {
        const ap = sgc.getAppearance();
        for (const [key, value] of Object.entries(attrObj)) {
            ap.setAttribute(key, value);
        }
    }

    /**
     * Build a jsReality scene graph from a ganja element array (PGA only).
     *
     * @param {Array} elements - Ganja element array
     * @returns {SceneGraphComponent} Root scene graph component
     */
    buildScene(elements) {
        this.#groupIndex = 0;
        const root = this._buildNode(elements, 'ganja-root');
        const ap = root.getAppearance();
        ap.setAttribute(CommonAttributes.LIGHTING_ENABLED, true);
        ap.setAttribute(CommonAttributes.VERTEX_DRAW, false);
        ap.setAttribute(CommonAttributes.EDGE_DRAW, false);
        return root;
    }

    /**
     * Recursively build a SceneGraphComponent subtree from an element array.
     * Each recursion level has its own color and geometry accumulators.
     *
     * @param {Array} elements - Element array for this level
     * @param {string} name - Name for the SGC node
     * @returns {SceneGraphComponent}
     */
    _buildNode(elements, name) {
        const Element = this.#Element;
        const nodeSGC = SceneGraphUtility.createFullSceneGraphComponent(name);

        let color = [0.5, 0.5, 0.5];
        let alpha = 0;
        let points = [];
        let lineVerts = [];
        let pendingAppearance = null;

        const flush = () => {
            if (points.length === 0 && lineVerts.length === 0) return;

            const groupSGC = SceneGraphUtility.createFullSceneGraphComponent(
                `ganja-batch-${this.#groupIndex++}`
            );
            const jsrColor = new Color(
                Math.round(color[0] * 255),
                Math.round(color[1] * 255),
                Math.round(color[2] * 255)
            );

            if (pendingAppearance) {
                this._applyAppearance(groupSGC, pendingAppearance);
                pendingAppearance = null;
            }

            if (points.length > 0) {
                const ptSGC = SceneGraphUtility.createFullSceneGraphComponent(
                    `ganja-points-${this.#groupIndex}`
                );
                const psf = new PointSetFactory();
                psf.setVertexCount(points.length);
                psf.setVertexCoordinates(points);
                psf.update();
                ptSGC.setGeometry(psf.getPointSet());

                const ptAp = ptSGC.getAppearance();
                ptAp.setAttribute(CommonAttributes.VERTEX_DRAW, true);
                ptAp.setAttribute(CommonAttributes.SPHERES_DRAW, true);
                ptAp.setAttribute(CommonAttributes.POINT_RADIUS, this.#options.pointRadius);
                ptAp.setAttribute(
                    CommonAttributes.POINT_SHADER + "." + CommonAttributes.DIFFUSE_COLOR,
                    jsrColor
                );
                groupSGC.addChild(ptSGC);
            }

            if (lineVerts.length > 0) {
                const numSegments = lineVerts.length / 2;
                const allVerts = lineVerts.flat();
                const edges = [];
                for (let i = 0; i < numSegments; i++) {
                    edges.push([i * 2, i * 2 + 1]);
                }

                const lnSGC = SceneGraphUtility.createFullSceneGraphComponent(
                    `ganja-lines-${this.#groupIndex}`
                );
                const ilsf = new IndexedLineSetFactory();
                ilsf.setVertexCount(numSegments * 2);
                ilsf.setVertexCoordinates(allVerts, 3);
                ilsf.setEdgeCount(numSegments);
                ilsf.setEdgeIndices(edges);
                ilsf.update();
                lnSGC.setGeometry(ilsf.getIndexedLineSet());

                const lnAp = lnSGC.getAppearance();
                lnAp.setAttribute(CommonAttributes.EDGE_DRAW, true);
                lnAp.setAttribute(CommonAttributes.VERTEX_DRAW, false);
                lnAp.setAttribute(CommonAttributes.TUBES_DRAW, true);
                lnAp.setAttribute(CommonAttributes.TUBE_RADIUS, this.#options.tubeRadius);
                lnAp.setAttribute(
                    CommonAttributes.LINE_SHADER + "." + CommonAttributes.DIFFUSE_COLOR,
                    jsrColor
                );
                groupSGC.addChild(lnSGC);
            }

            nodeSGC.addChild(groupSGC);
            points = [];
            lineVerts = [];
        };

        for (let i = 0; i < elements.length; i++) {
            let e = elements[i];

            while (e && e.call && !e.length) e = e();
            if (e === undefined || e === null) continue;

            // Color (number)
            if (typeof e === 'number') {
                flush();
                alpha = ((e >>> 24) & 0xff) / 255;
                color = [
                    ((e >>> 16) & 0xff) / 255,
                    ((e >>> 8) & 0xff) / 255,
                    (e & 0xff) / 255
                ];
                continue;
            }

            if (typeof e === 'string') continue;

            // Segment: array of exactly 2 Elements
            if (Array.isArray(e) && e.length === 2 &&
                e[0] instanceof Element && e[1] instanceof Element) {
                const p0 = GanjaAdapter.trivectorToPoint(e[0]);
                const p1 = GanjaAdapter.trivectorToPoint(e[1]);
                lineVerts.push(p0, p1);
                continue;
            }

            // Subtree: any other array
            if (Array.isArray(e)) {
                flush();
                const childSGC = this._buildNode(e, `ganja-sub-${this.#groupIndex++}`);
                nodeSGC.addChild(childSGC);
                continue;
            }

            // Descriptor object: plain object with appearance/transform/children/name
            if (typeof e === 'object' && !(e instanceof Element)) {
                flush();
                if (e.children) {
                    const childName = e.name || `ganja-group-${this.#groupIndex++}`;
                    const childSGC = this._buildNode(e.children, childName);
                    if (e.transform) this._applyTransform(childSGC, e.transform);
                    if (e.appearance) this._applyAppearance(childSGC, e.appearance);
                    nodeSGC.addChild(childSGC);
                } else if (e.appearance) {
                    pendingAppearance = e.appearance;
                }
                continue;
            }

            if (!(e instanceof Element)) continue;

            // Line (bivector)
            if (!e[14] && e.Grade(2).Length > 0.0001) {
                const [p0, p1] = this.clipLine(e);
                lineVerts.push(p0, p1);
                continue;
            }

            // Point (trivector)
            if (e[14]) {
                points.push(GanjaAdapter.trivectorToPoint(e));
                continue;
            }
        }

        flush();
        return nodeSGC;
    }

    /**
     * Static convenience: evaluate a ganja scene function and build a jsReality scene graph.
     *
     * @param {Function} Element - The ganja Element class
     * @param {Function|Array} f - Scene function or element array
     * @param {Object} [options={}] - Options passed to GanjaAdapter constructor
     * @returns {SceneGraphComponent}
     */
    static render(Element, f, options = {}) {
        const adapter = new GanjaAdapter(Element, options);
        let elements = f;
        while (elements && elements.call) elements = elements();
        if (!Array.isArray(elements)) elements = [elements];
        return adapter.buildScene(elements);
    }
}
