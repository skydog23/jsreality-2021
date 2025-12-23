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
 * Central registry for plugin ID strings.
 *
 * Using constants instead of raw string literals reduces the chance of drift
 * between plugins and code that references them (e.g. context.getPlugin(...)).
 */
export const PluginIds = Object.freeze({
  MENUBAR: 'menubar',
  JSRAPP: 'jsrapp',
  SHRINK_PANEL_AGGREGATOR: 'shrink-panel-aggregator',
  SCENE_GRAPH_INSPECTOR: 'scene-graph-inspector',
  LOGGING_INSPECTOR: 'logging-inspector',
  ANIMATION: 'animation',
  EXPORT_MENU: 'export-menu',
  APP_MENU: 'app-menu',
  PANEL_SHOW_MENU: 'panel-show-menu',
  BACKGROUND_COLOR: 'background-color'
});

