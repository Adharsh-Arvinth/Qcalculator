/**
 * App Controller — Navigation & Mode Switching
 * Manages sidebar, mode registration, and mode lifecycle.
 */
(function () {
  'use strict';

  // ===== Module Registry =====
  // Each module registers via: window.CalcModules.name = { name, render, init, destroy }
  window.CalcModules = window.CalcModules || {};

  let currentMode = null;
  let currentModuleName = null;

  // ===== DOM =====
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const sidebarClose = document.getElementById('sidebarClose');
  const modeContainer = document.getElementById('modeContainer');
  const topBarTitle = document.getElementById('topBarTitle');

  // ===== Sidebar Toggle =====
  function openSidebar() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('visible');
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('visible');
  }

  hamburgerBtn.addEventListener('click', openSidebar);
  sidebarClose.addEventListener('click', closeSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSidebar();
  });

  // ===== Mode Switching =====
  function switchMode(modeName) {
    // Destroy current
    if (currentMode && typeof currentMode.destroy === 'function') {
      currentMode.destroy();
    }

    // Find module
    const mod = window.CalcModules[modeName];
    if (!mod) {
      modeContainer.innerHTML = '<div style="padding:40px;text-align:center;color:rgba(255,255,255,0.4);">Mode not found: ' + modeName + '</div>';
      return;
    }

    // Update sidebar active state
    document.querySelectorAll('.sidebar-item').forEach(function (el) {
      el.classList.toggle('active', el.dataset.mode === modeName);
    });

    // Update title
    topBarTitle.textContent = mod.name || modeName;

    // Render & Init
    modeContainer.innerHTML = '';
    mod.render(modeContainer);
    if (typeof mod.init === 'function') {
      mod.init();
    }

    currentMode = mod;
    currentModuleName = modeName;

    // Update hash
    window.location.hash = modeName;

    closeSidebar();
  }

  // Expose for modules
  window.switchCalcMode = switchMode;

  // ===== Sidebar Item Clicks =====
  document.querySelectorAll('.sidebar-item').forEach(function (item) {
    item.addEventListener('click', function () {
      switchMode(this.dataset.mode);
    });
  });

  // ===== Init — load from hash or default to scientific =====
  window.addEventListener('DOMContentLoaded', function () {
    // Small delay to ensure all modules are registered
    setTimeout(function () {
      var hash = window.location.hash.replace('#', '') || 'scientific';
      switchMode(hash);
    }, 50);
  });

  window.addEventListener('hashchange', function () {
    var hash = window.location.hash.replace('#', '');
    if (hash && hash !== currentModuleName) {
      switchMode(hash);
    }
  });

  // ===== Shared Utilities (available to all modules) =====
  window.CalcUtils = {
    formatNumber: function (num) {
      if (typeof num === 'string') return num;
      if (isNaN(num)) return 'Error';
      if (!isFinite(num)) return num > 0 ? '∞' : '-∞';
      var str = num.toPrecision(14);
      var parsed = parseFloat(str);
      if (Math.abs(parsed) >= 1e15 || (Math.abs(parsed) < 1e-10 && parsed !== 0)) {
        return parsed.toExponential(8);
      }
      return String(parsed);
    },

    escapeHTML: function (str) {
      var div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    },

    createRipple: function (btn, e) {
      var ripple = document.createElement('span');
      ripple.className = 'ripple';
      var rect = btn.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      btn.appendChild(ripple);
      setTimeout(function () { ripple.remove(); }, 500);
    }
  };

})();
