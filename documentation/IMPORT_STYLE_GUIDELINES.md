# Import Style Guidelines

This document describes the import patterns and conventions used in the jSReality JavaScript project.

## 📦 **Two Import Patterns in the Codebase**

### **Pattern 1: Namespace Import (Math modules)**
```javascript
import * as Rn from '../math/Rn.js';
import * as P3 from '../math/P3.js';

// Usage:
Rn.setIdentityMatrix(matrix);
P3.normalize(point);
```

### **Pattern 2: Named Import (Scene modules)**
```javascript
import { SceneGraphComponent, SceneGraphPath, Transformation } from '../scene/index.js';
import { DataList, VariableDataList, createVertexList } from '../scene/data/index.js';

// Usage:
new SceneGraphComponent();
new DataList(data, shape);
```

## ⚖️ **Detailed Comparison**

| Aspect | Namespace Import (`import * as`) | Named Import (`import { }`) |
|--------|--------------------------------|---------------------------|
| **Clarity** | ✅ Clear module ownership | ❌ Less clear which module provides what |
| **Namespacing** | ✅ Avoids naming conflicts | ❌ Potential conflicts if same names exist |
| **Bundle Size** | ❌ May include unused exports | ✅ Tree-shaking friendly |
| **Typing** | ✅ Better IDE autocomplete | ✅ Good autocomplete for imported names |
| **Readability** | ✅ `Rn.multiply()` shows source | ❌ `multiply()` source unclear |
| **Import Length** | ✅ Short import statements | ❌ Can become very long |
| **Refactoring** | ❌ Harder to track usage | ✅ Easier to find/replace |

## 🎯 **Advantages & Disadvantages**

### **Namespace Import (`import * as Module`)**

#### ✅ **Advantages:**
1. **Clear provenance**: `Rn.setIdentityMatrix()` immediately shows it's from the Rn module
2. **Namespace protection**: No risk of naming conflicts with local variables
3. **Consistent API feel**: Mimics the original Java static class pattern
4. **Shorter imports**: Single line regardless of how many functions used
5. **Better for utility libraries**: Math libraries are typically used this way
6. **Module cohesion**: Emphasizes that functions belong together

#### ❌ **Disadvantages:**
1. **Bundle size**: May include unused exports (though modern bundlers handle this)
2. **Longer usage**: `Rn.timesMatrix()` vs `timesMatrix()`
3. **Less tree-shaking**: Harder for bundlers to eliminate unused code

### **Named Import (`import { function }`)**

#### ✅ **Advantages:**
1. **Tree-shaking friendly**: Only imports what's actually used
2. **Cleaner usage**: `new SceneGraphComponent()` vs `new Scene.SceneGraphComponent()`
3. **Standard modern JS**: More common in contemporary JavaScript
4. **Explicit dependencies**: Clear what functions/classes are used
5. **Better refactoring**: IDEs can track usage more easily

#### ❌ **Disadvantages:**
1. **Naming conflicts**: Risk of collisions with local variables
2. **Lost context**: `createVertexList()` - which module provides this?
3. **Long import lines**: Can become unwieldy with many imports
4. **Refactoring burden**: Need to update imports when usage changes

## 🤔 **Why the Difference Exists**

### **Math Modules (Namespace Pattern)**
```javascript
import * as Rn from '../math/Rn.js';
// Rn.setIdentityMatrix(), Rn.timesMatrix(), Rn.inverse()
```
**Rationale**: 
- Math modules are **utility libraries** with many related functions
- Functions are **inherently namespaced** conceptually (Rn = Real projective space)
- Mimics the **original Java pattern** (`Rn.setIdentityMatrix()`)
- **Mathematical context** is important for understanding

### **Scene Modules (Named Pattern)**
```javascript
import { SceneGraphComponent, Camera, PointSet } from '../scene/index.js';
// new SceneGraphComponent(), new Camera(), new PointSet()
```
**Rationale**:
- Scene classes are **distinct entities**, not utility functions
- **Constructor patterns** benefit from direct naming
- **Modern JavaScript conventions** for class imports
- **Tree-shaking optimization** for larger applications

