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
      label: '',
      direction: 'column',
      border: true,
      containerLabel: 'Recording Preferences',
      items: [
        {
          type: DescriptorType.CONTAINER,
          label: '',
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
              label: '',
              direction: 'column',
              items: [
                {
                  type: DescriptorType.CONTAINER,
                  label: '',
                  direction: 'column',
                  border: true,
                  containerLabel: 'Antialiasing factor',
                  description:
                    'Choose the factor of dimension scaling for “antialiased” offscreen rendering.',
                  items: [
                    {
                      type: DescriptorType.ENUM,
                      label: '',
                      options: aaOptions,
                      getValue: () => prefs.getAntialiasing(),
                      setValue: (v) => prefs.setAntialiasing(v)
                    }
                  ]
                },
                {
                  type: DescriptorType.CONTAINER,
                  label: '',
                  direction: 'column',
                  border: true,
                  containerLabel: 'Image format',
                  description: 'Choose the output image format.',
                  items: [
                    {
                      type: DescriptorType.ENUM,
                      label: '',
                      options: suffixOptions,
                      getValue: () => prefs.getFileFormatSuffix(),
                      setValue: (v) => prefs.setFileFormatSuffix(v)
                    }
                  ]
                }
              ]
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
              direction: 'column',
              border: true,
              containerLabel: 'FPS',
              description: 'Set frames per second for recording mode.',
              items: [
                {
                  type: DescriptorType.INT,
                  label: '',
                  min: 1,
                  getValue: () => prefs.getFps(),
                  setValue: (v) => prefs.setFps(v)
                }
              ]
            },
            {
              type: DescriptorType.CONTAINER,
              label: '',
              direction: 'column',
              border: true,
              containerLabel: 'Alpha channel',
              items: [
                {
                  type: DescriptorType.TOGGLE,
                  label: 'save alpha',
                  getValue: () => prefs.isSaveAlpha(),
                  setValue: (v) => prefs.setSaveAlpha(Boolean(v))
                },
                {
                  type: DescriptorType.TOGGLE,
                  label: 'save screenshot',
                  getValue: () => prefs.isSaveScreenshot(),
                  setValue: (v) => prefs.setSaveScreenshot(Boolean(v))
                }
              ]
            }
          ]
        },
        {
          type: DescriptorType.CONTAINER,
          label: '',
          direction: 'row',
          border: true,
          containerLabel: 'Record interval',
          items: [
            {
              type: DescriptorType.FLOAT,
              label: 'Start',
              getValue: () => prefs.getStartTime(),
              setValue: (v) => prefs.setStartTime(v)
            },
            {
              type: DescriptorType.FLOAT,
              label: 'End',
              getValue: () => prefs.getEndTime(),
              setValue: (v) => prefs.setEndTime(v)
            }
          ]
        },
        {
          type: DescriptorType.CONTAINER,
          label: '',
          direction: 'row',
          border: true,
          containerLabel: 'Save directory',
          items: [
            {
              type: DescriptorType.TEXT,
              label: '',
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
  ];
}


