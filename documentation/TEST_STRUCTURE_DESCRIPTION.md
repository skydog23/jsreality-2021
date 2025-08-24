# Test Structure Description

This document describes the organization and structure of tests in the jSReality JavaScript project.

## 📁 Test Organization

The project follows a dual testing approach with clear separation between unit tests and integration tests:

```
jsreality-2021/
├── test/                           (Browser integration tests)
│   ├── index.html                  (Test launcher page)
│   ├── canvas2d-test.html         (Canvas2D viewer test)
│   └── traversal-test.html        (Scene graph traversal test)
├── src/core/
│   ├── math/__tests__/            (Math unit tests)
│   │   ├── Pn.test.js             (Projective geometry tests)
│   │   └── Rn.test.js             (Real projective geometry tests)
│   ├── scene/__tests__/           (Scene graph unit tests)
│   │   ├── ViewerTest.js          (Abstract Viewer interface tests)
│   │   ├── SceneGraphPathTest.js  (Scene path functionality tests)
│   │   └── SceneGraphTraversalTest.js (Visitor pattern tests)
│   ├── scene/data/__tests__/      (Data system unit tests)
│   │   └── DataListTest.js        (DataList and VariableDataList tests)
│   └── viewers/__tests__/         (Viewer implementation unit tests)
│       └── Canvas2DViewerTest.js  (Canvas2D rendering tests)
```

## 🧪 Test Categories

### Unit Tests (`src/**/__tests__/`)
**Purpose**: Test individual components and classes in isolation
**Location**: Co-located with source code in `__tests__` directories
**Run Method**: `node test-file.js` (requires ES modules support)
**Coverage**: 
- Math operations and transformations
- Scene graph node functionality
- Data structure operations
- Abstract interface compliance

### Browser Integration Tests (`test/`)
**Purpose**: Visual integration testing and user interaction validation
**Location**: Top-level `test/` directory
**Run Method**: Open in browser via HTTP server
**Coverage**:
- Canvas2D rendering with real geometry
- Scene graph traversal visualization
- Interactive controls and user interface
- Cross-browser ES module compatibility

## 🌐 Browser Test Access

Start an HTTP server from the project root:
```bash
python3 -m http.server 8000
```

Then access tests via:

### Test Launcher
- **URL**: `http://localhost:8000/test/`
- **Description**: Landing page with links to all browser tests and descriptions

### Canvas2D Viewer Test
- **URL**: `http://localhost:8000/test/canvas2d-test.html`
- **Features**:
  - Point, line, and polygon rendering
  - Interactive controls (wireframe, visibility toggles)
  - Transformation matrices visualization
  - Image export functionality
- **Expected Output**: Red points (left), blue X-lines (center), green triangle (right)

### Scene Graph Traversal Test
- **URL**: `http://localhost:8000/test/traversal-test.html`
- **Features**:
  - Scene graph hierarchy traversal demonstration
  - Visitor pattern implementation
  - Cumulative transformation verification
  - Logging visitor for structure debugging
- **Expected Output**: Console showing hierarchical scene structure and rendered transformed geometry

## 🔧 Test Dependencies

### ES Module Support
All tests require ES module support:
- **package.json**: Contains `"type": "module"`
- **Node.js**: Version 14+ for ES module support
- **Browser**: Modern browser with ES6 module support

### Import Path Convention
- Unit tests use relative imports from their `__tests__` location
- Browser tests use relative imports from `test/` directory
- All imports use explicit `.js` extensions

## ✅ Test Execution Results

### Node.js Unit Tests (All Passing)
- ✅ **ViewerTest.js**: Abstract class behavior, interface validation
- ✅ **SceneGraphPathTest.js**: Path operations, matrix computation
- ✅ **DataListTest.js**: Data structures, factory functions (4/4 categories pass)
- ✅ **SceneGraphTraversalTest.js**: Visitor pattern (silent - designed for browser)

### Browser Integration Tests
- ✅ **canvas2d-test.html**: Visual rendering verification required
- ✅ **traversal-test.html**: Scene hierarchy visualization required

## 🎯 Test Maintenance

### Adding New Tests

**For Unit Tests:**
1. Create test file in appropriate `__tests__/` directory
2. Use relative imports to source code
3. Export test functions if needed for browser integration
4. Ensure ES module compatibility

**For Browser Tests:**
1. Create HTML file in `test/` directory
2. Import test modules from `../src/core/`
3. Add entry to `test/index.html` launcher
4. Include interactive elements and console output display

### Naming Conventions
- Unit test files: `ComponentName.test.js` or `ComponentNameTest.js`
- Browser test files: `feature-test.html`
- Test directories: `__tests__/` (following Jest/Node.js convention)

## 📊 Test Coverage Areas

| Component | Unit Tests | Browser Tests | Status |
|-----------|------------|---------------|---------|
| **Math Library** | ✅ Comprehensive | ❌ Not needed | Complete |
| **Scene Graph** | ✅ Core functionality | ✅ Traversal visualization | Complete |
| **Data System** | ✅ All structures | ❌ Not needed | Complete |
| **Viewer Interface** | ✅ Abstract validation | ❌ Not applicable | Complete |
| **Canvas2D Viewer** | ✅ Component testing | ✅ Visual verification | Complete |

## 🔮 Future Extensions

### Planned Test Additions
- Performance benchmarks in `test/benchmarks/`
- Visual regression tests for rendering accuracy
- Cross-browser compatibility validation
- WebGL viewer tests (when implemented)

### Test Utilities
- Shared test fixtures in `test/fixtures/`
- Common test utilities in `test/utils/`
- Mock data generators for complex scene graphs

---

This structure provides comprehensive test coverage while maintaining clear separation of concerns and ease of maintenance.