## 💡 **Project Guidelines**

### **Use Namespace Import For:**
- ✅ **Utility/Math libraries** (Rn, P3, Matrix operations)
- ✅ **Function collections** with many related functions
- ✅ **When namespace provides semantic value**
- ✅ **Libraries with cohesive API** where functions work together

**Examples:**
```javascript
import * as Rn from '../math/Rn.js';
import * as P3 from '../math/P3.js';
import * as Matrix from '../math/Matrix.js';

// Clear mathematical context
Rn.setIdentityMatrix(matrix);
P3.dehomogenize(point);
Matrix.multiply(result, a, b);
```

### **Use Named Import For:**
- ✅ **Classes and constructors** (SceneGraphComponent, Camera)
- ✅ **Specific functionality** you want to use directly
- ✅ **When optimizing bundle size matters**
- ✅ **Factory functions** and standalone utilities

**Examples:**
```javascript
import { SceneGraphComponent, Camera, PointSet } from '../scene/index.js';
import { DataList, createVertexList, createPolygonList } from '../scene/data/index.js';

// Clear object instantiation
const component = new SceneGraphComponent();
const camera = new Camera();
const vertices = createVertexList(data);
```

## 📋 **Best Practices**

### **Mixed Usage Pattern (Recommended)**
```javascript
// Math utilities - namespace import
import * as Rn from '../math/Rn.js';
import * as Matrix from '../math/Matrix.js';

// Scene classes - named import  
import { SceneGraphComponent, Camera } from '../scene/index.js';
import { DataList, createVertexList } from '../scene/data/index.js';

// Usage shows clear intent:
function setupScene() {
    const matrix = new Array(16);
    Rn.setIdentityMatrix(matrix);           // Clear: Rn utility function
    const component = new SceneGraphComponent(); // Clear: Scene class
    const vertices = createVertexList(data);     // Clear: Factory function
}
```

### **Import Organization**
1. **Group by pattern**: Namespace imports first, then named imports
2. **Sort alphabetically** within each group
3. **Use consistent spacing** and formatting
4. **Prefer index.js** for multi-export modules

```javascript
// Namespace imports
import * as Matrix from '../math/Matrix.js';
import * as Rn from '../math/Rn.js';

// Named imports
import { Camera, SceneGraphComponent } from '../scene/index.js';
import { DataList, VariableDataList } from '../scene/data/index.js';
```

### **When to Break the Rules**

#### **Exception: Single Function Import**
```javascript
// When you only need one function, named import is acceptable
import { setIdentityMatrix } from '../math/Rn.js';

// But prefer namespace if you might use more functions later
import * as Rn from '../math/Rn.js';
```

#### **Exception: Avoiding Deep Nesting**
```javascript
// Acceptable for deeply nested utilities
import { createVertexList } from '../scene/data/factories/vertex.js';

// Better: Re-export through index for cleaner imports
import { createVertexList } from '../scene/data/index.js';
```

## 🔧 **Migration Guidelines**

When refactoring existing code:

### **Converting to Namespace Import**
```javascript
// Before
import { setIdentityMatrix, timesMatrix, inverse } from '../math/Rn.js';

// After
import * as Rn from '../math/Rn.js';
// Update usage: setIdentityMatrix() → Rn.setIdentityMatrix()
```

### **Converting to Named Import**
```javascript
// Before
import * as Scene from '../scene/index.js';
const component = new Scene.SceneGraphComponent();

// After
import { SceneGraphComponent } from '../scene/index.js';
const component = new SceneGraphComponent();
```

## 🏆 **Summary**

The mixed import approach in jSReality is **architecturally sound** because it:

- ✅ **Semantically appropriate** for each type of module
- ✅ **Follows JavaScript conventions** while respecting mathematical heritage
- ✅ **Maintainable** with clear usage patterns
- ✅ **Optimizable** by bundlers when needed
- ✅ **Consistent** within each domain (math vs scene)

The pattern difference reflects **thoughtful architectural decisions** rather than inconsistency. This approach should be maintained and followed for future development.

---

*This document should be consulted when adding new modules or refactoring existing imports to maintain consistency across the project.*
