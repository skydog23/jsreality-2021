# Menu-Based Viewer Switching Implementation

## Overview

Implemented menu-based viewer switching with radio buttons in JSRViewer, eliminating the need for manual viewer management in HTML files. The feature provides a clean, reusable way to switch between Canvas2D, WebGL2D, and SVG renderers through a standard menu interface.

## Changes Made

### 1. Menubar.js - Added Radio Button Support

**Location:** `/src/app/ui/Menubar.js`

**New Features:**
- Radio button menu items with mutual exclusivity
- Radio button groups for organizing related options
- Programmatic radio selection updates
- Proper event handling and state management

**Added Fields:**
```javascript
#radioGroups: Map<string, Set<HTMLElement>>  // Tracks radio button groups
```

**Updated Methods:**

**`addMenuItem(menuName, item, priority)`** - Extended to support:
- `item.type = 'radio'` - Creates a radio button menu item
- `item.radioGroup` - Specifies the radio button group name
- `item.checked` - Initial checked state

**`#createMenuItemElement(item, menuName)`** - Enhanced to:
- Create radio button UI with `<input type="radio">`
- Handle mutual exclusivity within groups
- Store radio input references for programmatic updates
- Manage group state in `#radioGroups` map

**New Method:**
```javascript
updateRadioSelection(menuName, radioGroup, selectedIndex)
```
- Updates radio button selection programmatically
- Used when viewer is switched via code (not menu click)
- Ensures menu always reflects current state

### 2. JSRViewer.js - Integrated Viewer Selection Menu

**Location:** `/src/app/JSRViewer.js`

**`enableMenubar()` Enhancement:**
- Automatically adds viewer selection radio buttons to "Viewer" menu
- Only shown when multiple viewers are available (numViewers > 1)
- Radio buttons use the viewer names from ViewerSwitch
- Initially checks the currently active viewer

**Menu Structure:**
```
Viewer
├── Background (submenu)
├── ───────────────────
├── ◉ Canvas2D         (radio, checked)
├── ○ WebGL2D          (radio)
├── ○ SVG              (radio)
├── ───────────────────
└── Reset Camera
```

**`selectViewer()` Enhancement:**
- Tracks old and new viewer indices
- Updates menu radio buttons when viewer is switched programmatically
- Emits viewerChanged event with oldIndex and newIndex
- Ensures bidirectional synchronization (menu ↔ code)

### 3. Test File - JSRViewer Menu Test

**Location:** `/test/jsrviewer-menu-test.html`

**Features:**
- Creates JSRViewer with three viewers (Canvas2D, WebGL2D, SVG)
- Displays a grid and circle test scene
- Menu automatically populated with viewer options
- Status bar shows current viewer and switch events
- Demonstrates complete integration

## How It Works

### Menu Creation Flow

1. **JSRViewer constructor** creates ViewerSwitch with multiple viewers
2. **enableMenubar()** is called (automatically or manually)
3. **defaultMenuProvider** function runs:
   - Checks if ViewerSwitch has multiple viewers
   - Gets viewer names from ViewerSwitch
   - Creates radio button for each viewer
   - Sets initial checked state based on current viewer
4. **Menubar** creates radio UI elements and manages groups

### Switching Flow (Menu Click)

1. User clicks radio button menu item
2. Radio button event handler:
   - Unchecks all other radios in same group
   - Checks clicked radio
   - Closes dropdown menu
   - Calls `jsrViewer.selectViewer(index)`
3. JSRViewer.selectViewer():
   - Delegates to ViewerSwitch.selectViewer()
   - ViewerSwitch switches viewer and calls render()
   - Updates menu radio buttons (already in correct state)
   - Emits viewerChanged event

### Switching Flow (Programmatic)

1. Code calls `jsrViewer.selectViewer(index)`
2. JSRViewer.selectViewer():
   - Delegates to ViewerSwitch.selectViewer()
   - ViewerSwitch switches viewer and calls render()
   - **Calls menubar.updateRadioSelection()** to sync menu
   - Emits viewerChanged event

## Usage Examples

### Basic Usage (Automatic Menu)

```javascript
import { JSRViewer } from '../src/app/JSRViewer.js';
import { Canvas2DViewer } from '../src/core/viewers/Canvas2DViewer.js';
import { WebGL2DViewer } from '../src/core/viewers/WebGL2DViewer.js';
import { SVGViewer } from '../src/core/viewers/SVGViewer.js';

// Create viewers
const viewers = [
    new Canvas2DViewer(canvas1),
    new WebGL2DViewer(canvas2),
    new SVGViewer(container)
];

// Create JSRViewer - menu will automatically include viewer selection
const jsrViewer = new JSRViewer({
    container: document.getElementById('app'),
    viewers: viewers,
    viewerNames: ['Canvas2D', 'WebGL2D', 'SVG']
});

// Viewer menu is automatically populated with radio buttons!
```

### Programmatic Viewer Switching

```javascript
// Switch viewer by index
jsrViewer.selectViewer(0);  // Canvas2D
jsrViewer.selectViewer(1);  // WebGL2D
jsrViewer.selectViewer(2);  // SVG

// Switch viewer by name
jsrViewer.selectViewer('WebGL2D');

// Menu radio buttons automatically update!
```

### Listening for Viewer Changes

```javascript
jsrViewer.on('viewerChanged', (data) => {
    console.log(`Switched from viewer ${data.oldIndex} to ${data.newIndex}`);
    
    const currentViewer = jsrViewer.getViewer().getCurrentViewer();
    console.log(`Current viewer: ${currentViewer.constructor.name}`);
});
```

### Single Viewer (No Menu)

