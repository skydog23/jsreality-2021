/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

// Add references to required classes and utilities
import * as P2 from '../math/P2.js';
import * as Rn from '../math/Rn.js';
import { getLogger, Level, setModuleLevel } from '../util/LoggingSystem.js';
import { ConicUtils } from './ConicUtils.js';
import { GeometryMergeFactory } from './GeometryMergeFactory.js';
import { IndexedLineSetUtility } from './IndexedLineSetUtility.js';
import { PointRangeFactory } from './projective/PointRangeFactory.js';

const logger = getLogger('jsreality.core.geometry.ConicSection');
setModuleLevel(logger.getModuleName(), Level.INFO);

export class ConicSection {
   curve = null;
   conicSGC = null;
   pointSGC = null;
   centerPoint = [0,0,1];
   pointOnConic = [0,0,1];
   drawRadials = false;
   numPoints = 1000;
   tolerance = 1e-6;
   coefficients = [1,0,1,0,0,-1];
   svdConic = null;
   svd5Points = null;
   rank = 0;
   singularValues = null;
   linePair = null;
   Q = null;
   dQ = null;
   dcoefficients = null;
   fivePoints = null;

    constructor(coefficients = [1,0,1,0,0,-1]) {
        this.setCoefficients(coefficients);
        this.update();
    }

    // Update coefficients and recalculate dependent matrices
    setCoefficients(coefficients) {
        this.coefficients = ConicUtils.normalizeCoefficients([ ...coefficients ]);
        this.Q = ConicUtils.convertArrayToQ(...this.coefficients);
        this.dQ = ConicUtils.normalizeCoefficients(P2.cofactor(null, this.Q));
        this.dcoefficients = ConicUtils.convertQToArray(this.dQ);
        logger.info(-1, 'conic Q',this.Q);
        logger.info(-1, 'conic dQ',this.dQ);
        logger.info(-1, 'Q.dQ = ', Rn.times(null, this.Q, this.dQ));
    }
  
    // Get points for general conic in projective space
    update() {
        logger.info(-1, 'Updating conic section');
         logger.info(-1, 'conic rank',this.rank);
       
         if (this.rank === 1) {
            let l1 = new PointRangeFactory();
            l1.set2DLine(this.doubleLine);
            l1.update();
            this.curve = l1.getLine();
            const outer = this.doubleLine.map(a => this.doubleLine.map(b => a * b));
            this.setCoefficients(ConicUtils.convertQToArray(outer.flat()));
            logger.finer(-1, 'outer = ', outer);
            return;
        } 
        else if (this.rank === 2) {
             logger.fine(-1, 'line pair = ', this.linePair);
            let l1 = new PointRangeFactory();
            l1.set2DLine(this.linePair[0]);
            l1.update();
            let l2 = new PointRangeFactory();
            l2.set2DLine(this.linePair[1]);
            l2.update();

            this.curve = GeometryMergeFactory.mergeIndexedLineSets(l1.getLine(), l2.getLine());
            return;
        }
        const [A,B,C,H,G,F] = this.dcoefficients;
        // the polar point of the line at infinity ([0,0,1]) is the center point of a conic
        // have to use the dual conic to act on lines to obtain points
        this.centerPoint = Rn.dehomogenize(null,[G/2,F/2,C]);
        if (this.fivePoints) {
            this.centerPoint = this.fivePoints.reduce((acc, point) => {return Rn.add(null, acc, point);}, [0,0,0]);
            this.centerPoint = Rn.dehomogenize(null, this.centerPoint);
        }
        logger.info(-1, 'Conic center:', this.centerPoint); 
     // Try several lines through X to find a good point on the conic
        this.findPointOnConic();

        // Now rotate a line around this point and find intersections
        const pts4 = new Array(this.numPoints+1).fill(null).map(() => [0,0,0,0]);
        let firstPoint = null;
        for (let i = 0; i < this.numPoints; i++) {
            const angle = ( Math.PI * i) / this.numPoints;
            // find the intersection of a rotating line through the point on the conic with the conic
            // The quadratic form Q(P+tV) is simple because Q(P,P) = 0
            const V = [Math.cos(angle) , Math.sin(angle), 0];
            // Quadratic coefficient (t²)
            const a = Rn.bilinearForm(this.Q, V,V);
            // Linear coefficient (t)
            const b = 2*Rn.bilinearForm(this.Q, V,this.pointOnConic);
            if (Math.abs(a) > 1e-10) {
                const t = -b/a;  // Other solution is t=0 
                const currentPoint = Rn.add(null,this.pointOnConic, Rn.times(null,t,V));
                // logger.finer(-1, 'currentPoint = ', currentPoint);
                pts4[i] = Rn.convert3To4(null, currentPoint);
                if (i === 0) {
                    firstPoint = currentPoint;
                }
            }
        }
        // close up the curve by adding the first point again
        pts4[this.numPoints] = pts4[0];
        this.curve = IndexedLineSetUtility.removeInfinity(pts4, 1.0);       
     }

