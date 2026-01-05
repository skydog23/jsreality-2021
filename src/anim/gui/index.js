/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

export { AnimationPanel } from './AnimationPanel.js';
export { AnimationPanelEvent, EventType } from './AnimationPanelEvent.js';
export { AnimationPanelListenerImpl } from './AnimationPanelListenerImpl.js';
export { AnimationPanelRecordListener } from './AnimationPanelRecordListener.js';
export { RecordingPreferences } from './RecordingPreferences.js';
export { createRecordingPreferencesDescriptors } from './RecordingPreferencesDescriptors.js';

// Recording backends (browser vs node/electron)
export {} from './recording/RecorderBackend.js';
export { BrowserRecorderBackend } from './recording/BrowserRecorderBackend.js';
export { FileSystemAccessRecorderBackend } from './recording/FileSystemAccessRecorderBackend.js';
export { NodeRecorderBackend } from './recording/NodeRecorderBackend.js';


