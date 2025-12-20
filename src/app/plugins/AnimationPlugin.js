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
 * AnimationPlugin - Port of charlesgunn.anim.plugin.AnimationPlugin (jReality).
 *
 * This plugin provides a shrink-panel UI for configuring animation and wires
 * itself to content changes in the viewer (scene:changed).
 *
 * NOTE: This JS port intentionally follows the Java version's structure:
 * - fields for AnimationPanel/listeners (not yet ported in JS)
 * - animated list holding Animated instances
 * - optional scene-graph animator (SceneGraphAnimator) and camera animator
 *
 * The plugin is designed to be debuggable even before SceneGraphAnimator is
 * fully implemented (it is loaded lazily when needed).
 */

import { JSRPlugin } from '../plugin/JSRPlugin.js';
import { DescriptorType } from '../../core/inspect/descriptors/DescriptorTypes.js';
import { DescriptorUtility } from '../../core/inspect/descriptors/DescriptorUtility.js';
import { getLogger } from '../../core/util/LoggingSystem.js';
import { InterpolationTypes, PlaybackModes } from '../../anim/util/AnimationUtility.js';
import * as CameraUtility from '../../core/util/CameraUtility.js';
import { AnimationPanel } from '../../anim/gui/AnimationPanel.js';
import { AnimationPanelListenerImpl } from '../../anim/gui/AnimationPanelListenerImpl.js';

const logger = getLogger('jsreality.app.plugins.AnimationPlugin');

export class AnimationPlugin extends JSRPlugin {
  /** @type {import('../../core/inspect/descriptors/DescriptorRenderer.js').DescriptorRenderer|null} */
  // (kept for parity with other inspector-like plugins; not required directly here)
  #descriptorRenderer = null;

  /** @type {HTMLElement|null} */
  #panel = null;

  /** @type {Function|null} */
  #unsubscribeSceneChanged = null;

  /** @type {AnimationPanel|null} */
  #ap = null;

  /** @type {AnimationPanelListenerImpl|null} */
  #animPanelListener = null;

  /** @type {Array<import('../../anim/core/Animated.js').Animated>} */
  #animated = [];

  /** @type {any|null} */
  #sga = null;

  /** @type {any|null} */
  #ac = null;

  /** @type {boolean} */
  #animateSceneGraph = true;

  /** @type {boolean} */
  #animateCamera = false;

  /** @type {InterpolationTypes} */
  #defaultInterp = InterpolationTypes.CUBIC_HERMITE;

  getInfo() {
    return {
      id: 'animation',
      name: 'Animation',
      vendor: 'Charles Gunn',
      version: '1.0.0',
      description: 'Animation control panel (port of jReality AnimationPlugin)',
      dependencies: []
    };
  }

  /**
   * @returns {Array<import('../../anim/core/Animated.js').Animated>}
   */
  getAnimated() {
    return this.#animated;
  }

  /**
   * Java parity: AnimationPlugin exposes the underlying AnimationPanel.
   * @returns {import('../../anim/gui/AnimationPanel.js').AnimationPanel|null}
   */
  getAnimationPanel() {
    return this.#ap;
  }

  /**
   * @returns {any|null}
   */
  getSga() {
    return this.#sga;
  }

  /**
   * @returns {boolean}
   */
  isAnimateSceneGraph() {
    return this.#animateSceneGraph;
  }

  /**
   * @param {boolean} animateSceneGraph
   */
  setAnimateSceneGraph(animateSceneGraph) {
    this.#animateSceneGraph = Boolean(animateSceneGraph);
    // Java comment: this can freeze for certain scenes; we keep the behavior but it can be toggled.
    this.resetSceneGraph();
  }

  /**
   * @returns {boolean}
   */
  isAnimateCamera() {
    return this.#animateCamera;
  }

  /**
   * @param {boolean} animateCamera
   */
  setAnimateCamera(animateCamera) {
    this.#animateCamera = Boolean(animateCamera);
    this.#animateCameraImpl();
  }

