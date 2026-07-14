/**
 * Programmer Calculator Module
 * Binary, Octal, Decimal, Hex conversions + bitwise operations + bit toggle display.
 */
(function () {
  'use strict';
  window.CalcModules = window.CalcModules || {};

  var currentBase = 'DEC';
  var currentValue = 0;
  var wordSize = 32; // 8, 16, 32, 64
  var expression = '';
  var keyHandler = null;

  function clampToWord(val) {
    val = Math.trunc(val);
    if (wordSize === 64) {
      // JS safe integer limit
      val = Math.max(-9007199254740991, Math.min(9007199254740991, val));
    } else {
      var max = Math.pow(2, wordSize - 1) - 1;
      var min = -Math.pow(2, wordSize - 1);
      if (val > max) val = max;
      if (val < min) val = min;
    }
    return val;
  }

  function toUnsigned(val) {
    val = Math.trunc(val);
    if (val < 0) val = val + Math.pow(2, wordSize);
    return val;
  }

  function formatBin(val) {
    var u = toUnsigned(val);
    var s = u.toString(2);
    while (s.length < wordSize) s = '0' + s;
    // Group by 4
    var groups = [];
    for (var i = 0; i < s.length; i += 4) groups.push(s.substring(i, i + 4));
    return groups.join(' ');
  }

  function formatOct(val) { return toUnsigned(val).toString(8).toUpperCase(); }
  function formatDec(val) { return String(Math.trunc(val)); }
  function formatHex(val) { return toUnsigned(val).toString(16).toUpperCase(); }

  function parseInput(str, base) {
    str = str.replace(/\s/g, '');
    if (str === '' || str === '-') return 0;
    switch (base) {
      case 'BIN': var v = parseInt(str, 2); return isNaN(v) ? 0 : v;
      case 'OCT': var v2 = parseInt(str, 8); return isNaN(v2) ? 0 : v2;
      case 'DEC': var v3 = parseInt(str, 10); return isNaN(v3) ? 0 : v3;
      case 'HEX': var v4 = parseInt(str, 16); return isNaN(v4) ? 0 : v4;
      default: return 0;
    }
  }

  function updateAllDisplays() {
    var v = clampToWord(currentValue);
    currentValue = v;
    var hexD = document.getElementById('progHexDisplay');
    var decD = document.getElementById('progDecDisplay');
    var octD = document.getElementById('progOctDisplay');
    var binD = document.getElementById('progBinDisplay');
    var mainD = document.getElementById('progMainDisplay');
    if (hexD) hexD.textContent = formatHex(v);
    if (decD) decD.textContent = formatDec(v);
    if (octD) octD.textContent = formatOct(v);
    if (binD) binD.textContent = formatBin(v);
    if (mainD) {
      switch (currentBase) {
        case 'HEX': mainD.textContent = formatHex(v); break;
        case 'DEC': mainD.textContent = formatDec(v); break;
        case 'OCT': mainD.textContent = formatOct(v); break;
        case 'BIN': mainD.textContent = formatBin(v); break;
      }
    }
    // Update bit toggles
    updateBitToggles();
    // Highlight active base row
    ['HEX', 'DEC', 'OCT', 'BIN'].forEach(function (b) {
      var row = document.getElementById('progRow' + b);
      if (row) row.classList.toggle('prog-base-active', b === currentBase);
    });
    // Enable/disable number buttons
    updateButtonStates();
  }

  function updateBitToggles() {
    var container = document.getElementById('progBitGrid');
    if (!container) return;
    var u = toUnsigned(currentValue);
    var bits = container.querySelectorAll('.prog-bit');
    bits.forEach(function (el) {
      var idx = parseInt(el.dataset.bit);
      var isSet = (u >> idx) & 1;
      el.classList.toggle('bit-on', isSet === 1);
      el.textContent = isSet ? '1' : '0';
    });
  }

  function toggleBit(idx) {
    var u = toUnsigned(currentValue);
    u ^= (1 << idx);
    // Convert back to signed if needed
    if (u >= Math.pow(2, wordSize - 1)) u -= Math.pow(2, wordSize);
    currentValue = u;
    expression = formatDec(currentValue);
    updateAllDisplays();
  }

  function updateButtonStates() {
    var disabledChars = { 'BIN': 'ABCDEF23456789', 'OCT': 'ABCDEF89', 'DEC': 'ABCDEF', 'HEX': '' };
    var disabled = disabledChars[currentBase] || '';
    document.querySelectorAll('#progButtons .btn-num[data-v]').forEach(function (btn) {
      var ch = btn.dataset.v;
      var isDisabled = disabled.indexOf(ch) !== -1;
      btn.disabled = isDisabled;
      btn.style.opacity = isDisabled ? '0.3' : '1';
      btn.style.pointerEvents = isDisabled ? 'none' : 'auto';
    });
  }

  function handleProgAction(action, value) {
    switch (action) {
      case 'num':
        expression += value;
        currentValue = parseInput(expression, currentBase);
        updateAllDisplays();
        break;
      case 'clear':
        expression = '';
        currentValue = 0;
        updateAllDisplays();
        break;
      case 'backspace':
        expression = expression.slice(0, -1);
        currentValue = expression ? parseInput(expression, currentBase) : 0;
        updateAllDisplays();
        break;
      case 'base':
        currentBase = value;
        switch (currentBase) {
          case 'HEX': expression = formatHex(currentValue); break;
          case 'DEC': expression = formatDec(currentValue); break;
          case 'OCT': expression = formatOct(currentValue); break;
          case 'BIN': expression = toUnsigned(currentValue).toString(2); break;
        }
        document.querySelectorAll('.prog-base-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.base === currentBase); });
        updateAllDisplays();
        break;
      case 'wordsize':
        wordSize = parseInt(value);
        document.querySelectorAll('.prog-word-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.ws === value); });
        currentValue = clampToWord(currentValue);
        expression = formatDec(currentValue);
        renderBitGrid();
        updateAllDisplays();
        break;
      case 'and': currentValue = (toUnsigned(currentValue)) & 0; expression = ''; updateAllDisplays(); break;
      case 'or': case 'xor': case 'not':
        if (action === 'not') { currentValue = ~toUnsigned(currentValue); currentValue = clampToWord(currentValue); expression = formatDec(currentValue); updateAllDisplays(); }
        break;
      case 'lshift':
        currentValue = clampToWord(currentValue << 1);
        expression = formatDec(currentValue);
        updateAllDisplays();
        break;
      case 'rshift':
        currentValue = clampToWord(currentValue >> 1);
        expression = formatDec(currentValue);
        updateAllDisplays();
        break;
      case 'negate':
        currentValue = -currentValue;
        currentValue = clampToWord(currentValue);
        expression = formatDec(currentValue);
        updateAllDisplays();
        break;
    }
  }

  function renderBitGrid() {
    var container = document.getElementById('progBitGrid');
    if (!container) return;
    var html = '';
    var displayBits = Math.min(wordSize, 32); // Show max 32 bits visually
    for (var i = displayBits - 1; i >= 0; i--) {
      if (i < displayBits - 1 && (i + 1) % 8 === 0) html += '<span class="prog-bit-sep"></span>';
      html += '<button class="prog-bit" data-bit="' + i + '" title="Bit ' + i + '">0</button>';
      if (i % 4 === 0 && i > 0) html += '<span class="prog-bit-space"></span>';
    }
    container.innerHTML = html;
  }

  window.CalcModules['programmer'] = {
    name: 'Programmer',

    render: function (container) {
      container.innerHTML =
        '<div class="prog-calc">' +
          // Base displays
          '<div class="prog-displays">' +
            '<div class="prog-main-display" id="progMainDisplay">0</div>' +
            '<div class="prog-base-row" id="progRowHEX"><span class="prog-base-label">HEX</span><span class="prog-base-value" id="progHexDisplay">0</span></div>' +
            '<div class="prog-base-row" id="progRowDEC"><span class="prog-base-label">DEC</span><span class="prog-base-value" id="progDecDisplay">0</span></div>' +
            '<div class="prog-base-row" id="progRowOCT"><span class="prog-base-label">OCT</span><span class="prog-base-value" id="progOctDisplay">0</span></div>' +
            '<div class="prog-base-row" id="progRowBIN"><span class="prog-base-label">BIN</span><span class="prog-base-value" id="progBinDisplay">0000 0000 0000 0000 0000 0000 0000 0000</span></div>' +
          '</div>' +
          // Bit toggle grid
          '<div class="prog-bit-grid" id="progBitGrid"></div>' +
          // Controls
          '<div class="prog-controls">' +
            '<div class="prog-base-btns">' +
              '<button class="prog-base-btn" data-base="HEX">HEX</button>' +
              '<button class="prog-base-btn active" data-base="DEC">DEC</button>' +
              '<button class="prog-base-btn" data-base="OCT">OCT</button>' +
              '<button class="prog-base-btn" data-base="BIN">BIN</button>' +
            '</div>' +
            '<div class="prog-word-btns">' +
              '<button class="prog-word-btn" data-ws="8">BYTE</button>' +
              '<button class="prog-word-btn" data-ws="16">WORD</button>' +
              '<button class="prog-word-btn active" data-ws="32">DWORD</button>' +
              '<button class="prog-word-btn" data-ws="64">QWORD</button>' +
            '</div>' +
          '</div>' +
          // Buttons
          '<div class="prog-buttons" id="progButtons">' +
            '<div class="btn-row"><button class="btn btn-sci" data-a="lshift">≪</button><button class="btn btn-sci" data-a="rshift">≫</button><button class="btn btn-sci" data-a="not">NOT</button><button class="btn btn-sci" data-a="negate">±</button></div>' +
            '<div class="btn-grid prog-grid">' +
              '<button class="btn btn-num" data-a="num" data-v="A">A</button>' +
              '<button class="btn btn-num" data-a="num" data-v="B">B</button>' +
              '<button class="btn btn-util" data-a="clear">AC</button>' +
              '<button class="btn btn-util" data-a="backspace"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg></button>' +
              '<button class="btn btn-num" data-a="num" data-v="C">C</button>' +
              '<button class="btn btn-num" data-a="num" data-v="D">D</button>' +
              '<button class="btn btn-num" data-a="num" data-v="7">7</button>' +
              '<button class="btn btn-num" data-a="num" data-v="8">8</button>' +
              '<button class="btn btn-num" data-a="num" data-v="E">E</button>' +
              '<button class="btn btn-num" data-a="num" data-v="F">F</button>' +
              '<button class="btn btn-num" data-a="num" data-v="4">4</button>' +
              '<button class="btn btn-num" data-a="num" data-v="5">5</button>' +
              '<button class="btn btn-num prog-empty"></button>' +
              '<button class="btn btn-num prog-empty"></button>' +
              '<button class="btn btn-num" data-a="num" data-v="1">1</button>' +
              '<button class="btn btn-num" data-a="num" data-v="2">2</button>' +
              '<button class="btn btn-num prog-empty"></button>' +
              '<button class="btn btn-num prog-empty"></button>' +
              '<button class="btn btn-num" data-a="num" data-v="9">9</button>' +
              '<button class="btn btn-num" data-a="num" data-v="0">0</button>' +
              '<button class="btn btn-num" data-a="num" data-v="6">6</button>' +
              '<button class="btn btn-num" data-a="num" data-v="3">3</button>' +
            '</div>' +
          '</div>' +
        '</div>';
    },

    init: function () {
      currentBase = 'DEC';
      currentValue = 0;
      wordSize = 32;
      expression = '';

      renderBitGrid();
      updateAllDisplays();

      // Base buttons
      document.querySelectorAll('.prog-base-btn').forEach(function (btn) {
        btn.addEventListener('click', function () { handleProgAction('base', this.dataset.base); });
      });

      // Word size buttons
      document.querySelectorAll('.prog-word-btn').forEach(function (btn) {
        btn.addEventListener('click', function () { handleProgAction('wordsize', this.dataset.ws); });
      });

      // Num/op buttons
      var btns = document.getElementById('progButtons');
      if (btns) {
        btns.addEventListener('click', function (e) {
          var btn = e.target.closest('.btn');
          if (!btn || btn.disabled || btn.classList.contains('prog-empty')) return;
          handleProgAction(btn.dataset.a, btn.dataset.v);
          window.CalcUtils.createRipple(btn, e);
        });
      }

      // Bit toggles
      var bg = document.getElementById('progBitGrid');
      if (bg) {
        bg.addEventListener('click', function (e) {
          var bit = e.target.closest('.prog-bit');
          if (bit) toggleBit(parseInt(bit.dataset.bit));
        });
      }

      // Base row clicks to switch base
      ['HEX', 'DEC', 'OCT', 'BIN'].forEach(function (b) {
        var row = document.getElementById('progRow' + b);
        if (row) row.addEventListener('click', function () { handleProgAction('base', b); });
      });

      keyHandler = function (e) {
        var key = e.key.toUpperCase();
        if ('0123456789ABCDEF'.indexOf(key) !== -1) { e.preventDefault(); handleProgAction('num', key); }
        else if (e.key === 'Backspace') { e.preventDefault(); handleProgAction('backspace'); }
        else if (e.key === 'Delete') { e.preventDefault(); handleProgAction('clear'); }
      };
      document.addEventListener('keydown', keyHandler);
    },

    destroy: function () {
      if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; }
    }
  };
})();
