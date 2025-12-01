/**
 * ExportMenuPlugin - Plugin that adds export functionality to the File menu.
 * 
 * Based on jReality's ExportMenu pattern, this plugin adds menu items for
 * exporting the scene as PNG, JPEG, SVG, and WebGL images.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

import { JSRPlugin } from '../plugin/JSRPlugin.js';
import { SVGViewer } from '../../core/viewers/SVGViewer.js';
import { WebGL2DViewer } from '../../core/viewers/WebGL2DViewer.js';
import { getLogger } from '../../core/util/LoggingSystem.js';

const logger = getLogger('ExportMenuPlugin');

/**
 * Plugin that adds export menu items to the File menu.
 */
export class ExportMenuPlugin extends JSRPlugin {
  /**
   * Get plugin metadata.
   * @returns {import('../plugin/JSRPlugin.js').PluginInfo}
   */
  getInfo() {
    return {
      id: 'export-menu',
      name: 'Export Menu',
      vendor: 'jsReality',
      version: '1.0.0',
      description: 'Adds export functionality to the File menu',
      dependencies: ['menubar']  // Requires MenubarPlugin
    };
  }

  /**
   * Install the plugin.
   * 
   * @param {import('../JSRViewer.js').JSRViewer} viewer - The viewer instance
   * @param {import('../plugin/PluginContext.js').PluginContext} context - Plugin context
   */
  async install(viewer, context) {
    await super.install(viewer, context);
    logger.info('Export menu items registered');
  }

  /**
   * Get menu items to add to the menubar.
   * @returns {Array<import('../plugin/JSRPlugin.js').MenuItem>}
   */
  getMenuItems() {
    return [
      {
        menu: 'File',
        label: 'Export PNG',
        action: () => this.#exportImage('png'),
        priority: 10
      },
      {
        menu: 'File',
        label: 'Export JPEG',
        action: () => this.#exportImage('jpeg', 0.95),
        priority: 11
      },
      {
        menu: 'File',
        label: 'Export SVG',
        action: () => this.#exportSVG(),
        priority: 12
      },
      {
        menu: 'File',
        label: 'Export WebGL',
        action: () => this.#exportWebGL(),
        priority: 13
      }
    ];
  }

  /**
   * Export the current view as an image.
   * 
   * @param {string} format - Image format ('png' or 'jpeg')
   * @param {number} [quality] - Quality for JPEG (0-1)
   * @private
   */
  #exportImage(format, quality) {
    const viewer = this.context.getViewer();
    const currentViewer = viewer.getViewer().getCurrentViewer();

    if (currentViewer && typeof currentViewer.exportImage === 'function') {
      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const dataURL = currentViewer.exportImage(mimeType, quality);
      this.#downloadDataURL(dataURL, `scene-export.${format === 'jpeg' ? 'jpg' : 'png'}`);
      logger.info(`Exported image as ${format.toUpperCase()}`);
    } else {
      logger.warn('Current viewer does not support image export');
    }
  }

  /**
   * Export the scene as SVG.
   * @private
   */
  #exportSVG() {
    const viewer = this.context.getViewer();
    const currentViewer = viewer.getViewer().getCurrentViewer();

    // Get dimensions from current viewer
    const viewingComponent = currentViewer.getViewingComponent();
    const width = viewingComponent.clientWidth || 800;
    const height = viewingComponent.clientHeight || 600;

    // Create temporary container for SVG rendering
    const tempContainer = document.createElement('div');
    tempContainer.style.width = `${width}px`;
    tempContainer.style.height = `${height}px`;

    // Create SVGViewer and render
    const svgViewer = new SVGViewer(tempContainer);
    svgViewer.setSceneRoot(viewer.getSceneRoot());
    svgViewer.setCameraPath(viewer.getCameraPath());
    svgViewer.render();

    // Export and download
    const svgString = svgViewer.exportSVG();
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    this.#downloadURL(url, 'scene-export.svg');
    URL.revokeObjectURL(url);

    logger.info('Exported scene as SVG');
  }

  /**
   * Export the scene as WebGL-rendered PNG with anti-aliasing.
   * @private
   */
  #exportWebGL() {
    const viewer = this.context.getViewer();
    const currentViewer = viewer.getViewer().getCurrentViewer();

    // Get dimensions from current viewer
    const viewingComponent = currentViewer.getViewingComponent();
    const width = viewingComponent.clientWidth || 800;
    const height = viewingComponent.clientHeight || 600;

    // Render at 4x resolution for anti-aliasing, output at 2x
    const renderScaleFactor = 4;
    const outputScaleFactor = 2;
    const outputWidth = width * outputScaleFactor;
    const outputHeight = height * outputScaleFactor;

    // Create temporary canvas for WebGL rendering
    const webglCanvas = document.createElement('canvas');
    webglCanvas.style.width = width + 'px';
    webglCanvas.style.height = height + 'px';
    webglCanvas.style.position = 'absolute';
    webglCanvas.style.left = '-9999px';
    document.body.appendChild(webglCanvas);

    try {
      // Create WebGL viewer with high pixel ratio for supersampling
      const webglViewer = new WebGL2DViewer(webglCanvas, {
        preserveDrawingBuffer: true,
        autoResize: false,
        pixelRatio: renderScaleFactor
      });

      webglViewer.setSceneRoot(viewer.getSceneRoot());
      webglViewer.setCameraPath(viewer.getCameraPath());
      webglViewer.render();

      // Small delay to ensure rendering completes
      setTimeout(() => {
        // Create output canvas and scale down
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = outputWidth;
        outputCanvas.height = outputHeight;
        const ctx = outputCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(webglCanvas, 0, 0, webglCanvas.width, webglCanvas.height, 
                      0, 0, outputWidth, outputHeight);

        // Export
        const dataURL = outputCanvas.toDataURL('image/png');
        this.#downloadDataURL(dataURL, 'scene-export-webgl.png');
        
        // Cleanup
        document.body.removeChild(webglCanvas);
        logger.info('Exported scene as WebGL PNG with anti-aliasing');
      }, 100);
    } catch (error) {
      logger.severe(`Failed to export WebGL: ${error.message}`);
      if (webglCanvas.parentNode) {
        document.body.removeChild(webglCanvas);
      }
    }
  }

  /**
   * Download a data URL as a file.
   * 
   * @param {string} dataURL - The data URL
   * @param {string} filename - The filename
   * @private
   */
  #downloadDataURL(dataURL, filename) {
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Download a URL as a file.
   * 
   * @param {string} url - The URL
   * @param {string} filename - The filename
   * @private
   */
  #downloadURL(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

