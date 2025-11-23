# Contributing to jsReality

Thank you for your interest in contributing to jsReality!

## Copyright Notice Requirements

### For New Files

When creating new JavaScript files, **always** include the jsReality copyright notice at the very top of the file:

```javascript
/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */
```

### Important Guidelines

1. **Do NOT copy copyright notices from Java source files** - The Java files contain the full BSD license text, but JavaScript files should only reference the LICENSE file
2. **Use the exact format above** - Consistency is important for legal compliance
3. **Place it at the very top** - Before any imports, comments, or other code
4. **Reference the LICENSE file** - Never include the full license text in source files

### Template

A template file (`FILE_TEMPLATE.js`) is provided in the root directory. Use it as a starting point for new files.

### Example File Structure

```javascript
/**
 * JavaScript port/translation of jReality.
 * 
 * Copyright (c) 2024, jsReality Contributors
 * Copyright (c) 2003-2006, jReality Group: Charles Gunn, Tim Hoffmann, Markus
 * Schmies, Steffen Weissmann.
 * 
 * Licensed under BSD 3-Clause License (see LICENSE file for full text)
 */

// Optional descriptive comment
// JavaScript port of jReality's [ClassName] class

import { ... } from './...';

// Your code here
```

## Code Style

- Use ES6+ modules (`import`/`export`)
- Follow existing code patterns in the codebase
- Use JSDoc comments for public APIs
- Maintain consistency with existing file structure
- Use meaningful variable and function names

## Translation from Java

When translating Java files to JavaScript:

1. **Remove Java-specific code** - No AWT, Swing, or Java collections
2. **Adapt to JavaScript idioms** - Use arrays, Maps, and modern JS features
3. **Update copyright notice** - Replace Java copyright with jsReality copyright
4. **Maintain functionality** - Preserve the original behavior and API where possible
5. **Add JSDoc types** - Use JSDoc for type information since we're using JavaScript

## Testing

- Add tests for new functionality
- Ensure existing tests pass
- Follow existing test patterns

## Questions?

If you have questions about contributing, please open an issue or contact the maintainers.

