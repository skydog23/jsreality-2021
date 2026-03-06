/**
 * ES module helper to load ganja.js's Algebra function into the global scope.
 * Ganja.js uses a UMD wrapper that requires a classic <script> tag context.
 *
 * Usage:
 *   import { loadAlgebra } from '../../ganja/loadAlgebra.js';
 *   const Algebra = await loadAlgebra();
 *   const PGA3D = Algebra(3, 0, 1);
 */

export function loadAlgebra() {
    return new Promise((resolve, reject) => {
        if (window.Algebra) {
            resolve(window.Algebra);
            return;
        }
        const script = document.createElement('script');
        script.src = new URL('./ganja.js', import.meta.url).href;
        script.onload = () => resolve(window.Algebra);
        script.onerror = () => reject(new Error('Failed to load ganja.js'));
        document.head.appendChild(script);
    });
}
