/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

import { DescriptorType } from '../../core/inspect/descriptors/DescriptorTypes.js';

/**
 * Descriptor builder for `RecordingPreferences`, mirroring the Swing layout of
 * `RecordingPreferences.java#createAccessory()` but staying DOM-free.
 *
 * @param {import('./RecordingPreferences.js').RecordingPreferences} prefs
 * @param {{
 *  onPickDirectory?: () => void|Promise<void>,
 *  canPickDirectory?: boolean,
 * }} [options]
 * @returns {Array<import('../../core/inspect/descriptors/DescriptorTypes.js').InspectorDescriptor>}
 */
export function createRecordingPreferencesDescriptors(prefs, options = {}) {
  const { onPickDirectory = null, canPickDirectory = false } = options;

  const aaOptions = [
    { value: 1, label: 'none' },
    { value: 2, label: '2x2' },
    { value: 4, label: '4x4' }
  ];

  const suffixes = Array.isArray(prefs?.constructor?.fileSuffixes)
    ? prefs.constructor.fileSuffixes
    : ['tiff', 'jpg', 'png'];
  const suffixOptions = suffixes.map((s) => ({ value: s, label: s }));

  return [
    {
      type: DescriptorType.CONTAINER,
      direction: 'column',
      border: true,
      containerLabel: 'Recording Preferences',
      items: [
        {
          type: DescriptorType.CONTAINER,
          direction: 'row',
          items: [
            {
              type: DescriptorType.CONTAINER,
              label: '',
              direction: 'column',
              border: true,
              containerLabel: 'Dimension',
              description: 'Set image dimensions',
              items: [
                {
                  type: DescriptorType.INT,
                  label: 'Width',
                  min: 1,
                  getValue: () => prefs.getDimension().width,
                  setValue: (v) => prefs.setDimension({ ...prefs.getDimension(), width: v })
                },
                {
                  type: DescriptorType.INT,
                  label: 'Height',
                  min: 1,
                  getValue: () => prefs.getDimension().height,
                  setValue: (v) => prefs.setDimension({ ...prefs.getDimension(), height: v })
                }
              ]
            },

            {
              type: DescriptorType.CONTAINER,
              containerlabel: 'Image options',
              direction: 'column',
              border: true,

              items: [
                {
                  type: DescriptorType.ENUM,
                  label: 'S-samples',
                  options: aaOptions,
                  description: 'Choose supersampling factor for offscreen rendering.',
                  getValue: () => prefs.getAntialiasing(),
                  setValue: (v) => prefs.setAntialiasing(v)
                },

                {
                  type: DescriptorType.ENUM,
                  label: 'File format',
                  options: suffixOptions,
                  description: 'Choose the output image format.',
                  getValue: () => prefs.getFileFormatSuffix(),
                  setValue: (v) => prefs.setFileFormatSuffix(v)
                }
              ]
            },
            {
              type: DescriptorType.CONTAINER,
              label: '',
              direction: 'column',
              border: true,
              containerLabel: 'Save options',
              items: [
                {
                  type: DescriptorType.TOGGLE,
                  label: 'save alpha',
                  getValue: () => prefs.isSaveAlpha(),
                  setValue: (v) => prefs.setSaveAlpha(Boolean(v))
                },
                {
                  type: DescriptorType.TOGGLE,
                  label: 'save scrnshot',
                  getValue: () => prefs.isSaveScreenshot(),
                  setValue: (v) => prefs.setSaveScreenshot(Boolean(v))
                }
              ]
            },
        
            {
              type: DescriptorType.CONTAINER,
              label: '',
              direction: 'column',
              containerLabel: 'Timing',
              items: [

                {
                  type: DescriptorType.INT,
                  label: 'FPS',
                  description: 'Set frames per second for recording mode.',
                  min: 1,
                  getValue: () => prefs.getFps(),
                  setValue: (v) => prefs.setFps(v)
                },
                {
                  type: DescriptorType.CONTAINER,
                  label: '',
                  direction: 'row',
                  border: true,
                  containerLabel: 'Begin:End',
                  items: [
                    {
                      type: DescriptorType.FLOAT,
                      label: '',
                      getValue: () => prefs.getStartTime(),
                      setValue: (v) => prefs.setStartTime(v)
                    },
                    {
                      type: DescriptorType.FLOAT,
                      label: '',
                      getValue: () => prefs.getEndTime(),
                      setValue: (v) => prefs.setEndTime(v)
                    }
                  ]
                }
              ],
            }
          ]
        },
        {
          type: DescriptorType.CONTAINER,
          label: '',
          direction: 'row',
          items: [
            {
              type: DescriptorType.CONTAINER,
              label: '',
              direction: 'row',
              border: true,
              containerLabel: 'Directory',
              items: [
                {
                  type: DescriptorType.TEXT,
                  label: 'Directory',
                  description: 'Set path to directory for saving images in recording mode.',
                  getValue: () => prefs.getCurrentDirectoryPath(),
                  setValue: (v) => prefs.setCurrentDirectoryPath(v)
                },
                {
                  type: DescriptorType.BUTTON,
                  label: 'Browse…',
                  disabled: !canPickDirectory || typeof onPickDirectory !== 'function',
                  action: () => onPickDirectory?.()
                }
              ]
            },
            {
                  type: DescriptorType.CONTAINER,
                  label: '',
                  direction: 'row',
                  border: true,
                  containerLabel: 'File name',
                  items: [
                {
                  type: DescriptorType.TEXT,
                  label: 'Stem',
                  description: 'Choose the stem name for saving images in recording mode.',
                  getValue: () => prefs.getStemName(),
                  setValue: (v) => prefs.setStemName(v)
                },
                {
                  type: DescriptorType.INT,
                  label: 'Start count',
                  description: 'Choose the start count for numbering images in recording mode.',
                  getValue: () => prefs.getStartCount(),
                  setValue: (v) => prefs.setStartCount(v)
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}


