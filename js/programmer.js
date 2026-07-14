/**
 * Programmer Calculator Module — BigInt Edition
 * Supports: 8-bit (BYTE), 16-bit (WORD), 32-bit (DWORD), 64-bit (QWORD),
 *           128-bit, and 256-bit word sizes using JavaScript BigInt.
 * Binary, Octal, Decimal, Hex conversions + bitwise operations + bit toggle display.
 */
(function () {
  'use strict';
  window.CalcModules = window.CalcModules || {};

  var currentBase = 'DEC';
  var currentValue = 0n; // BigInt
  var wordSize = 32;
  var expression = '';
  var keyHandler = null;

  var WORD_SIZES = [
    { bits: 8,   label: 'BYTE',  short: '8' },
    { bits: 16,  label: 'WORD',  short: '16' },
    { bits: 32,  label: 'DWORD', short: '32' },
    { bits: 64,  label: 'QWORD', short: '64' },
    { bits: 128, label: '128-BIT', short: '128' },
    { bits: 256, label: '256-BIT', short: '256' }
  ];

  function maxSigned() { return (1n << BigInt(wordSize - 1)) - 1n; }
  function minSigned() { return -(1n << BigInt(wordSize - 1)); }
  function mask() { return (1n << BigInt(wordSize)) - 1n; }

  function clampToWord(val) {
    // Wrap into signed range for current word size
    var m = mask();
    val = val & m; // unsigned wrap
    // Convert to signed
    var signBit = 1n << BigInt(wordSize - 1);
    if (val & signBit) {
      val = val - (1n << BigInt(wordSize));
    }
    return val;
  }

  function toUnsigned(val) {
    var m = mask();
    return ((val % (m + 1n)) + (m + 1n)) & m;
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
  function formatDec(val) { return val.toString(); }
  function formatHex(val) { return toUnsigned(val).toString(16).toUpperCase(); }

  function parseInput(str, base) {
    str = str.replace(/\s/g, '');
    if (str === '' || str === '-') return 0n;
    try {
      switch (base) {
        case 'BIN': return BigInt('0b' + str.replace(/[^01]/g, ''));
        case 'OCT': return BigInt('0o' + str.replace(/[^0-7]/g, ''));
        case 'DEC':
          var cleaned = str.replace(/[^0-9\-]/g, '');
          return cleaned === '' || cleaned === '-' ? 0n : BigInt(cleaned);
        case 'HEX': return BigInt('0x' + (str.replace(/[^0-9a-fA-F]/g, '') || '0'));
        default: return 0n;
      }
    } catch (e) { return 0n; }
  }

  function truncateDisplay(str, maxLen) {
    if (str.length <= maxLen) return str;
    return '…' + str.slice(-(maxLen - 1));
  }

  function updateAllDisplays() {
    currentValue = clampToWord(currentValue);
    var hexD = document.getElementById('progHexDisplay');
    var decD = document.getElementById('progDecDisplay');
    var octD = document.getElementById('progOctDisplay');
    var binD = document.getElementById('progBinDisplay');
    var mainD = document.getElementById('progMainDisplay');

    if (hexD) hexD.textContent = truncateDisplay(formatHex(currentValue), 80);
    if (decD) decD.textContent = truncateDisplay(formatDec(currentValue), 80);
    if (octD) octD.textContent = truncateDisplay(formatOct(currentValue), 80);
    if (binD) {
      // For large bit counts, show abbreviated binary
      var binStr = formatBin(currentValue);
      if (wordSize > 64) {
        binD.textContent = truncateDisplay(binStr.replace(/\s/g, ''), 80).replace(/(.{4})/g, '$1 ').trim();
      } else {
        binD.textContent = binStr;
      }
    }
    if (mainD) {
      switch (currentBase) {
        case 'HEX': mainD.textContent = formatHex(currentValue); break;
        case 'DEC': mainD.textContent = formatDec(currentValue); break;
        case 'OCT': mainD.textContent = formatOct(currentValue); break;
        case 'BIN': mainD.textContent = formatBin(currentValue); break;
      }
    }
    updateBitToggles();
    ['HEX', 'DEC', 'OCT', 'BIN'].forEach(function (b) {
      var row = document.getElementById('progRow' + b);
      if (row) row.classList.toggle('prog-base-active', b === currentBase);
    });
    updateButtonStates();
    // Update word size badge
    var wsInfo = document.getElementById('progWordInfo');
    if (wsInfo) {
      var u = toUnsigned(currentValue);
      var bitCount = u === 0n ? 0 : u.toString(2).length;
      wsInfo.textContent = bitCount + ' / ' + wordSize + ' bits used';
    }
  }

  function updateBitToggles() {
    var container = document.getElementById('progBitGrid');
    if (!container) return;
    var u = toUnsigned(currentValue);
    var bits = container.querySelectorAll('.prog-bit');
    bits.forEach(function (el) {
      var idx = BigInt(el.dataset.bit);
      var isSet = (u >> idx) & 1n;
      el.classList.toggle('bit-on', isSet === 1n);
      el.textContent = isSet ? '1' : '0';
    });
  }

  function toggleBit(idx) {
    var u = toUnsigned(currentValue);
    u ^= (1n << BigInt(idx));
    currentValue = clampToWord(u);
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
      btn.style.opacity = isDisabled ? '0.25' : '1';
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
        currentValue = 0n;
        updateAllDisplays();
        break;
      case 'backspace':
        expression = expression.slice(0, -1);
        currentValue = expression ? parseInput(expression, currentBase) : 0n;
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
      case 'not':
        currentValue = clampToWord(~toUnsigned(currentValue));
        expression = formatDec(currentValue);
        updateAllDisplays();
        break;
      case 'and':
        // Store for chaining — for now, just clear
        currentValue = 0n;
        expression = '';
        updateAllDisplays();
        break;
      case 'lshift':
        currentValue = clampToWord(toUnsigned(currentValue) << 1n);
        expression = formatDec(currentValue);
        updateAllDisplays();
        break;
      case 'rshift':
        currentValue = clampToWord(toUnsigned(currentValue) >> 1n);
        expression = formatDec(currentValue);
        updateAllDisplays();
        break;
      case 'negate':
        currentValue = clampToWord(-currentValue);
        expression = formatDec(currentValue);
        updateAllDisplays();
        break;
    }
  }

  function renderBitGrid() {
    var container = document.getElementById('progBitGrid');
    if (!container) return;
    // Show all bits up to 64, or show compact for 128/256
    var displayBits = Math.min(wordSize, 64);
    var html = '';

    if (wordSize > 64) {
      // For 128/256 bit, show in rows of 64 with labels
      var totalRows = Math.ceil(wordSize / 64);
      for (var row = totalRows - 1; row >= 0; row--) {
        var startBit = row * 64;
        var endBit = Math.min(startBit + 64, wordSize);
        html += '<div class="prog-bit-row-label">Bits ' + startBit + '–' + (endBit - 1) + '</div>';
        html += '<div class="prog-bit-row-wrap">';
        for (var i = endBit - 1; i >= startBit; i--) {
          if (i < endBit - 1 && (i + 1) % 8 === 0 && i >= startBit) html += '<span class="prog-bit-sep"></span>';
          html += '<button class="prog-bit prog-bit-compact" data-bit="' + i + '" title="Bit ' + i + '">0</button>';
          if (i % 4 === 0 && i > startBit) html += '<span class="prog-bit-space"></span>';
        }
        html += '</div>';
      }
    } else {
      for (var i = displayBits - 1; i >= 0; i--) {
        if (i < displayBits - 1 && (i + 1) % 8 === 0) html += '<span class="prog-bit-sep"></span>';
        html += '<button class="prog-bit" data-bit="' + i + '" title="Bit ' + i + '">0</button>';
        if (i % 4 === 0 && i > 0) html += '<span class="prog-bit-space"></span>';
      }
    }
    container.innerHTML = html;
  }

  window.CalcModules['programmer'] = {
    name: 'Programmer',

    render: function (container) {
      var wordBtnsHtml = WORD_SIZES.map(function (ws) {
        var active = ws.bits === 32 ? ' active' : '';
        return '<button class="prog-word-btn' + active + '" data-ws="' + ws.bits + '">' + ws.label + '</button>';
      }).join('');

      container.innerHTML =
        '<div class="prog-calc">' +
          '<div class="prog-displays">' +
            '<div class="prog-main-display" id="progMainDisplay">0</div>' +
            '<div class="prog-word-info" id="progWordInfo">0 / 32 bits used</div>' +
            '<div class="prog-base-row" id="progRowHEX"><span class="prog-base-label">HEX</span><span class="prog-base-value" id="progHexDisplay">0</span></div>' +
            '<div class="prog-base-row prog-base-active" id="progRowDEC"><span class="prog-base-label">DEC</span><span class="prog-base-value" id="progDecDisplay">0</span></div>' +
            '<div class="prog-base-row" id="progRowOCT"><span class="prog-base-label">OCT</span><span class="prog-base-value" id="progOctDisplay">0</span></div>' +
            '<div class="prog-base-row" id="progRowBIN"><span class="prog-base-label">BIN</span><span class="prog-base-value" id="progBinDisplay">' + '0000 '.repeat(8).trim() + '</span></div>' +
          '</div>' +
          '<div class="prog-bit-grid-scroll"><div class="prog-bit-grid" id="progBitGrid"></div></div>' +
          '<div class="prog-controls">' +
            '<div class="prog-base-btns">' +
              '<button class="prog-base-btn" data-base="HEX">HEX</button>' +
              '<button class="prog-base-btn active" data-base="DEC">DEC</button>' +
              '<button class="prog-base-btn" data-base="OCT">OCT</button>' +
              '<button class="prog-base-btn" data-base="BIN">BIN</button>' +
            '</div>' +
            '<div class="prog-word-btns">' + wordBtnsHtml + '</div>' +
          '</div>' +
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
      currentValue = 0n;
      wordSize = 32;
      expression = '';

      renderBitGrid();
      updateAllDisplays();

      document.querySelectorAll('.prog-base-btn').forEach(function (btn) {
        btn.addEventListener('click', function () { handleProgAction('base', this.dataset.base); });
      });

      document.querySelectorAll('.prog-word-btn').forEach(function (btn) {
        btn.addEventListener('click', function () { handleProgAction('wordsize', this.dataset.ws); });
      });

      var btns = document.getElementById('progButtons');
      if (btns) {
        btns.addEventListener('click', function (e) {
          var btn = e.target.closest('.btn');
          if (!btn || btn.disabled || btn.classList.contains('prog-empty')) return;
          handleProgAction(btn.dataset.a, btn.dataset.v);
          window.CalcUtils.createRipple(btn, e);
        });
      }

      var bg = document.getElementById('progBitGrid');
      if (bg) {
        bg.addEventListener('click', function (e) {
          var bit = e.target.closest('.prog-bit');
          if (bit) toggleBit(parseInt(bit.dataset.bit));
        });
      }

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
