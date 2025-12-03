/**
 * CollapsiblePanel - A collapsible panel with title bar and minimize/expand functionality.
 * 
 * Similar to jReality's ShrinkPanel, this provides a title bar with minimize/expand
 * button and a content area that can be shown or hidden.
 */

/**
 * Creates a collapsible panel component.
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.title - Panel title
 * @param {HTMLElement} [options.content] - Content element (optional, can be set later)
 * @param {boolean} [options.collapsed=false] - Initial collapsed state
 * @param {string} [options.icon] - Optional icon/emoji for the title
 * @returns {HTMLElement} The panel container element
 */
export function createCollapsiblePanel(options) {
  const { title, content = null, collapsed = false, icon = null } = options;

  const panel = document.createElement('div');
  panel.className = 'jsr-collapsible-panel';
  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';
  panel.style.width = '100%';
  panel.style.borderBottom = '1px solid #3e3e3e';
  panel.style.backgroundColor = '#1e1e1e';

  // Title bar
  const titleBar = document.createElement('div');
  titleBar.className = 'jsr-collapsible-panel-title';
  titleBar.style.display = 'flex';
  titleBar.style.alignItems = 'center';
  titleBar.style.padding = '8px 12px';
  titleBar.style.cursor = 'pointer';
  titleBar.style.userSelect = 'none';
  titleBar.style.backgroundColor = '#252526';
  titleBar.style.borderBottom = '1px solid #3e3e3e';
  titleBar.style.minHeight = '32px';
  titleBar.style.boxSizing = 'border-box';

  // Icon (if provided)
  if (icon) {
    const iconSpan = document.createElement('span');
    iconSpan.textContent = icon;
    iconSpan.style.marginRight = '8px';
    iconSpan.style.fontSize = '14px';
    titleBar.appendChild(iconSpan);
  }

  // Title text
  const titleText = document.createElement('span');
  titleText.textContent = title;
  titleText.style.flex = '1 1 auto';
  titleText.style.fontSize = '13px';
  titleText.style.fontWeight = '500';
  titleText.style.color = '#cccccc';
  titleBar.appendChild(titleText);

  // Minimize/expand button
  const toggleButton = document.createElement('button');
  toggleButton.className = 'jsr-collapsible-panel-toggle';
  toggleButton.textContent = collapsed ? '▶' : '▼';
  toggleButton.style.background = 'none';
  toggleButton.style.border = 'none';
  toggleButton.style.color = '#cccccc';
  toggleButton.style.cursor = 'pointer';
  toggleButton.style.padding = '4px 8px';
  toggleButton.style.fontSize = '10px';
  toggleButton.style.marginLeft = '8px';
  toggleButton.style.display = 'flex';
  toggleButton.style.alignItems = 'center';
  toggleButton.style.justifyContent = 'center';
  toggleButton.style.width = '20px';
  toggleButton.style.height = '20px';
  toggleButton.style.borderRadius = '2px';
  
  // Hover effect
  toggleButton.addEventListener('mouseenter', () => {
    toggleButton.style.backgroundColor = '#3e3e3e';
  });
  toggleButton.addEventListener('mouseleave', () => {
    toggleButton.style.backgroundColor = 'transparent';
  });

  titleBar.appendChild(toggleButton);

  // Content container
  const contentContainer = document.createElement('div');
  contentContainer.className = 'jsr-collapsible-panel-content';
  contentContainer.style.display = collapsed ? 'none' : 'flex';
  contentContainer.style.flexDirection = 'column';
  contentContainer.style.flex = '1 1 auto';
  contentContainer.style.minHeight = '0';
  contentContainer.style.overflow = 'auto';
  contentContainer.style.padding = '8px';

  if (content) {
    contentContainer.appendChild(content);
  }

  // Toggle functionality
  let isCollapsed = collapsed;
  const toggle = () => {
    isCollapsed = !isCollapsed;
    contentContainer.style.display = isCollapsed ? 'none' : 'flex';
    toggleButton.textContent = isCollapsed ? '▶' : '▼';
    panel.dispatchEvent(new CustomEvent('toggle', { 
      detail: { collapsed: isCollapsed } 
    }));
  };

  titleBar.addEventListener('click', (e) => {
    // Don't toggle if clicking the button itself (it has its own handler)
    if (e.target !== toggleButton && !toggleButton.contains(e.target)) {
      toggle();
    }
  });

  toggleButton.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });

  // Assemble panel
  panel.appendChild(titleBar);
  panel.appendChild(contentContainer);

  // Public API
  panel.setContent = (element) => {
    contentContainer.innerHTML = '';
    if (element) {
      contentContainer.appendChild(element);
    }
  };

  panel.getContent = () => contentContainer;

  panel.setCollapsed = (collapsed) => {
    if (isCollapsed !== collapsed) {
      toggle();
    }
  };

  panel.isCollapsed = () => isCollapsed;

  return panel;
}