```javascript
// With only one viewer, no radio buttons are added
const jsrViewer = new JSRViewer({
    container: document.getElementById('app'),
    viewers: [new Canvas2DViewer(canvas)],
    viewerNames: ['Canvas2D']
});

// Viewer menu only shows Background and Reset Camera
```

### Custom Viewer Names

```javascript
const jsrViewer = new JSRViewer({
    container: document.getElementById('app'),
    viewers: [canvas2d, webgl2d, svg],
    viewerNames: [
        'Canvas Renderer',
        'WebGL Hardware Accelerated',
        'Vector Graphics (SVG)'
    ]
});

// Menu shows custom names!
```

## Menu Item Definition

Radio button menu items accept these properties:

```javascript
{
  label: 'Canvas2D',           // Display text
  type: 'radio',               // Item type
  radioGroup: 'renderer',      // Group name (for mutual exclusivity)
  checked: true,               // Initial checked state
  action: () => { /* ... */ }  // Callback when clicked
}
```

## API Reference

### Menubar Methods

#### `addMenuItem(menuName, item, priority)`
Adds a menu item (including radio buttons).

**Parameters:**
- `menuName: string` - Menu to add item to
- `item: Object` - Item definition
  - `label: string` - Display text
  - `type?: string` - Item type ('radio' for radio buttons)
  - `radioGroup?: string` - Radio group name (for type='radio')
  - `checked?: boolean` - Initial checked state (for type='radio')
  - `action?: Function` - Click callback
  - `submenu?: Object[]` - Submenu items
- `priority: number` - Display order (lower = earlier)

#### `updateRadioSelection(menuName, radioGroup, selectedIndex)`
Programmatically updates radio button selection.

**Parameters:**
- `menuName: string` - Menu containing the radio group
- `radioGroup: string` - Radio group name
- `selectedIndex: number` - Index of item to select (0-based within group)

### JSRViewer Methods

#### `selectViewer(viewer)`
Switches to a different viewer backend.

**Parameters:**
- `viewer: number | string` - Viewer index or name

**Behavior:**
- Switches viewer via ViewerSwitch
- Updates menu radio buttons automatically
- Emits 'viewerChanged' event

#### `on(eventName, callback)`
Registers event listener.

**Events:**
- `'viewerChanged'` - Emitted when viewer switches
  - `data.oldIndex: number` - Previous viewer index
  - `data.newIndex: number` - New viewer index

## Benefits

1. **No Manual Code**: Viewer switching handled entirely by JSRViewer and Menubar
2. **Automatic Updates**: Menu always reflects current viewer state
3. **Bidirectional Sync**: Works whether switched via menu or code
4. **Reusable**: Any app using JSRViewer gets viewer switching for free
5. **Clean Integration**: No HTML hardcoding required
6. **Consistent UX**: Standard menu interface across all applications

## Testing

### Test File
Open `test/jsrviewer-menu-test.html` in a browser.

### What to Verify
- ✓ Menu shows three radio buttons (Canvas2D, WebGL2D, SVG)
- ✓ One radio is checked initially (Canvas2D)
- ✓ Clicking a radio switches the viewer
- ✓ Scene renders correctly in all three viewers
- ✓ Only one radio can be checked at a time
- ✓ Status bar updates when viewer changes
- ✓ Programmatic switching via console works
- ✓ Menu updates when switching programmatically

### Console Testing
```javascript
// In browser console with test page open:
jsrViewer.selectViewer(1);  // Switch to WebGL2D - menu should update
jsrViewer.selectViewer(2);  // Switch to SVG - menu should update
jsrViewer.selectViewer(0);  // Switch back to Canvas2D - menu should update
```

## Migration Guide

### Before (Manual HTML Implementation)

```html
<div class="menu">
  <input type="radio" name="viewer" value="0" checked> Canvas2D
  <input type="radio" name="viewer" value="1"> WebGL2D
  <input type="radio" name="viewer" value="2"> SVG
</div>

<script>
  // Manual viewer management
  const viewers = [...];
  let currentViewer = viewers[0];
  
  function switchViewer(index) {
    // Hide all
    canvas1.style.display = 'none';
    canvas2.style.display = 'none';
    svgContainer.style.display = 'none';
    
    // Show selected
    currentViewer = viewers[index];
    // ... more manual code
    currentViewer.render();
  }
  
  // Manual radio button listeners
  document.querySelectorAll('input[name="viewer"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      switchViewer(parseInt(e.target.value));
    });
  });
</script>
```

### After (JSRViewer Integration)

```html
<div id="app"></div>

<script type="module">
  import { JSRViewer } from '../src/app/JSRViewer.js';
  import { Canvas2DViewer } from '../src/core/viewers/Canvas2DViewer.js';
  import { WebGL2DViewer } from '../src/core/viewers/WebGL2DViewer.js';
  import { SVGViewer } from '../src/core/viewers/SVGViewer.js';
  
  const jsrViewer = new JSRViewer({
    container: document.getElementById('app'),
    viewers: [
      new Canvas2DViewer(canvas1),
      new WebGL2DViewer(canvas2),
      new SVGViewer(container)
    ],
    viewerNames: ['Canvas2D', 'WebGL2D', 'SVG']
  });
  
  // That's it! Menu and switching fully automatic.
</script>
```

## Future Enhancements

Possible improvements:

1. **Keyboard shortcuts** - Ctrl+1/2/3 to switch viewers
2. **Viewer icons** - Add icons to radio button labels
3. **Viewer tooltips** - Show detailed info on hover
4. **Performance metrics** - Display FPS for each viewer
5. **Viewer comparison** - Side-by-side view mode
6. **Export per-viewer** - "Export with current viewer" option
7. **Viewer preferences** - Remember last selected viewer