  /**
   * @returns {InterpolationTypes}
   */
  getDefaultInterp() {
    return this.#defaultInterp;
  }

  /**
   * @param {InterpolationTypes} defaultInterp
   */
  setDefaultInterp(defaultInterp) {
    this.#defaultInterp = defaultInterp;
    if (this.#sga && typeof this.#sga.setDefaultInterp === 'function') {
      this.#sga.setDefaultInterp(defaultInterp);
    }
  }

  /**
   * Java plugin has init() that wires AnimationPanelListenerImpl and AnimationPanelRecordListener.
   * Those GUI/listener classes are not yet ported in jsReality, so init() currently only
   * establishes the animated list container.
   */
  init() {
    if (!Array.isArray(this.#animated)) this.#animated = [];
    if (!this.#ap) this.#ap = new AnimationPanel();
  }

  /**
   * Equivalent to Java update(): reset scene graph + (re)animate camera.
   */
  update() {
    this.resetSceneGraph();
    this.#animateCameraImpl();
    this.#ap?.inspectKeyFrame?.();
  }

  /**
   * Port of Java animateCamera(). In Java this creates KeyFrameAnimatedBean<Camera>.
   * The KeyFrameAnimatedBean abstraction is not yet ported; we keep the hook and the
   * list membership semantics, but do not attempt to animate camera state yet.
   */
  #animateCameraImpl() {
    if (this.#ac && this.#animated.includes(this.#ac)) {
      this.#animated = this.#animated.filter((x) => x !== this.#ac);
    }
    this.#ac = null;
    this.#syncAnimatedList();

    if (!this.#animateCamera) return;

    try {
      const controller = this.context?.getController?.();
      const viewer = controller?.getViewer?.() || this.viewer;
      if (!viewer) return;

      const camera = CameraUtility.getCamera(viewer);
      // Placeholder object to keep parity with the Java plugin's animated list behavior.
      // This will be replaced by a proper KeyFrameAnimatedBean port.
      this.#ac = {
        name: 'cameraBean',
        target: camera
      };
      this.#animated.push(this.#ac);
      this.#syncAnimatedList();
    } catch (e) {
      logger.warn(-1, `animateCamera failed: ${e?.message ?? e}`);
    }
  }

  #syncAnimatedList() {
    // Keep the AnimationPanelListenerImpl pointed at the plugin's animated list.
    this.#animPanelListener?.setAnimated?.(this.#animated);
  }

  /**
   * Port of Java resetSceneGraph().
   * Creates SceneGraphAnimator(viewer.getSceneRoot()), sets default interp, init(), and adds to animated list.
   *
   * This implementation loads SceneGraphAnimator lazily so AnimationPlugin can exist
   * before that class is fully implemented/ported.
   */
  async resetSceneGraph() {
    if (this.#sga && this.#animated.includes(this.#sga)) {
      this.#animated = this.#animated.filter((x) => x !== this.#sga);
    }
    this.#sga = null;
    this.#syncAnimatedList();

    if (!this.#animateSceneGraph) return;

    const controller = this.context?.getController?.();
    const sceneRoot = controller?.getSceneRoot?.();
    if (!sceneRoot) return;

    let SceneGraphAnimator = null;
    try {
      // eslint-disable-next-line no-unused-vars
      ({ SceneGraphAnimator } = await import('../../anim/scenegraph/SceneGraphAnimator.js'));
    } catch (e) {
      // Not yet implemented/available; allow plugin to run.
      logger.warn(-1, `SceneGraphAnimator not available yet: ${e?.message ?? e}`);
      return;
    }

    try {
      this.#sga = new SceneGraphAnimator(sceneRoot);
      if (typeof this.#sga.setDefaultInterp === 'function') {
        this.#sga.setDefaultInterp(this.#defaultInterp);
      }
      if (typeof this.#sga.setName === 'function') {
        this.#sga.setName('sga');
      } else {
        this.#sga.name = 'sga';
      }
      if (typeof this.#sga.init === 'function') {
        this.#sga.init();
      }
      this.#animated.push(this.#sga);
      this.#syncAnimatedList();
    } catch (e) {
      logger.warn(-1, `resetSceneGraph failed: ${e?.message ?? e}`);
      this.#sga = null;
    }
  }

  /**
   * Build the descriptor-driven UI for the shrink panel.
   * @returns {Array<import('../../core/inspect/descriptors/DescriptorTypes.js').InspectorDescriptor>}
   */
  #getInspectorDescriptors() {
    const interpOptions = [
      { value: InterpolationTypes.CONSTANT, label: 'CONSTANT' },
      { value: InterpolationTypes.LINEAR, label: 'LINEAR' },
      { value: InterpolationTypes.CUBIC_HERMITE, label: 'CUBIC_HERMITE' },
      { value: InterpolationTypes.CUBIC_BSPLINE, label: 'CUBIC_BSPLINE' }
    ];

    return [
      {
        type: DescriptorType.LABEL,
        label: 'Key frames / Playback',
        getValue: () => ''
      },
      {
        type: DescriptorType.CONTAINER,
        label: '',
        direction: 'row',
        items: [
          {
            type: DescriptorType.INT,
            label: '#',
            getValue: () => this.#ap?.getInspectedKeyFrame?.() ?? 0,
            setValue: (v) => this.#ap?.setInspectedKeyFrame?.(v)
          },
          {
            type: DescriptorType.BUTTON,
            label: '<',
            action: () => this.#ap?.retreatKeyFrame?.()
          },
          {
            type: DescriptorType.BUTTON,
            label: '>',
            action: () => this.#ap?.advanceKeyFrame?.()
          },
          {
            type: DescriptorType.BUTTON,
            label: 'Insert',
            action: () => this.#ap?.insertKeyFrame?.()
          },
          {
            type: DescriptorType.BUTTON,
            label: 'Save',
            action: () => this.#ap?.saveKeyFrame?.()
          },
          {
            type: DescriptorType.BUTTON,
            label: 'Delete',
            action: () => this.#ap?.deleteKeyFrame?.()
          }
        ]
      },
      {
        type: DescriptorType.TEXT_SLIDER,
        label: 't',
        min: 0,
        step: 0.01,
        getValue: () => this.#ap?.getCurrentTime?.() ?? 0,
        setValue: (v) => this.#ap?.scrubTime?.(v)
      },
      {
        type: DescriptorType.CONTAINER,
        label: '',
        direction: 'row',
        items: [
          {
            type: DescriptorType.BUTTON,
            label: 'Play/Pause',
            variant: 'primary',
            action: () => this.#ap?.togglePlay?.()
          },
          {
            type: DescriptorType.BUTTON,
            label: 'Reset',
            variant: 'secondary',
            action: () => this.#ap?.reset?.()
          }
        ]
      },
      {
        type: DescriptorType.ENUM,
        label: 'Playback mode',
        options: [
          { value: PlaybackModes.NORMAL, label: 'NORMAL' },
          { value: PlaybackModes.CYCLE, label: 'CYCLE' },
          { value: PlaybackModes.SHUTTLE, label: 'SHUTTLE' }
        ],
        getValue: () => this.#ap?.getPlaybackMode?.() ?? PlaybackModes.NORMAL,
        setValue: (v) => this.#ap?.setPlaybackMode?.(v)
      },
      {
        type: DescriptorType.TEXT_SLIDER,
        label: 'Speed',
        min: 0.01,
        max: 5.0,
        step: 0.01,
        scale: 'log',
        getValue: () => this.#ap?.getPlaybackFactor?.() ?? 1.0,
        setValue: (v) => this.#ap?.setPlaybackFactor?.(v)
      },
      {
        type: DescriptorType.TOGGLE,
        label: 'Animate scene graph',
        getValue: () => this.#animateSceneGraph,
        setValue: (v) => this.setAnimateSceneGraph(Boolean(v))
      },
      {
        type: DescriptorType.TOGGLE,
        label: 'Animate camera',
        getValue: () => this.#animateCamera,
        setValue: (v) => this.setAnimateCamera(Boolean(v))
      },
      {
        type: DescriptorType.ENUM,
        label: 'Default interpolation',
        options: interpOptions,
        getValue: () => this.#defaultInterp,
        setValue: (v) => this.setDefaultInterp(v)
      },
      {
        type: DescriptorType.CONTAINER,
        label: '',
        direction: 'row',
        justify: 'flex-end',
        items: [
          {
            type: DescriptorType.BUTTON,
            label: 'Update',
            variant: 'primary',
            action: () => {
              this.update();
              this.context?.getController?.()?.render?.();
            }
          },
          {
            type: DescriptorType.BUTTON,
            label: 'Reset SG',
            variant: 'secondary',
            action: () => {
              void this.resetSceneGraph();
              this.context?.getController?.()?.render?.();
            }
          }
        ]
      }
    ];
  }

  async install(viewer, context) {
    await super.install(viewer, context);

    logger.info(-1, 'AnimationPlugin installing...');

    this.init();

    const controller = context.getController();
    if (!controller) {
      logger.severe(-1, 'Controller not available in context!');
      throw new Error('PluginController not available');
    }

    // Wire panel -> animated list listener (Java: AnimationPanelListenerImpl(viewer, "application")).
    this.#animPanelListener = new AnimationPanelListenerImpl({
      name: 'application',
      animated: this.#animated,
      afterApply: () => controller.render()
    });
    this.#ap?.addAnimationPanelListener?.(this.#animPanelListener);