    getIndexedLineSet() {
        return this.curve;
    }

    findPointOnConic() {
        this.pointOnConic = null;
        let minDistance = Infinity;
        const numTrialLines = 20;

        for (let i = 0; i < numTrialLines; i++) {
            const angle = (2 * Math.PI * i) / numTrialLines;
            const dx = Math.cos(angle);
            const dy = Math.sin(angle);
            const V = [dx, dy, 0];


            // t² coefficient
            const A = Rn.bilinearForm(this.Q, V, V);

            // t¹ coefficient
            const B = 2 * Rn.bilinearForm(this.Q, V, this.centerPoint);

            // t⁰ coefficient
            const C = Rn.bilinearForm(this.Q, this.centerPoint, this.centerPoint);
               // Solve quadratic equation
            if (Math.abs(A) > 1e-10) {
                const disc = B * B - 4 * A * C;
                if (disc >= 0) {
                    // Two solutions for t
                    const t1 = (-B + Math.sqrt(disc)) / (2 * A);
                    const t2 = (-B - Math.sqrt(disc)) / (2 * A);

                    // Try both solutions
                    const points = [
                        Rn.add(null, Rn.times(null, t1, V), this.centerPoint),
                        Rn.add(null, Rn.times(null, t2, V), this.centerPoint)
                    ].map(p => Rn.dehomogenize(null, p));

                    for (const p of points) {
                        // Check if this point is actually on the conic
                        const value = Rn.bilinearForm(this.Q, p, p);
                         if (Math.abs(value) < 1e-8) {
                            const distance = Rn.euclideanNorm(Rn.subtract(null, p, this.centerPoint));
                            // console.log('distance:', distance);
                            if (distance < minDistance) {
                                minDistance = distance;
                                this.pointOnConic = p;
                            }
                        }
                    }
                }
            }
        }

        if (!this.pointOnConic) {
            logger.warn(-1, 'Could not find initial point on conic');
            this.pointOnConic = [0, 0, 1];
        }

        this.pointOnConic = Rn.dehomogenize(null, this.pointOnConic);
        logger.fine(-1, 'Using point on conic:', this.pointOnConic);
    }

    // Get the equation as a string in homogeneous coordinates
    getEquationString() {
        if (!this.coefficients) {
            return 'No equation available';
        }

        const [a,b,c,f,g,h] = this.coefficients;  const terms = [];

        if (a !== 0) terms.push(`${a.toFixed(4)}x²`);
        if (h !== 0) terms.push(`${h > 0 ? '+' : ''}${h.toFixed(4)}xy`);
        if (b !== 0) terms.push(`${b > 0 ? '+' : ''}${b.toFixed(4)}y²`);
        if (g !== 0) terms.push(`${g > 0 ? '+' : ''}${g.toFixed(4)}xw`);
        if (f !== 0) terms.push(`${f > 0 ? '+' : ''}${f.toFixed(4)}yw`);
        if (c !== 0) terms.push(`${c > 0 ? '+' : ''}${c.toFixed(4)}w²`);

        return terms.length > 0 ? `${terms.join(' ')} = 0` : '0 = 0';
    }


