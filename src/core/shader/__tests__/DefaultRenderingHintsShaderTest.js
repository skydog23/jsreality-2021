/**
 * JavaScript port/translation of a Charles Gunn Java codebase.
 *
 * Copyright (c) 2008–2026, Charles Gunn
 *
 * Licensed under the BSD 3-Clause License. See LICENSE for details.
 * Contributors retain copyright to their contributions.
 */

import { Appearance } from '../../scene/Appearance.js';
import { EffectiveAppearance } from '../EffectiveAppearance.js';
import { DefaultRenderingHintsShader } from '../DefaultRenderingHintsShader.js';
import * as CommonAttributes from '../CommonAttributes.js';

describe('DefaultRenderingHintsShader + EffectiveAppearance', () => {
  test('resolves defaults when attributes are not explicitly set', () => {
    const app = new Appearance('app');
    const ea = EffectiveAppearance.create().createChild(app);
    const resolved = ea.resolveShaderAttributes(DefaultRenderingHintsShader, '', {});

    expect(resolved.lightingEnabled).toBe(DefaultRenderingHintsShader.LIGHTING_ENABLED_DEFAULT);
    expect(resolved.flipNormals).toBe(DefaultRenderingHintsShader.FLIP_NORMALS_DEFAULT);
    expect(resolved.backFaceCulling).toBe(DefaultRenderingHintsShader.BACK_FACE_CULLING_DEFAULT);
  });

  test('resolves explicitly set attributes', () => {
    const app = new Appearance('app');
    app.setAttribute(CommonAttributes.LIGHTING_ENABLED, false);
    app.setAttribute(CommonAttributes.FLIP_NORMALS_ENABLED, true);

    const ea = EffectiveAppearance.create().createChild(app);
    const resolved = ea.resolveShaderAttributes(DefaultRenderingHintsShader, '', {});

    expect(resolved.lightingEnabled).toBe(false);
    expect(resolved.flipNormals).toBe(true);
  });
});


