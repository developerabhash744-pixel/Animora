import {
  deleteSelectedObject,
  createNewMesh,
  onViewportClick,
  updateObjectFromForms,
  setShadingMode,
  toggleXray,
  toggleGrid,
  alignCamera,
  zoomIn,
  zoomOut,
  toggleCameraOrtho,
  togglePlay,
  updateFrame,
  addModifier,
  updateWorldSettings,
  selectedObject,
  startTransform,
  setTransformAxis,
  confirmTransform,
  cancelTransform
} from './main.js';

window.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Lucide Vector Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // 2. Splash Screen Interactions
  const splash = document.getElementById('splash-screen');
  
  // Close splash on template click
  document.querySelectorAll('.splash-btn-new').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      closeSplashScreen();
      const template = btn.getAttribute('data-template');
      console.log(`Starting new scene with template: ${template}`);
    });
  });

  // Close splash on clicking outside the box
  splash.addEventListener('click', (e) => {
    if (e.target === splash) {
      closeSplashScreen();
    }
  });

  function closeSplashScreen() {
    splash.style.opacity = '0';
    setTimeout(() => {
      splash.classList.add('hidden');
    }, 250);
  }

  // Splash menu clicks
  document.getElementById('splash-open-btn').addEventListener('click', (e) => {
    e.preventDefault();
    alert("Open file dialog (Simulator): Choose a local .blend or .animora project file.");
    closeSplashScreen();
  });
  document.getElementById('splash-manual-btn').addEventListener('click', (e) => {
    e.preventDefault();
    alert("Opening Blender Manual Reference: read details under /root/sd/shared/blender_manual_v510_en.html");
  });
  document.getElementById('splash-website-btn').addEventListener('click', (e) => {
    e.preventDefault();
    alert("Opening website: animora.org");
  });
  document.getElementById('splash-credits-btn').addEventListener('click', (e) => {
    e.preventDefault();
    alert("Animora 3D Workspace version 5.1.0-alpha built on WebGL & Three.js.");
  });

  // 3. Logo Dropdown Menu Toggle
  const logoBtn = document.getElementById('blender-logo-menu');
  const logoDropdown = document.getElementById('blender-logo-dropdown');

  logoBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    logoDropdown.classList.toggle('show');
  });

  // Close dropdown on click outside
  window.addEventListener('click', () => {
    logoDropdown.classList.remove('show');
  });

  document.getElementById('menu-splash').addEventListener('click', (e) => {
    e.preventDefault();
    splash.classList.remove('hidden');
    splash.style.opacity = '1';
  });

  document.getElementById('menu-about').addEventListener('click', (e) => {
    e.preventDefault();
    alert("Animora Web 3D Workspace\nA client-side Blender replica simulator powered by Three.js.");
  });

  document.getElementById('menu-sysinfo').addEventListener('click', (e) => {
    e.preventDefault();
    alert(`System Info:\nOS: Linux\nPlatform: Web App\nRenderer: WebGL 2.0 (Three.js v150)\nViewport: ${window.innerWidth}x${window.innerHeight}`);
  });

  // 4. File and Edit dropdown items
  document.getElementById('menu-new').addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm("Create a new scene? All unsaved changes will be lost.")) {
      window.location.reload();
    }
  });

  document.getElementById('menu-open').addEventListener('click', (e) => {
    e.preventDefault();
    alert("Open file dialog (Simulator): Choose a local .blend or .animora project file.");
  });

  document.getElementById('menu-save').addEventListener('click', (e) => {
    e.preventDefault();
    alert("Scene Saved Successfully! (Simulator: Saved to Animora Local Database)");
  });

  document.getElementById('menu-save-as').addEventListener('click', (e) => {
    e.preventDefault();
    alert("Save As... Save a copy of this scene.");
  });

  document.getElementById('menu-import').addEventListener('click', (e) => {
    e.preventDefault();
    alert("Import 3D Mesh: Select a file (.gltf, .glb, or .obj) to import.");
  });

  document.getElementById('menu-export').addEventListener('click', (e) => {
    e.preventDefault();
    alert("Export Scene: Exporting to AnimoraScene.gltf...");
  });

  document.getElementById('menu-undo').addEventListener('click', (e) => {
    e.preventDefault();
    console.log("Undo operation");
  });

  document.getElementById('menu-redo').addEventListener('click', (e) => {
    e.preventDefault();
    console.log("Redo operation");
  });

  // 5. Workspaces Tab Switcher
  document.querySelectorAll('.workspace-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.workspace-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const ws = btn.getAttribute('data-workspace');
      console.log(`Workspace switched to: ${ws}`);
      
      if (ws === 'shading') {
        setShadingMode('material');
      } else if (ws === 'rendering') {
        setShadingMode('render');
      } else {
        setShadingMode('solid');
      }
    });
  });

  // 6. Left Toolbar Selectors
  document.querySelectorAll('.left-toolbar .tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.id === 'tool-add-mesh') return;
      document.querySelectorAll('.left-toolbar .tool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const toolTitle = btn.title.split(' (')[0] || btn.id.replace('tool-', '');
      document.getElementById('tool-settings-name').innerText = toolTitle;
      document.getElementById('active-tool-name').innerText = toolTitle;
      document.getElementById('n-tool-desc').innerText = `${toolTitle}: View details in properties panel or drag in viewport.`;
    });
  });

  // Toolbar Add sub-menu triggers
  document.querySelectorAll('.submenu-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const type = item.getAttribute('data-add');
      createNewMesh(type);
    });
  });

  // Header Nav bar add triggers
  document.getElementById('nav-add-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    // Simulate Shift+A menu by toggling the sub-menu dropdown on tool shelf
    const addMeshBtn = document.getElementById('tool-add-mesh');
    const submenu = addMeshBtn.querySelector('.tool-submenu');
    submenu.style.display = submenu.style.display === 'block' ? 'none' : 'block';
  });

  window.addEventListener('click', () => {
    const addMeshBtn = document.getElementById('tool-add-mesh');
    if (addMeshBtn) {
      addMeshBtn.querySelector('.tool-submenu').style.display = 'none';
    }
  });

  // Mode Menu dropdown lists
  const modeBtn = document.getElementById('mode-dropdown-btn');
  const modeMenu = document.getElementById('mode-menu-list');

  modeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    modeMenu.classList.toggle('show');
  });

  window.addEventListener('click', () => {
    modeMenu.classList.remove('show');
  });

  document.querySelectorAll('.mode-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.mode-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      document.querySelector('.active-mode').innerText = item.innerText;
    });
  });

  // 7. Shading Controls Bindings
  document.getElementById('shade-wire').addEventListener('click', () => setShadingMode('wire'));
  document.getElementById('shade-solid').addEventListener('click', () => setShadingMode('solid'));
  document.getElementById('shade-material').addEventListener('click', () => setShadingMode('material'));
  document.getElementById('shade-render').addEventListener('click', () => setShadingMode('render'));

  document.getElementById('toggle-xray').addEventListener('click', toggleXray);
  document.getElementById('toggle-grid').addEventListener('click', toggleGrid);

  // 8. Navigation Widgets Controls
  document.getElementById('btn-zoom-in').addEventListener('click', zoomIn);
  document.getElementById('btn-zoom-out').addEventListener('click', zoomOut);
  document.getElementById('btn-camera').addEventListener('click', () => alignCamera('z'));
  document.getElementById('btn-ortho').addEventListener('click', toggleCameraOrtho);

  // Snapping views clicking axes nodes
  document.querySelector('.pos-x').addEventListener('click', (e) => { e.stopPropagation(); alignCamera('x'); });
  document.querySelector('.pos-y').addEventListener('click', (e) => { e.stopPropagation(); alignCamera('y'); });
  document.querySelector('.pos-z').addEventListener('click', (e) => { e.stopPropagation(); alignCamera('z'); });

  // 9. N-Panel Sidebar Tab Switching
  document.querySelectorAll('.n-sidebar-tabs .n-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.n-sidebar-tabs .n-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const tab = btn.getAttribute('data-n-tab');
      document.querySelectorAll('.n-sidebar-content .n-tab-panel').forEach(pane => pane.classList.add('hidden'));
      document.getElementById(`n-panel-${tab}`).classList.remove('hidden');
    });
  });

  // Synchronize inputs in properties
  document.querySelectorAll('.p-sync').forEach(el => {
    const eventName = el.type === 'checkbox' || el.type === 'range' || el.type === 'color' ? 'input' : 'change';
    el.addEventListener(eventName, () => updateObjectFromForms('properties'));
  });

  // Synchronize inputs in N-Panel
  document.querySelectorAll('.n-sync').forEach(el => {
    el.addEventListener('change', () => updateObjectFromForms('npanel'));
  });

  // Synchronize input fields renaming
  document.getElementById('obj-name-input').addEventListener('change', () => updateObjectFromForms('properties'));

  // Object actions
  document.getElementById('obj-delete').addEventListener('click', deleteSelectedObject);

  document.getElementById('add-modifier-select').addEventListener('change', (e) => {
    const type = e.target.value;
    if (type) {
      addModifier(type);
      e.target.value = "";
    }
  });

  document.getElementById('world-bg-color').addEventListener('input', updateWorldSettings);
  document.getElementById('world-ambient-intensity').addEventListener('input', updateWorldSettings);

  // 10. F9 Collapsible panel
  document.getElementById('f9-toggle-btn').addEventListener('click', () => {
    const content = document.getElementById('f9-content-fields');
    const icon = document.getElementById('f9-toggle-btn');
    content.classList.toggle('collapsed');
    icon.classList.toggle('rotated');
  });

  // 11. PIE Menu Slice clicks
  document.querySelectorAll('.pie-slice').forEach(slice => {
    slice.addEventListener('click', () => {
      const shade = slice.getAttribute('data-shade');
      setShadingMode(shade);
      document.getElementById('pie-menu').classList.add('hidden');
    });
  });

  // Close pie menu on clicking outside center ring
  document.getElementById('pie-menu').addEventListener('mousedown', (e) => {
    if (e.target === document.getElementById('pie-menu')) {
      document.getElementById('pie-menu').classList.add('hidden');
    }
  });

  // 12. Bottom Timeline controls
  document.getElementById('play-toggle').addEventListener('click', togglePlay);
  document.getElementById('play-start').addEventListener('click', () => updateFrame(1));
  document.getElementById('play-end').addEventListener('click', () => updateFrame(250));

  document.getElementById('play-prev').addEventListener('click', () => {
    const f = parseInt(document.getElementById('frame-current').value) || 1;
    updateFrame(f - 1);
  });

  document.getElementById('play-next').addEventListener('click', () => {
    const f = parseInt(document.getElementById('frame-current').value) || 1;
    updateFrame(f + 1);
  });

  document.getElementById('frame-current').addEventListener('change', (e) => {
    updateFrame(parseInt(e.target.value) || 1);
  });

  // Ruler tick markers
  renderTimelineRuler();

  // Timeline scrubber clicking
  let isDraggingScrubber = false;
  const ruler = document.getElementById('timeline-ruler');
  
  ruler.addEventListener('mousedown', (e) => {
    isDraggingScrubber = true;
    scrub(e);
  });

  window.addEventListener('mousemove', (e) => {
    if (isDraggingScrubber) scrub(e);
  });

  window.addEventListener('mouseup', () => {
    isDraggingScrubber = false;
  });

  function scrub(e) {
    const container = document.getElementById('timeline-slider-container');
    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = x / rect.width;
    const start = parseInt(document.getElementById('frame-start').value) || 1;
    const end = parseInt(document.getElementById('frame-end').value) || 250;
    const f = Math.round(start + ratio * (end - start));
    updateFrame(f);
  }

  // 13. Preferences modal
  const modalPrefs = document.getElementById('modal-prefs');
  
  const openPrefs = (e) => {
    e.preventDefault();
    modalPrefs.classList.remove('hidden');
    if (window.innerWidth <= 768) {
      document.querySelectorAll('.prefs-sidebar .pref-tab').forEach(b => b.classList.remove('active'));
      const vpTab = document.querySelector('.prefs-sidebar .pref-tab[data-pref-tab="viewport"]');
      if (vpTab) vpTab.classList.add('active');
      document.querySelectorAll('.prefs-content .pref-panel').forEach(p => p.classList.add('hidden'));
      const vpPanel = document.getElementById('pref-viewport');
      if (vpPanel) vpPanel.classList.remove('hidden');
    }
  };

  document.getElementById('menu-preferences').addEventListener('click', openPrefs);
  const mobPrefsBtn = document.getElementById('menu-mobile-prefs');
  if (mobPrefsBtn) mobPrefsBtn.addEventListener('click', openPrefs);

  document.getElementById('close-prefs').addEventListener('click', () => {
    modalPrefs.classList.add('hidden');
  });

  modalPrefs.addEventListener('click', (e) => {
    if (e.target === modalPrefs) {
      modalPrefs.classList.add('hidden');
    }
  });

  // Switch tabs in preferences
  document.querySelectorAll('.prefs-sidebar .pref-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.prefs-sidebar .pref-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.getAttribute('data-pref-tab');
      document.querySelectorAll('.prefs-content .pref-panel').forEach(p => p.classList.add('hidden'));
      document.getElementById(`pref-${tab}`).classList.remove('hidden');
    });
  });

  // Scale slider
  document.getElementById('ui-scale-slider').addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    document.getElementById('ui-scale-val').innerText = `${val.toFixed(2)}x`;
    // adjust root parameters
    document.documentElement.style.setProperty('--font-size-ui', `${11 * val}px`);
    document.documentElement.style.setProperty('--font-size-title', `${12 * val}px`);
    document.documentElement.style.setProperty('--font-size-header', `${13 * val}px`);
  });

  // Theme presets click
  document.querySelectorAll('.theme-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.theme-preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const theme = btn.getAttribute('data-theme');
      
      document.body.classList.remove('theme-animora-neon', 'theme-light-flat');
      if (theme === 'animora-neon') {
        document.body.classList.add('theme-animora-neon');
      } else if (theme === 'light-flat') {
        document.body.classList.add('theme-light-flat');
      }
      updateWorldSettings();
    });
  });

  // 14. Mobile Virtual Shortcuts Bar Actions (Emulates keyboard inputs on Touch Screens)
  document.getElementById('m-btn-add').addEventListener('click', (e) => {
    e.stopPropagation();
    const addMeshBtn = document.getElementById('tool-add-mesh');
    const submenu = addMeshBtn.querySelector('.tool-submenu');
    submenu.style.display = submenu.style.display === 'block' ? 'none' : 'block';
  });

  document.getElementById('m-btn-grab').addEventListener('click', () => {
    startTransform('translate');
  });

  document.getElementById('m-btn-rotate').addEventListener('click', () => {
    startTransform('rotate');
  });

  document.getElementById('m-btn-scale').addEventListener('click', () => {
    startTransform('scale');
  });

  document.getElementById('m-btn-axis-x').addEventListener('click', () => setTransformAxis('x'));
  document.getElementById('m-btn-axis-y').addEventListener('click', () => setTransformAxis('y'));
  document.getElementById('m-btn-axis-z').addEventListener('click', () => setTransformAxis('z'));

  document.getElementById('m-btn-pie').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('pie-menu').classList.toggle('hidden');
  });

  document.getElementById('m-btn-sidebar').addEventListener('click', () => {
    document.getElementById('n-sidebar').classList.toggle('hidden');
  });

  document.getElementById('m-btn-confirm').addEventListener('click', () => confirmTransform());
  document.getElementById('m-btn-cancel').addEventListener('click', () => cancelTransform());

  // Global Callback to synchronize mobile shortcuts button UI states when transforms are triggered
  window.onTransformStateChange = (mode, axis) => {
    // Reset active highlights
    document.getElementById('m-btn-grab').classList.remove('active');
    document.getElementById('m-btn-rotate').classList.remove('active');
    document.getElementById('m-btn-scale').classList.remove('active');
    document.getElementById('m-btn-axis-x').classList.remove('active');
    document.getElementById('m-btn-axis-y').classList.remove('active');
    document.getElementById('m-btn-axis-z').classList.remove('active');

    if (mode) {
      // Show confirm / cancel actions
      document.getElementById('m-divider-transform').classList.remove('hidden');
      document.getElementById('m-btn-confirm').classList.remove('hidden');
      document.getElementById('m-btn-cancel').classList.remove('hidden');

      // Highlight active mode
      if (mode === 'translate') document.getElementById('m-btn-grab').classList.add('active');
      else if (mode === 'rotate') document.getElementById('m-btn-rotate').classList.add('active');
      else if (mode === 'scale') document.getElementById('m-btn-scale').classList.add('active');

      // Highlight active axis lock
      if (axis) {
        document.getElementById(`m-btn-axis-${axis}`).classList.add('active');
      }
    } else {
      // Hide confirm / cancel actions
      document.getElementById('m-divider-transform').classList.add('hidden');
      document.getElementById('m-btn-confirm').classList.add('hidden');
      document.getElementById('m-btn-cancel').classList.add('hidden');
    }
  };

  // 15. Mobile Overlay Drawer Toggles
  const leftShelf = document.getElementById('left-toolbar');
  const rightSidebar = document.querySelector('.right-sidebar');
  const btnToggleLeft = document.getElementById('btn-toggle-left-shelf');
  const btnToggleRight = document.getElementById('btn-toggle-right-shelf');

  btnToggleLeft.addEventListener('click', (e) => {
    e.stopPropagation();
    leftShelf.classList.toggle('mobile-open');
    btnToggleLeft.classList.toggle('active');
    
    // Close other drawer
    rightSidebar.classList.remove('mobile-open');
    btnToggleRight.classList.remove('active');
  });

  btnToggleRight.addEventListener('click', (e) => {
    e.stopPropagation();
    rightSidebar.classList.toggle('mobile-open');
    btnToggleRight.classList.toggle('active');
    
    // Close other drawer
    leftShelf.classList.remove('mobile-open');
    btnToggleLeft.classList.remove('active');
  });

  // Tap viewport canvas to close open overlay drawers on mobile
  const viewCanvas = document.getElementById('three-canvas');
  if (viewCanvas) {
    viewCanvas.addEventListener('click', () => {
      leftShelf.classList.remove('mobile-open');
      rightSidebar.classList.remove('mobile-open');
      btnToggleLeft.classList.remove('active');
      btnToggleRight.classList.remove('active');
    });
  }

  // Helper to apply font size
  function applyFontSize(size) {
    const fs = parseFloat(size);
    document.documentElement.style.setProperty('--font-size-ui', `${fs}px`);
    document.documentElement.style.setProperty('--font-size-title', `${fs + 1}px`);
    document.documentElement.style.setProperty('--font-size-header', `${fs + 2}px`);
  }

  // Helper to apply viewport scale
  function applyViewportScale(scale) {
    const scaleFactor = parseFloat(scale);
    const containerEl = document.querySelector('.app-container');
    if (containerEl) {
      if (scaleFactor === 1.0) {
        containerEl.style.transform = '';
        containerEl.style.transformOrigin = '';
        containerEl.style.width = '';
        containerEl.style.height = '';
      } else {
        containerEl.style.transform = `scale(${scaleFactor})`;
        containerEl.style.transformOrigin = 'top left';
        containerEl.style.width = `${100 / scaleFactor}%`;
        containerEl.style.height = `${100 / scaleFactor}%`;
      }
      // Notify Three.js that the viewport canvas has resized
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 50);
    }
  }

  // 16. Load Settings from LocalStorage on Startup
  const savedFontSize = localStorage.getItem('animora_font_size') || '5'; // Default to 5px as requested
  const savedVpScale = localStorage.getItem('animora_viewport_scale') || '1.0';
  
  applyFontSize(savedFontSize);
  applyViewportScale(savedVpScale);

  // Sync settings values back to inputs
  const selectFontSize = document.getElementById('setting-font-size');
  const selectVpScale = document.getElementById('setting-viewport-scale');
  const customVpScaleRow = document.getElementById('setting-vp-custom-row');
  const customVpScaleInput = document.getElementById('setting-vp-custom-scale');

  if (selectFontSize) selectFontSize.value = savedFontSize;
  if (selectVpScale) {
    const standardValues = ['0.6', '0.7', '0.8', '0.9', '1.0', '1.1', '1.2'];
    if (standardValues.includes(savedVpScale)) {
      selectVpScale.value = savedVpScale;
    } else {
      selectVpScale.value = 'custom';
      if (customVpScaleRow) customVpScaleRow.classList.remove('hidden');
      if (customVpScaleInput) customVpScaleInput.value = savedVpScale;
    }
  }

  // Viewport Scale dropdown change listener
  if (selectVpScale) {
    selectVpScale.addEventListener('change', (e) => {
      if (e.target.value === 'custom') {
        customVpScaleRow.classList.remove('hidden');
      } else {
        customVpScaleRow.classList.add('hidden');
        customVpScaleInput.value = e.target.value;
      }
    });
  }

  // Apply button click
  const btnApply = document.getElementById('setting-apply-btn');
  if (btnApply) {
    btnApply.addEventListener('click', () => {
      const selectedFontSize = selectFontSize.value;
      let selectedVpScale = selectVpScale.value;
      if (selectedVpScale === 'custom') {
        selectedVpScale = parseFloat(customVpScaleInput.value) || 1.0;
      }

      // Save to localStorage
      localStorage.setItem('animora_font_size', selectedFontSize);
      localStorage.setItem('animora_viewport_scale', selectedVpScale);

      // Apply
      applyFontSize(selectedFontSize);
      applyViewportScale(selectedVpScale);

      // Close modal
      const modalPrefs = document.getElementById('modal-prefs');
      if (modalPrefs) modalPrefs.classList.add('hidden');
    });
  }

  // Reset button click
  const btnReset = document.getElementById('setting-reset-btn');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (selectFontSize) selectFontSize.value = '5'; // Reset default to 5px
      if (selectVpScale) {
        selectVpScale.value = '1.0';
        if (customVpScaleRow) customVpScaleRow.classList.add('hidden');
        if (customVpScaleInput) customVpScaleInput.value = '1.0';
      }

      // Save defaults
      localStorage.setItem('animora_font_size', '5');
      localStorage.setItem('animora_viewport_scale', '1.0');

      // Apply defaults
      applyFontSize('5');
      applyViewportScale('1.0');

      // Close modal
      const modalPrefs = document.getElementById('modal-prefs');
      if (modalPrefs) modalPrefs.classList.add('hidden');
    });
  }
});

function renderTimelineRuler() {
  const ruler = document.getElementById('timeline-ruler');
  ruler.innerHTML = "";
  
  const start = 1;
  const end = 250;
  const container = document.getElementById('timeline-slider-container');
  const width = container.clientWidth || window.innerWidth - 320;

  for (let f = start; f <= end; f++) {
    if (f === start || f === end || f % 10 === 0) {
      const tick = document.createElement('div');
      const ratio = (f - start) / (end - start);
      const pos = ratio * width;
      
      tick.className = "timeline-tick";
      if (f % 50 === 0 || f === start || f === end) {
        tick.className += " major";
        const label = document.createElement('div');
        label.className = "timeline-tick-label";
        label.innerText = f;
        label.style.left = `${pos}px`;
        ruler.appendChild(label);
      }
      
      tick.style.left = `${pos}px`;
      ruler.appendChild(tick);
    }
  }
}