    // Build a DOM inspector for this conic
    // options: { onChange: () => void, idPrefix: string, conicId: number }
    getInspector(options = {}) {
        const { onChange, idPrefix = '', conicId = null } = options;
        const wrap = document.createElement('div');
        wrap.className = 'conic-inspector';
        
        // Add data attribute for conic identification
        if (conicId !== null) {
            wrap.setAttribute('data-conic-id', conicId);
        }

        const title = document.createElement('h4');
        title.textContent = 'Conic Inspector';
        wrap.appendChild(title);

        // Coefficients
        // Tabs container
        const tabs = document.createElement('div');
        tabs.className = 'inspector-tabs';
        const tabBar = document.createElement('div');
        tabBar.className = 'inspector-tabbar';
        const tabNames = ['coeffs', 'SVD', 'Other'];
        const tabButtons = {};
        tabNames.forEach((name, idx) => {
            const btn = document.createElement('button');
            btn.textContent = name;
            btn.className = 'inspector-tab' + (idx===0 ? ' active' : '');
            btn.addEventListener('click', () => switchTab(name));
            tabBar.appendChild(btn);
            tabButtons[name] = btn;
        });
        tabs.appendChild(tabBar);

        const tabContent = document.createElement('div');
        tabContent.className = 'inspector-tabcontent';

        // Coeffs tab
        const coeffPane = document.createElement('div');
        coeffPane.className = 'tab-pane';
        const coeffBox = document.createElement('fieldset');
        coeffBox.className = 'inspector-group';
        const coeffHeader = document.createElement('legend');
        coeffHeader.textContent = 'Coefficients';
        coeffBox.appendChild(coeffHeader);

        const coeffs = ['a','h','b','g','f','c'];
        coeffs.forEach((name) => {
            const group = document.createElement('div');
            group.className = 'control-group';

            const row = document.createElement('div');
            row.className = 'slider-row';

            const spanName = document.createElement('span');
            spanName.className = 'variable-name';
            spanName.textContent = name + ':';

            const num = document.createElement('input');
            num.type = 'number';
            num.className = 'variable-value';
            num.step = '0.000001';
            num.value = (this.coefficients?.[name] ?? 0).toFixed(6);

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = '-100';
            slider.max = '100';
            // Map actual value to slider using factor 50 (same as existing UI)
            const actual = parseFloat(num.value);
            slider.value = String(Math.round((isNaN(actual)?0:actual) * 50));

            // Events: slider -> number
            slider.addEventListener('input', () => {
                const actualValue = parseFloat(slider.value) / 50;
                num.value = actualValue.toFixed(6);
                this.setCoefficient(name, actualValue);
                if (typeof onChange === 'function') onChange();
            });

            // Events: number -> slider
            num.addEventListener('input', () => {
                const val = parseFloat(num.value);
                if (!isNaN(val)) {
                    slider.value = String(Math.round(val * 50));
                    this.setCoefficient(name, val);
                    if (typeof onChange === 'function') onChange();
                }
            });

            row.appendChild(spanName);
            row.appendChild(num);
            row.appendChild(slider);
            group.appendChild(row);
            coeffBox.appendChild(group);
        });
        coeffPane.appendChild(coeffBox);
        tabContent.appendChild(coeffPane);

        // SVD tab
        const svdPane = document.createElement('div');
        svdPane.className = 'tab-pane';

        // Helper function to create prefixed IDs
        const createId = (baseId) => {
            return idPrefix ? `${idPrefix}-${baseId}` : baseId;
        };

        const makeMatrixFieldset = (title, matrixId) => {
            const fs = document.createElement('fieldset');
            fs.className = 'inspector-group';
            const lg = document.createElement('legend');
            lg.textContent = title;
            fs.appendChild(lg);
            const holder = document.createElement('div');
            holder.className = 'matrix';
            holder.id = createId(matrixId);
            fs.appendChild(holder);
            return fs;
        };
        svdPane.appendChild(makeMatrixFieldset('U', 'inspector-matrix-U'));
        svdPane.appendChild(makeMatrixFieldset('D', 'inspector-matrix-S'));
        svdPane.appendChild(makeMatrixFieldset('V', 'inspector-matrix-V'));
        tabContent.appendChild(svdPane);

        // Other tab (numPoints, drawRadials, rank)
        const otherPane = document.createElement('div');
        otherPane.className = 'tab-pane';
        const optsBox = document.createElement('fieldset');
        optsBox.className = 'inspector-group';
        const optsHeader = document.createElement('legend');
        optsHeader.textContent = 'Other';
        optsBox.appendChild(optsHeader);

        // numPoints
        const ptsRow = document.createElement('div');
        const ptsLabel = document.createElement('label');
        ptsLabel.textContent = 'Points:';
        ptsLabel.style.width = '4rem';
        ptsLabel.style.display = 'inline-block';
        const ptsInput = document.createElement('input');
        ptsInput.type = 'number';
        ptsInput.min = '50';
        ptsInput.max = '2000';
        ptsInput.step = '50';
        ptsInput.value = String(this.numPoints);
        ptsInput.addEventListener('input', () => {
            const val = parseInt(ptsInput.value, 10);
            if (!isNaN(val)) {
                this.numPoints = val;
                if (typeof onChange === 'function') onChange();
            }
        });
        ptsRow.appendChild(ptsLabel);
        ptsRow.appendChild(ptsInput);
        optsBox.appendChild(ptsRow);

        // drawRadials
        const radRow = document.createElement('div');
        const radLabel = document.createElement('label');
        radLabel.textContent = 'Draw radials';
        const radChk = document.createElement('input');
        radChk.type = 'checkbox';
        radChk.checked = !!this.drawRadials;
        radChk.style.marginLeft = '0.5rem';
        radChk.addEventListener('change', () => {
            this.drawRadials = radChk.checked;
            if (typeof onChange === 'function') onChange();
        });
        radRow.appendChild(radLabel);
        radRow.appendChild(radChk);
        optsBox.appendChild(radRow);

        // rank of Q
        const rankRow = document.createElement('div');
        rankRow.textContent = 'rank(Q): ' + (this.rank ?? '');
        optsBox.appendChild(rankRow);

        otherPane.appendChild(optsBox);
        tabContent.appendChild(otherPane);

        tabs.appendChild(tabContent);
        wrap.appendChild(tabs);

        // tab switching
        const panes = { coeffs: coeffPane, SVD: svdPane, Other: otherPane };
        function switchTab(name) {
            Object.keys(panes).forEach(k => {
                panes[k].style.display = (k === name) ? 'block' : 'none';
                tabButtons[k].classList.toggle('active', k === name);
            });
            if (name === 'SVD') updateInspectorSVD();
        }
        // init
        switchTab('coeffs');

        // render SVD into inspector matrices
        const updateInspectorSVD = () => {
            if (!this.svdConic) return;
            const { U, S, V } = this.svdConic;
            const U3 = [[U[0][0],U[0][1],U[0][2]],[U[1][0],U[1][1],U[1][2]],[U[2][0],U[2][1],U[2][2]]];
            const S3 = [[S[0],0,0],[0,S[1],0],[0,0,S[2]]];
            const VT3 = [[V[0][0],V[1][0],V[2][0]],[V[0][1],V[1][1],V[2][1]],[V[0][2],V[1][2],V[2][2]]];
            ConicSection.updateMatrixGrid(createId('inspector-matrix-U'), U3);
            ConicSection.updateMatrixGrid(createId('inspector-matrix-S'), S3);
            ConicSection.updateMatrixGrid(createId('inspector-matrix-V'), VT3);
        };

        return wrap;
    }