    // Register shrink-panel UI with aggregator (similar to JSRApp.#registerInspectorPanel)
    const registerPanel = () => {
      const aggregator = context.getPlugin('shrink-panel-aggregator');
      if (!aggregator || typeof aggregator.registerInspectorPanel !== 'function') {
        return false;
      }

      const descriptors = this.#getInspectorDescriptors();
      const panel = DescriptorUtility.createDefaultInspectorPanel(
        'Animation',
        descriptors,
        {
          id: this.getInfo().id,
          icon: '🎞️',
          collapsed: false,
          // Ensure changes get a render pass.
          onPropertyChange: () => controller.render()
        }
      );
      this.#panel = panel;
      aggregator.registerInspectorPanel(this.getInfo().id, panel);
      return true;
    };

    if (!registerPanel()) {
      // Aggregator not yet registered (should be rare). Wait and retry.
      const unsubscribe = context.on('plugin:installed', (data) => {
        if (data?.plugin?.getInfo?.().id === 'shrink-panel-aggregator') {
          registerPanel();
          unsubscribe();
        }
      });
    }

    // Content change wiring (Java: ContentChangedListener)
    this.#unsubscribeSceneChanged = controller.on('scene:changed', () => {
      logger.fine(-1, 'AnimationPlugin: scene changed');
      if (this.#animateSceneGraph) {
        void this.resetSceneGraph();
      }
    });

    // Initial setup
    await this.resetSceneGraph();
    this.#animateCameraImpl();
    this.#syncAnimatedList();
    this.#ap?.inspectKeyFrame?.();

    logger.info(-1, 'AnimationPlugin installed successfully');
  }

  async uninstall() {
    // Unsubscribe from events
    if (this.#unsubscribeSceneChanged) {
      this.#unsubscribeSceneChanged();
      this.#unsubscribeSceneChanged = null;
    }

    // Unregister panel from aggregator (if present)
    const aggregator = this.context?.getPlugin?.('shrink-panel-aggregator');
    if (aggregator && typeof aggregator.unregisterInspectorPanel === 'function') {
      aggregator.unregisterInspectorPanel(this.getInfo().id);
    }
    this.#panel = null;
    this.#descriptorRenderer = null;

    // Stop playback loop and drop listener references.
    if (this.#ap) {
      this.#ap.setPaused?.(true);
    }
    this.#ap = null;
    this.#animPanelListener = null;

    this.#animated = [];
    this.#sga = null;
    this.#ac = null;

    await super.uninstall();
    logger.info(-1, 'AnimationPlugin uninstalled');
  }
}