    static updateMatrixGrid(containerId, matrix) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const cell = document.createElement('div');
                cell.className = 'matrix-cell';
                const value = matrix[i][j] || 0;
                cell.textContent = Number(value.toFixed ? value.toFixed(4) : value).toString();
                container.appendChild(cell);
            }
        }
    }
    
    // Draw rank-2 degenerate conic as two lines
    drawLinePair(ctx) {
        if (!this.linePair) {
            logger.fine(-1, 'No lines available for line pair');
            return;
        }
        
        // Set up drawing style for lines
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = .01;
        
        // Draw the two lines
        this.drawLine(ctx, this.linePair[0]);
        this.drawLine(ctx, this.linePair[1]);
        
        // Draw intersection point if lines intersect
        const intersection = P2.pointFromLines(this.linePair[0],this.linePair[1]);
        if (intersection) {
            ctx.save();
            ctx.strokeStyle = '#000000';
            ctx.fillStyle = '#667eea';
            ctx.beginPath();
            ctx.arc(intersection[0], intersection[1], 0.02, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
    }
    
    // Draw a single line
    drawLine(ctx, line) {
     
        logger.fine(-1, "line1 = "+Rn.toString(line));
        const seg = P2.clipLineToCircle(line,[0,0,1],5);
        logger.fine(-1, "seg = "+Rn.toString(seg));
        
        ctx.beginPath();
        ctx.moveTo(seg[0][0], seg[0][1]);
        ctx.lineTo(seg[1][0], seg[1][1]);
        ctx.stroke();
    }
    
}

