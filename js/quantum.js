/**
 * Quantum Computing Calculator Module
 * 4 Sub-tabs: Qubit State, Gate Calculator, Circuit Simulator, Entanglement Lab
 */
(function () {
  'use strict';

  window.CalcModules = window.CalcModules || {};

  // ===== Complex Number Class =====
  function Complex(re, im) {
    this.re = (re === undefined) ? 0 : re;
    this.im = (im === undefined) ? 0 : im;
  }
  Complex.prototype.add = function (c) { return new Complex(this.re + c.re, this.im + c.im); };
  Complex.prototype.sub = function (c) { return new Complex(this.re - c.re, this.im - c.im); };
  Complex.prototype.mul = function (c) {
    return new Complex(this.re * c.re - this.im * c.im, this.re * c.im + this.im * c.re);
  };
  Complex.prototype.scale = function (s) { return new Complex(this.re * s, this.im * s); };
  Complex.prototype.conjugate = function () { return new Complex(this.re, -this.im); };
  Complex.prototype.magnitude = function () { return Math.sqrt(this.re * this.re + this.im * this.im); };
  Complex.prototype.magnitudeSq = function () { return this.re * this.re + this.im * this.im; };
  Complex.prototype.phase = function () { return Math.atan2(this.im, this.re); };
  Complex.prototype.toString = function () {
    var r = roundN(this.re, 4);
    var i = roundN(this.im, 4);
    if (i === 0) return String(r);
    if (r === 0) {
      if (i === 1) return 'i';
      if (i === -1) return '-i';
      return i + 'i';
    }
    var sign = i > 0 ? '+' : '-';
    var absI = Math.abs(i);
    return r + sign + (absI === 1 ? '' : absI) + 'i';
  };

  Complex.fromPolar = function (mag, phase) {
    return new Complex(mag * Math.cos(phase), mag * Math.sin(phase));
  };

  var C0 = new Complex(0, 0);
  var C1 = new Complex(1, 0);
  var CI = new Complex(0, 1);
  var CNI = new Complex(0, -1);
  var SQRT2INV = 1 / Math.sqrt(2);

  function roundN(x, n) {
    var f = Math.pow(10, n);
    return Math.round(x * f) / f;
  }

  // ===== Gate Matrices =====
  var GATES = {
    'I': { label: 'I', matrix: [[C1, C0], [C0, C1]], desc: 'Identity' },
    'X': { label: 'X', matrix: [[C0, C1], [C1, C0]], desc: 'Pauli-X (NOT)' },
    'Y': { label: 'Y', matrix: [[C0, CNI], [CI, C0]], desc: 'Pauli-Y' },
    'Z': { label: 'Z', matrix: [[C1, C0], [C0, new Complex(-1, 0)]], desc: 'Pauli-Z' },
    'H': {
      label: 'H', desc: 'Hadamard',
      matrix: [
        [new Complex(SQRT2INV, 0), new Complex(SQRT2INV, 0)],
        [new Complex(SQRT2INV, 0), new Complex(-SQRT2INV, 0)]
      ]
    },
    'S': { label: 'S', matrix: [[C1, C0], [C0, CI]], desc: 'Phase (S)' },
    'T': {
      label: 'T', desc: 'T gate (π/8)',
      matrix: [[C1, C0], [C0, Complex.fromPolar(1, Math.PI / 4)]]
    }
  };

  function gateRx(theta) {
    var c = Math.cos(theta / 2), s = Math.sin(theta / 2);
    return {
      label: 'Rx(' + roundN(theta, 2) + ')', desc: 'Rotation-X',
      matrix: [[new Complex(c, 0), new Complex(0, -s)], [new Complex(0, -s), new Complex(c, 0)]]
    };
  }
  function gateRy(theta) {
    var c = Math.cos(theta / 2), s = Math.sin(theta / 2);
    return {
      label: 'Ry(' + roundN(theta, 2) + ')', desc: 'Rotation-Y',
      matrix: [[new Complex(c, 0), new Complex(-s, 0)], [new Complex(s, 0), new Complex(c, 0)]]
    };
  }
  function gateRz(theta) {
    return {
      label: 'Rz(' + roundN(theta, 2) + ')', desc: 'Rotation-Z',
      matrix: [[Complex.fromPolar(1, -theta / 2), C0], [C0, Complex.fromPolar(1, theta / 2)]]
    };
  }

  // Multi-qubit gates (4x4)
  var CNOT_MATRIX = [
    [C1, C0, C0, C0],
    [C0, C1, C0, C0],
    [C0, C0, C0, C1],
    [C0, C0, C1, C0]
  ];
  var SWAP_MATRIX = [
    [C1, C0, C0, C0],
    [C0, C0, C1, C0],
    [C0, C1, C0, C0],
    [C0, C0, C0, C1]
  ];

  // ===== Quantum Math Utilities =====
  function applyGate(state, gate) {
    var n = state.length;
    var result = [];
    for (var i = 0; i < n; i++) {
      var sum = C0;
      for (var j = 0; j < n; j++) {
        sum = sum.add(gate[i][j].mul(state[j]));
      }
      result.push(sum);
    }
    return result;
  }

  function tensorProduct(a, b) {
    var result = [];
    for (var i = 0; i < a.length; i++) {
      for (var j = 0; j < b.length; j++) {
        result.push(a[i].mul(b[j]));
      }
    }
    return result;
  }

  function kroneckerMatrix(A, B) {
    var aRows = A.length, aCols = A[0].length;
    var bRows = B.length, bCols = B[0].length;
    var result = [];
    for (var i = 0; i < aRows * bRows; i++) {
      result[i] = [];
      for (var j = 0; j < aCols * bCols; j++) {
        var ai = Math.floor(i / bRows), bi = i % bRows;
        var aj = Math.floor(j / bCols), bj = j % bCols;
        result[i][j] = A[ai][aj].mul(B[bi][bj]);
      }
    }
    return result;
  }

  function identityMatrix(n) {
    var m = [];
    for (var i = 0; i < n; i++) {
      m[i] = [];
      for (var j = 0; j < n; j++) {
        m[i][j] = (i === j) ? C1 : C0;
      }
    }
    return m;
  }

  function stateToString(state) {
    var parts = [];
    var n = state.length;
    var nBits = Math.log2(n);
    for (var i = 0; i < n; i++) {
      var mag = state[i].magnitude();
      if (mag > 1e-8) {
        var label = i.toString(2).padStart(nBits, '0');
        parts.push(state[i].toString() + '|' + label + '⟩');
      }
    }
    return parts.join(' + ').replace(/\+ -/g, '- ') || '0';
  }

  // ===== Module State =====
  var activeTab = 'qubit';
  var blochAnimId = null;
  var blochRotation = 0;
  var eventRefs = [];

  // Gate Calculator state
  var gateChain = [];
  var gateInitialState = '0';
  var gateStepIndex = -1;
  var gateRotAngle = Math.PI / 2;

  // Circuit Simulator state
  var circuitQubits = 2;
  var circuitGates = []; // [{gate, qubit, col, control?}]
  var circuitSelectedGate = null;
  var circuitMaxCols = 8;

  // Entanglement Lab state
  var entState = null;
  var entCollapsed = false;
  var entGlowAnimId = null;

  // ===== CSS Styles =====
  var CSS = '<style>' +
    '.q-wrap{font-family:"Inter",sans-serif;color:#f1f5f9;padding:0 2px 12px;max-width:600px;margin:0 auto;-webkit-user-select:none;user-select:none}' +
    '.q-tabs{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap}' +
    '.q-tab{flex:1;min-width:80px;padding:8px 6px;border:none;border-radius:10px;background:rgba(255,255,255,0.06);backdrop-filter:blur(12px);color:#94a3b8;font-family:"Inter",sans-serif;font-size:11px;font-weight:600;cursor:pointer;transition:all .25s;text-align:center;letter-spacing:.3px}' +
    '.q-tab:hover{background:rgba(129,140,248,0.15);color:#c7d2fe}' +
    '.q-tab.active{background:linear-gradient(135deg,rgba(129,140,248,0.3),rgba(167,139,250,0.25));color:#e0e7ff;box-shadow:0 0 16px rgba(129,140,248,0.2)}' +
    '.q-panel{display:none;animation:qfade .3s ease}' +
    '.q-panel.active{display:block}' +
    '@keyframes qfade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}' +
    '.q-section{background:rgba(255,255,255,0.04);border-radius:12px;padding:14px;margin-bottom:12px;border:1px solid rgba(255,255,255,0.06)}' +
    '.q-section-title{font-size:11px;font-weight:700;color:#818cf8;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px}' +
    '.q-label{font-size:11px;color:#94a3b8;margin-bottom:4px;font-weight:500}' +
    '.q-mono{font-family:"JetBrains Mono",monospace}' +
    '.q-state-display{font-family:"JetBrains Mono",monospace;font-size:15px;color:#e0e7ff;padding:10px 14px;background:rgba(0,0,0,0.25);border-radius:8px;margin:8px 0;text-align:center;min-height:20px;word-break:break-all;border:1px solid rgba(129,140,248,0.15)}' +
    '.q-slider-row{display:flex;align-items:center;gap:10px;margin-bottom:10px}' +
    '.q-slider-label{font-family:"JetBrains Mono",monospace;font-size:12px;color:#a78bfa;min-width:28px}' +
    '.q-slider{flex:1;-webkit-appearance:none;appearance:none;height:5px;border-radius:3px;background:rgba(255,255,255,0.1);outline:none}' +
    '.q-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:16px;height:16px;border-radius:50%;background:#818cf8;cursor:pointer;box-shadow:0 0 8px rgba(129,140,248,0.5)}' +
    '.q-slider-val{font-family:"JetBrains Mono",monospace;font-size:11px;color:#94a3b8;min-width:50px;text-align:right}' +
    '.q-prob-row{display:flex;align-items:center;gap:8px;margin:6px 0}' +
    '.q-prob-label{font-family:"JetBrains Mono",monospace;font-size:12px;color:#c7d2fe;min-width:46px}' +
    '.q-prob-bar-bg{flex:1;height:22px;background:rgba(255,255,255,0.06);border-radius:6px;overflow:hidden;position:relative}' +
    '.q-prob-bar{height:100%;border-radius:6px;transition:width .4s cubic-bezier(.4,0,.2,1);position:relative}' +
    '.q-prob-bar-0{background:linear-gradient(90deg,#818cf8,#6366f1)}' +
    '.q-prob-bar-1{background:linear-gradient(90deg,#a78bfa,#7c3aed)}' +
    '.q-prob-val{font-family:"JetBrains Mono",monospace;font-size:11px;color:#e0e7ff;min-width:56px;text-align:right}' +
    '.q-bloch-wrap{display:flex;justify-content:center;margin:10px 0}' +
    '.q-bloch-canvas{border-radius:14px;border:1.5px solid rgba(129,140,248,0.25);box-shadow:0 0 24px rgba(129,140,248,0.15),inset 0 0 30px rgba(0,0,0,0.3);background:rgba(0,0,0,0.35)}' +
    '.q-btn{padding:8px 14px;border:none;border-radius:8px;background:rgba(129,140,248,0.18);color:#c7d2fe;font-family:"Inter",sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s;position:relative;overflow:hidden}' +
    '.q-btn:hover{background:rgba(129,140,248,0.3);transform:translateY(-1px)}' +
    '.q-btn:active{transform:scale(.96)}' +
    '.q-btn.active{background:linear-gradient(135deg,#818cf8,#6366f1);color:#fff;box-shadow:0 0 12px rgba(129,140,248,0.4)}' +
    '.q-btn-danger{background:rgba(248,113,113,0.18);color:#fca5a5}' +
    '.q-btn-danger:hover{background:rgba(248,113,113,0.3)}' +
    '.q-btn-success{background:rgba(52,211,153,0.18);color:#6ee7b7}' +
    '.q-btn-success:hover{background:rgba(52,211,153,0.3)}' +
    '.q-gate-grid{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}' +
    '.q-gate-btn{padding:6px 12px;border:none;border-radius:6px;background:rgba(255,255,255,0.07);color:#c7d2fe;font-family:"JetBrains Mono",monospace;font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;min-width:36px;text-align:center}' +
    '.q-gate-btn:hover{background:rgba(129,140,248,0.25);transform:translateY(-1px)}' +
    '.q-gate-btn.active{background:#818cf8;color:#fff;box-shadow:0 0 10px rgba(129,140,248,0.4)}' +
    '.q-matrix{display:inline-grid;grid-template-columns:1fr 1fr;gap:2px;background:rgba(0,0,0,0.3);border-radius:8px;padding:8px 12px;font-family:"JetBrains Mono",monospace;font-size:11px;color:#c7d2fe;border:1px solid rgba(129,140,248,0.12);margin:6px 0}' +
    '.q-matrix-4{grid-template-columns:1fr 1fr 1fr 1fr}' +
    '.q-matrix-cell{padding:4px 6px;text-align:center;background:rgba(255,255,255,0.03);border-radius:4px}' +
    '.q-chain{display:flex;flex-wrap:wrap;gap:4px;margin:8px 0;min-height:32px;padding:8px;background:rgba(0,0,0,0.2);border-radius:8px;border:1px dashed rgba(255,255,255,0.08);align-items:center}' +
    '.q-chain-item{padding:4px 10px;border-radius:6px;background:rgba(129,140,248,0.2);color:#c7d2fe;font-family:"JetBrains Mono",monospace;font-size:12px;cursor:pointer;transition:all .2s;position:relative}' +
    '.q-chain-item:hover{background:rgba(248,113,113,0.3);color:#fca5a5}' +
    '.q-chain-item.highlight{background:rgba(52,211,153,0.35);color:#6ee7b7;box-shadow:0 0 8px rgba(52,211,153,0.3)}' +
    '.q-chain-empty{color:#475569;font-size:11px;font-style:italic}' +
    '.q-select{padding:6px 10px;border-radius:6px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);color:#e0e7ff;font-family:"JetBrains Mono",monospace;font-size:12px;outline:none;cursor:pointer}' +
    '.q-select option{background:#1e1b4b;color:#e0e7ff}' +
    '.q-circuit-wrap{background:rgba(0,0,0,0.25);border-radius:10px;padding:14px;overflow-x:auto;border:1px solid rgba(255,255,255,0.05)}' +
    '.q-circuit-canvas{display:block;margin:0 auto}' +
    '.q-palette{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}' +
    '.q-palette-btn{padding:6px 14px;border:none;border-radius:6px;background:rgba(255,255,255,0.06);color:#c7d2fe;font-family:"JetBrains Mono",monospace;font-size:12px;cursor:pointer;transition:all .2s}' +
    '.q-palette-btn:hover{background:rgba(129,140,248,0.2)}' +
    '.q-palette-btn.selected{background:#818cf8;color:#fff;box-shadow:0 0 10px rgba(129,140,248,0.4)}' +
    '.q-prob-bars{margin:10px 0}' +
    '.q-ent-visual{display:flex;align-items:center;justify-content:center;gap:30px;margin:16px 0;position:relative}' +
    '.q-ent-qubit{width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:"JetBrains Mono",monospace;font-size:14px;font-weight:700;position:relative;z-index:2}' +
    '.q-ent-qubit-0{background:linear-gradient(135deg,rgba(129,140,248,0.35),rgba(99,102,241,0.2));border:2px solid rgba(129,140,248,0.5);color:#c7d2fe;box-shadow:0 0 20px rgba(129,140,248,0.2)}' +
    '.q-ent-qubit-1{background:linear-gradient(135deg,rgba(167,139,250,0.35),rgba(124,58,237,0.2));border:2px solid rgba(167,139,250,0.5);color:#ddd6fe;box-shadow:0 0 20px rgba(167,139,250,0.2)}' +
    '.q-ent-link{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:60px;height:4px;border-radius:2px;z-index:1}' +
    '.q-ent-link.entangled{background:linear-gradient(90deg,#818cf8,#a78bfa);box-shadow:0 0 16px rgba(129,140,248,0.5),0 0 32px rgba(167,139,250,0.3);animation:qentglow 1.5s ease-in-out infinite alternate}' +
    '.q-ent-link.collapsed{background:rgba(255,255,255,0.1);box-shadow:none;animation:none}' +
    '@keyframes qentglow{from{box-shadow:0 0 12px rgba(129,140,248,0.4),0 0 24px rgba(167,139,250,0.2);opacity:.8}to{box-shadow:0 0 24px rgba(129,140,248,0.7),0 0 48px rgba(167,139,250,0.4);opacity:1}}' +
    '.q-bell-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}' +
    '.q-bell-btn{padding:10px;border:none;border-radius:8px;background:rgba(255,255,255,0.05);color:#c7d2fe;font-family:"JetBrains Mono",monospace;font-size:14px;cursor:pointer;transition:all .2s;text-align:center;border:1px solid rgba(255,255,255,0.06)}' +
    '.q-bell-btn:hover{background:rgba(129,140,248,0.15);border-color:rgba(129,140,248,0.3)}' +
    '.q-bell-btn.active{background:linear-gradient(135deg,rgba(129,140,248,0.25),rgba(167,139,250,0.2));border-color:rgba(129,140,248,0.4);box-shadow:0 0 14px rgba(129,140,248,0.2)}' +
    '.q-entropy{font-family:"JetBrains Mono",monospace;font-size:14px;color:#34d399;text-align:center;padding:10px;background:rgba(52,211,153,0.08);border-radius:8px;border:1px solid rgba(52,211,153,0.15);margin:8px 0}' +
    '.q-explanation{font-size:12px;color:#94a3b8;line-height:1.6;padding:10px;background:rgba(255,255,255,0.02);border-radius:8px;margin-top:8px;border-left:3px solid rgba(129,140,248,0.3)}' +
    '.q-result-grid{display:flex;gap:12px;margin:8px 0;flex-wrap:wrap}' +
    '.q-result-card{flex:1;min-width:100px;padding:10px;background:rgba(0,0,0,0.2);border-radius:8px;text-align:center;border:1px solid rgba(255,255,255,0.05)}' +
    '.q-result-card-label{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}' +
    '.q-result-card-value{font-family:"JetBrains Mono",monospace;font-size:14px;color:#e0e7ff}' +
    '.q-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:6px 0}' +
    '.q-flex-center{display:flex;justify-content:center}' +
    '.q-measure-result{font-family:"JetBrains Mono",monospace;font-size:18px;text-align:center;padding:14px;margin:10px 0;border-radius:10px;animation:qfade .3s ease}' +
    '</style>';

  // ===== RENDER =====
  function renderModule(container) {
    container.innerHTML = CSS +
      '<div class="q-wrap" id="qWrap">' +
        '<div class="q-tabs">' +
          '<button class="q-tab active" data-qtab="qubit">⚛ Qubit State</button>' +
          '<button class="q-tab" data-qtab="gates">◈ Gates</button>' +
          '<button class="q-tab" data-qtab="circuit">⊞ Circuit</button>' +
          '<button class="q-tab" data-qtab="entangle">⫘ Entanglement</button>' +
        '</div>' +
        '<div id="qPanels">' +
          renderQubitTab() +
          renderGateTab() +
          renderCircuitTab() +
          renderEntangleTab() +
        '</div>' +
      '</div>';
  }

  // ----- Tab 1: Qubit State -----
  function renderQubitTab() {
    return '<div class="q-panel active" id="qPanelQubit" data-qtab="qubit">' +
      '<div class="q-section">' +
        '<div class="q-section-title">State Parameters</div>' +
        '<div class="q-slider-row">' +
          '<span class="q-slider-label">θ</span>' +
          '<input type="range" class="q-slider" id="qTheta" min="0" max="3141.5926" value="0" step="1">' +
          '<span class="q-slider-val" id="qThetaVal">0.00</span>' +
        '</div>' +
        '<div class="q-slider-row">' +
          '<span class="q-slider-label">φ</span>' +
          '<input type="range" class="q-slider" id="qPhi" min="0" max="6283.1853" value="0" step="1">' +
          '<span class="q-slider-val" id="qPhiVal">0.00</span>' +
        '</div>' +
      '</div>' +
      '<div class="q-section">' +
        '<div class="q-section-title">State Vector</div>' +
        '<div class="q-state-display" id="qStateVec">1|0⟩ + 0|1⟩</div>' +
        '<div class="q-result-grid">' +
          '<div class="q-result-card"><div class="q-result-card-label">α (amplitude |0⟩)</div><div class="q-result-card-value q-mono" id="qAlpha">1</div></div>' +
          '<div class="q-result-card"><div class="q-result-card-label">β (amplitude |1⟩)</div><div class="q-result-card-value q-mono" id="qBeta">0</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="q-section">' +
        '<div class="q-section-title">Measurement Probabilities</div>' +
        '<div class="q-prob-row">' +
          '<span class="q-prob-label">P(|0⟩)</span>' +
          '<div class="q-prob-bar-bg"><div class="q-prob-bar q-prob-bar-0" id="qProb0Bar" style="width:100%"></div></div>' +
          '<span class="q-prob-val" id="qProb0Val">100.00%</span>' +
        '</div>' +
        '<div class="q-prob-row">' +
          '<span class="q-prob-label">P(|1⟩)</span>' +
          '<div class="q-prob-bar-bg"><div class="q-prob-bar q-prob-bar-1" id="qProb1Bar" style="width:0%"></div></div>' +
          '<span class="q-prob-val" id="qProb1Val">0.00%</span>' +
        '</div>' +
      '</div>' +
      '<div class="q-section">' +
        '<div class="q-section-title">Bloch Sphere</div>' +
        '<div class="q-bloch-wrap">' +
          '<canvas class="q-bloch-canvas" id="qBlochCanvas" width="220" height="220"></canvas>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  // ----- Tab 2: Gate Calculator -----
  function renderGateTab() {
    return '<div class="q-panel" id="qPanelGates" data-qtab="gates">' +
      '<div class="q-section">' +
        '<div class="q-section-title">Initial State</div>' +
        '<div class="q-row">' +
          '<select class="q-select" id="qGateInit">' +
            '<option value="0">|0⟩</option>' +
            '<option value="1">|1⟩</option>' +
            '<option value="+">|+⟩</option>' +
            '<option value="-">|-⟩</option>' +
            '<option value="custom">Custom</option>' +
          '</select>' +
          '<div id="qGateCustomWrap" style="display:none;gap:6px;align-items:center">' +
            '<input type="text" id="qGateCustomAlpha" placeholder="α (e.g. 0.6)" style="width:70px;padding:5px 8px;border-radius:6px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.1);color:#e0e7ff;font-family:JetBrains Mono,monospace;font-size:11px;outline:none">' +
            '<input type="text" id="qGateCustomBeta" placeholder="β (e.g. 0.8)" style="width:70px;padding:5px 8px;border-radius:6px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.1);color:#e0e7ff;font-family:JetBrains Mono,monospace;font-size:11px;outline:none">' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="q-section">' +
        '<div class="q-section-title">Quantum Gates</div>' +
        '<div class="q-gate-grid" id="qGateGrid">' +
          '<button class="q-gate-btn" data-gate="I">I</button>' +
          '<button class="q-gate-btn" data-gate="X">X</button>' +
          '<button class="q-gate-btn" data-gate="Y">Y</button>' +
          '<button class="q-gate-btn" data-gate="Z">Z</button>' +
          '<button class="q-gate-btn" data-gate="H">H</button>' +
          '<button class="q-gate-btn" data-gate="S">S</button>' +
          '<button class="q-gate-btn" data-gate="T">T</button>' +
          '<button class="q-gate-btn" data-gate="Rx">Rx(θ)</button>' +
          '<button class="q-gate-btn" data-gate="Ry">Ry(θ)</button>' +
          '<button class="q-gate-btn" data-gate="Rz">Rz(θ)</button>' +
        '</div>' +
        '<div class="q-row" id="qGateAngleRow" style="display:none">' +
          '<span class="q-label">Rotation angle θ:</span>' +
          '<input type="range" class="q-slider" id="qGateAngle" min="0" max="6283" value="1571" step="1" style="flex:1">' +
          '<span class="q-slider-val q-mono" id="qGateAngleVal">π/2</span>' +
        '</div>' +
      '</div>' +
      '<div class="q-section">' +
        '<div class="q-section-title">Gate Matrix</div>' +
        '<div class="q-flex-center" id="qGateMatrixWrap">' +
          '<div class="q-matrix" id="qGateMatrix" style="visibility:hidden">' +
            '<div class="q-matrix-cell">-</div><div class="q-matrix-cell">-</div>' +
            '<div class="q-matrix-cell">-</div><div class="q-matrix-cell">-</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="q-section">' +
        '<div class="q-section-title">Gate Chain</div>' +
        '<div class="q-chain" id="qGateChain"><span class="q-chain-empty">Click gates above to build a chain</span></div>' +
        '<div class="q-row" style="margin-top:8px">' +
          '<button class="q-btn q-btn-success" id="qGateStep">◁ Step</button>' +
          '<button class="q-btn" id="qGateRunAll">Run All ▷</button>' +
          '<button class="q-btn q-btn-danger" id="qGateClear">Clear</button>' +
        '</div>' +
      '</div>' +
      '<div class="q-section">' +
        '<div class="q-section-title">Result State</div>' +
        '<div class="q-state-display" id="qGateResult">—</div>' +
        '<div class="q-result-grid">' +
          '<div class="q-result-card"><div class="q-result-card-label">P(|0⟩)</div><div class="q-result-card-value q-mono" id="qGateP0">—</div></div>' +
          '<div class="q-result-card"><div class="q-result-card-label">P(|1⟩)</div><div class="q-result-card-value q-mono" id="qGateP1">—</div></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  // ----- Tab 3: Circuit Simulator -----
  function renderCircuitTab() {
    return '<div class="q-panel" id="qPanelCircuit" data-qtab="circuit">' +
      '<div class="q-section">' +
        '<div class="q-section-title">Qubits</div>' +
        '<div class="q-row">' +
          '<button class="q-btn active" id="qCirc2Q" data-qn="2">2 Qubits</button>' +
          '<button class="q-btn" id="qCirc3Q" data-qn="3">3 Qubits</button>' +
        '</div>' +
      '</div>' +
      '<div class="q-section">' +
        '<div class="q-section-title">Gate Palette</div>' +
        '<div class="q-palette" id="qCircPalette">' +
          '<button class="q-palette-btn" data-cg="H">H</button>' +
          '<button class="q-palette-btn" data-cg="X">X</button>' +
          '<button class="q-palette-btn" data-cg="Y">Y</button>' +
          '<button class="q-palette-btn" data-cg="Z">Z</button>' +
          '<button class="q-palette-btn" data-cg="S">S</button>' +
          '<button class="q-palette-btn" data-cg="T">T</button>' +
          '<button class="q-palette-btn" data-cg="CNOT">CNOT</button>' +
          '<button class="q-palette-btn" data-cg="SWAP">SWAP</button>' +
          '<button class="q-palette-btn" data-cg="M">Measure</button>' +
        '</div>' +
      '</div>' +
      '<div class="q-section">' +
        '<div class="q-section-title">Circuit</div>' +
        '<div class="q-circuit-wrap">' +
          '<canvas class="q-circuit-canvas" id="qCircCanvas" width="500" height="160"></canvas>' +
        '</div>' +
      '</div>' +
      '<div class="q-row" style="justify-content:center;gap:10px;margin:8px 0">' +
        '<button class="q-btn q-btn-success" id="qCircRun">▶ Run</button>' +
        '<button class="q-btn q-btn-danger" id="qCircReset">Reset</button>' +
      '</div>' +
      '<div class="q-section" id="qCircResultSection" style="display:none">' +
        '<div class="q-section-title">Output State</div>' +
        '<div class="q-state-display" id="qCircResultState"></div>' +
        '<div class="q-section-title" style="margin-top:10px">Basis State Probabilities</div>' +
        '<div class="q-prob-bars" id="qCircProbBars"></div>' +
      '</div>' +
    '</div>';
  }

  // ----- Tab 4: Entanglement Lab -----
  function renderEntangleTab() {
    return '<div class="q-panel" id="qPanelEntangle" data-qtab="entangle">' +
      '<div class="q-section">' +
        '<div class="q-section-title">Bell States</div>' +
        '<div class="q-bell-grid" id="qBellGrid">' +
          '<button class="q-bell-btn" data-bell="phiP">|Φ⁺⟩</button>' +
          '<button class="q-bell-btn" data-bell="phiM">|Φ⁻⟩</button>' +
          '<button class="q-bell-btn" data-bell="psiP">|Ψ⁺⟩</button>' +
          '<button class="q-bell-btn" data-bell="psiM">|Ψ⁻⟩</button>' +
        '</div>' +
      '</div>' +
      '<div class="q-section">' +
        '<div class="q-section-title">2-Qubit State Vector</div>' +
        '<div class="q-state-display" id="qEntState">Select a Bell state above</div>' +
        '<div class="q-result-grid" id="qEntAmps" style="display:none">' +
          '<div class="q-result-card"><div class="q-result-card-label">|00⟩</div><div class="q-result-card-value q-mono" id="qEntA00">—</div></div>' +
          '<div class="q-result-card"><div class="q-result-card-label">|01⟩</div><div class="q-result-card-value q-mono" id="qEntA01">—</div></div>' +
          '<div class="q-result-card"><div class="q-result-card-label">|10⟩</div><div class="q-result-card-value q-mono" id="qEntA10">—</div></div>' +
          '<div class="q-result-card"><div class="q-result-card-label">|11⟩</div><div class="q-result-card-value q-mono" id="qEntA11">—</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="q-section">' +
        '<div class="q-section-title">Entanglement Visualization</div>' +
        '<div class="q-ent-visual" id="qEntVisual">' +
          '<div class="q-ent-qubit q-ent-qubit-0" id="qEntQ0">Q₀</div>' +
          '<div class="q-ent-link" id="qEntLink"></div>' +
          '<div class="q-ent-qubit q-ent-qubit-1" id="qEntQ1">Q₁</div>' +
        '</div>' +
      '</div>' +
      '<div class="q-entropy" id="qEntEntropy" style="display:none">' +
        'Von Neumann Entropy: <span id="qEntEntropyVal">—</span>' +
      '</div>' +
      '<div class="q-row" style="justify-content:center;margin:8px 0">' +
        '<button class="q-btn" id="qEntMeasure" style="display:none">⊗ Measure</button>' +
      '</div>' +
      '<div id="qEntMeasureResult"></div>' +
      '<div class="q-explanation" id="qEntExplanation" style="display:none"></div>' +
    '</div>';
  }

  // ===== INIT =====
  function initModule() {
    // Reset state
    activeTab = 'qubit';
    gateChain = [];
    gateStepIndex = -1;
    circuitGates = [];
    circuitQubits = 2;
    circuitSelectedGate = null;
    entState = null;
    entCollapsed = false;
    blochRotation = 0;
    eventRefs = [];

    initTabs();
    initQubitTab();
    initGateTab();
    initCircuitTab();
    initEntangleTab();
  }

  // ===== TAB SWITCHING =====
  function initTabs() {
    var tabs = document.querySelectorAll('#qWrap .q-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', tabClickHandler);
    }
    eventRefs.push({ els: tabs, ev: 'click', fn: tabClickHandler });
  }

  function tabClickHandler(e) {
    var tabName = e.currentTarget.getAttribute('data-qtab');
    switchTab(tabName);
  }

  function switchTab(tabName) {
    activeTab = tabName;
    var tabs = document.querySelectorAll('#qWrap .q-tab');
    var panels = document.querySelectorAll('#qWrap .q-panel');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', tabs[i].getAttribute('data-qtab') === tabName);
    }
    for (var i = 0; i < panels.length; i++) {
      panels[i].classList.toggle('active', panels[i].getAttribute('data-qtab') === tabName);
    }
    if (tabName === 'qubit') {
      updateQubitDisplay();
      startBlochAnimation();
    } else {
      stopBlochAnimation();
    }
    if (tabName === 'circuit') {
      drawCircuit();
    }
  }

  // ===== TAB 1: QUBIT STATE =====
  function initQubitTab() {
    var theta = document.getElementById('qTheta');
    var phi = document.getElementById('qPhi');
    if (!theta || !phi) return;

    var thetaHandler = function () { updateQubitDisplay(); };
    var phiHandler = function () { updateQubitDisplay(); };
    theta.addEventListener('input', thetaHandler);
    phi.addEventListener('input', phiHandler);
    eventRefs.push({ el: theta, ev: 'input', fn: thetaHandler });
    eventRefs.push({ el: phi, ev: 'input', fn: phiHandler });

    updateQubitDisplay();
    startBlochAnimation();
  }

  function getQubitAngles() {
    var thetaEl = document.getElementById('qTheta');
    var phiEl = document.getElementById('qPhi');
    if (!thetaEl || !phiEl) return { theta: 0, phi: 0 };
    return {
      theta: parseFloat(thetaEl.value) / 1000,
      phi: parseFloat(phiEl.value) / 1000
    };
  }

  function updateQubitDisplay() {
    var angles = getQubitAngles();
    var theta = angles.theta;
    var phi = angles.phi;

    var thetaValEl = document.getElementById('qThetaVal');
    var phiValEl = document.getElementById('qPhiVal');
    if (thetaValEl) thetaValEl.textContent = roundN(theta, 3).toString();
    if (phiValEl) phiValEl.textContent = roundN(phi, 3).toString();

    // α = cos(θ/2), β = e^(iφ)·sin(θ/2)
    var alpha = new Complex(Math.cos(theta / 2), 0);
    var beta = Complex.fromPolar(Math.sin(theta / 2), phi);

    var alphaEl = document.getElementById('qAlpha');
    var betaEl = document.getElementById('qBeta');
    var stateEl = document.getElementById('qStateVec');
    if (alphaEl) alphaEl.textContent = alpha.toString();
    if (betaEl) betaEl.textContent = beta.toString();
    if (stateEl) stateEl.textContent = alpha.toString() + '|0⟩ + ' + beta.toString() + '|1⟩';

    var p0 = alpha.magnitudeSq();
    var p1 = beta.magnitudeSq();
    var p0Bar = document.getElementById('qProb0Bar');
    var p1Bar = document.getElementById('qProb1Bar');
    var p0Val = document.getElementById('qProb0Val');
    var p1Val = document.getElementById('qProb1Val');
    if (p0Bar) p0Bar.style.width = (p0 * 100) + '%';
    if (p1Bar) p1Bar.style.width = (p1 * 100) + '%';
    if (p0Val) p0Val.textContent = roundN(p0 * 100, 2) + '%';
    if (p1Val) p1Val.textContent = roundN(p1 * 100, 2) + '%';

    drawBlochSphere();
  }

  // ----- Bloch Sphere -----
  function startBlochAnimation() {
    stopBlochAnimation();
    function animate() {
      blochRotation += 0.003;
      drawBlochSphere();
      blochAnimId = requestAnimationFrame(animate);
    }
    blochAnimId = requestAnimationFrame(animate);
  }

  function stopBlochAnimation() {
    if (blochAnimId) {
      cancelAnimationFrame(blochAnimId);
      blochAnimId = null;
    }
  }

  function drawBlochSphere() {
    var canvas = document.getElementById('qBlochCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    var cx = w / 2, cy = h / 2, r = 80;

    ctx.clearRect(0, 0, w, h);

    var angles = getQubitAngles();
    var theta = angles.theta;
    var phi = angles.phi;

    // Bloch coordinates
    var bx = Math.sin(theta) * Math.cos(phi);
    var by = Math.sin(theta) * Math.sin(phi);
    var bz = Math.cos(theta);

    // 3D perspective rotation (subtle auto-rotation + tilt)
    var rot = blochRotation;
    var tilt = 0.45; // fixed tilt angle

    function project(x, y, z) {
      // Rotate around Y axis (auto-rotation)
      var x1 = x * Math.cos(rot) + z * Math.sin(rot);
      var z1 = -x * Math.sin(rot) + z * Math.cos(rot);
      // Tilt around X axis
      var y1 = y * Math.cos(tilt) - z1 * Math.sin(tilt);
      var z2 = y * Math.sin(tilt) + z1 * Math.cos(tilt);
      // Perspective
      var scale = 1.0 / (1.0 + z2 * 0.15);
      return { px: cx + x1 * r * scale, py: cy - y1 * r * scale, z: z2, scale: scale };
    }

    // Draw sphere outline (transparent feel)
    ctx.strokeStyle = 'rgba(129,140,248,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Equator circle
    ctx.strokeStyle = 'rgba(129,140,248,0.2)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (var i = 0; i <= 64; i++) {
      var ang = (i / 64) * Math.PI * 2;
      var p = project(Math.cos(ang), 0, Math.sin(ang));
      if (i === 0) ctx.moveTo(p.px, p.py);
      else ctx.lineTo(p.px, p.py);
    }
    ctx.stroke();

    // Longitude circle (front-back)
    ctx.strokeStyle = 'rgba(167,139,250,0.15)';
    ctx.beginPath();
    for (var i = 0; i <= 64; i++) {
      var ang = (i / 64) * Math.PI * 2;
      var p = project(0, Math.cos(ang), Math.sin(ang));
      if (i === 0) ctx.moveTo(p.px, p.py);
      else ctx.lineTo(p.px, p.py);
    }
    ctx.stroke();

    // Axes
    var axes = [
      { from: [-1.2, 0, 0], to: [1.2, 0, 0], label: 'X', color: 'rgba(248,113,113,0.6)' },
      { from: [0, -1.2, 0], to: [0, 1.2, 0], label: 'Z', color: 'rgba(52,211,153,0.6)' },
      { from: [0, 0, -1.2], to: [0, 0, 1.2], label: 'Y', color: 'rgba(129,140,248,0.6)' }
    ];

    for (var a = 0; a < axes.length; a++) {
      var ax = axes[a];
      var p1 = project(ax.from[0], ax.from[1], ax.from[2]);
      var p2 = project(ax.to[0], ax.to[1], ax.to[2]);
      ctx.strokeStyle = ax.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(p1.px, p1.py);
      ctx.lineTo(p2.px, p2.py);
      ctx.stroke();
      ctx.setLineDash([]);

      // Labels
      ctx.font = '10px Inter';
      ctx.fillStyle = ax.color;
      ctx.fillText(ax.label, p2.px + 4, p2.py - 4);
    }

    // |0⟩ and |1⟩ labels at poles
    var northP = project(0, 1, 0);
    var southP = project(0, -1, 0);
    ctx.font = '11px JetBrains Mono';
    ctx.fillStyle = 'rgba(52,211,153,0.8)';
    ctx.fillText('|0⟩', northP.px + 6, northP.py - 4);
    ctx.fillStyle = 'rgba(248,113,113,0.8)';
    ctx.fillText('|1⟩', southP.px + 6, southP.py + 12);

    // State vector arrow
    var origin = project(0, 0, 0);
    var tip = project(bx, bz, by); // Note: Bloch Z is our Y-axis visually

    // Arrow line
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(129,140,248,0.6)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(origin.px, origin.py);
    ctx.lineTo(tip.px, tip.py);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Arrow tip (dot)
    ctx.fillStyle = '#a78bfa';
    ctx.shadowColor = 'rgba(167,139,250,0.8)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(tip.px, tip.py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Glow around tip
    var grad = ctx.createRadialGradient(tip.px, tip.py, 0, tip.px, tip.py, 14);
    grad.addColorStop(0, 'rgba(129,140,248,0.3)');
    grad.addColorStop(1, 'rgba(129,140,248,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(tip.px, tip.py, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  // ===== TAB 2: GATE CALCULATOR =====
  function initGateTab() {
    // Gate buttons
    var gateGrid = document.getElementById('qGateGrid');
    if (gateGrid) {
      gateGrid.addEventListener('click', gateGridClick);
      eventRefs.push({ el: gateGrid, ev: 'click', fn: gateGridClick });
    }

    // Initial state select
    var initSel = document.getElementById('qGateInit');
    if (initSel) {
      initSel.addEventListener('change', gateInitChange);
      eventRefs.push({ el: initSel, ev: 'change', fn: gateInitChange });
    }

    // Rotation angle slider
    var angleSlider = document.getElementById('qGateAngle');
    if (angleSlider) {
      angleSlider.addEventListener('input', gateAngleChange);
      eventRefs.push({ el: angleSlider, ev: 'input', fn: gateAngleChange });
    }

    // Buttons
    var stepBtn = document.getElementById('qGateStep');
    var runBtn = document.getElementById('qGateRunAll');
    var clearBtn = document.getElementById('qGateClear');
    if (stepBtn) { stepBtn.addEventListener('click', gateStepClick); eventRefs.push({ el: stepBtn, ev: 'click', fn: gateStepClick }); }
    if (runBtn) { runBtn.addEventListener('click', gateRunAllClick); eventRefs.push({ el: runBtn, ev: 'click', fn: gateRunAllClick }); }
    if (clearBtn) { clearBtn.addEventListener('click', gateClearClick); eventRefs.push({ el: clearBtn, ev: 'click', fn: gateClearClick }); }
  }

  function gateGridClick(e) {
    var btn = e.target.closest('[data-gate]');
    if (!btn) return;
    var gateId = btn.getAttribute('data-gate');

    // Show/hide rotation slider for Rx/Ry/Rz
    var angleRow = document.getElementById('qGateAngleRow');
    if (gateId === 'Rx' || gateId === 'Ry' || gateId === 'Rz') {
      if (angleRow) angleRow.style.display = 'flex';
      showGateMatrix(gateId);
    } else {
      if (angleRow) angleRow.style.display = 'none';
    }

    // Add to chain
    var gate;
    if (gateId === 'Rx') gate = { id: 'Rx', angle: gateRotAngle, label: 'Rx(' + roundN(gateRotAngle, 2) + ')' };
    else if (gateId === 'Ry') gate = { id: 'Ry', angle: gateRotAngle, label: 'Ry(' + roundN(gateRotAngle, 2) + ')' };
    else if (gateId === 'Rz') gate = { id: 'Rz', angle: gateRotAngle, label: 'Rz(' + roundN(gateRotAngle, 2) + ')' };
    else gate = { id: gateId, label: gateId };

    gateChain.push(gate);
    gateStepIndex = -1;
    renderGateChain();
    showGateMatrix(gateId);
  }

  function gateInitChange() {
    var sel = document.getElementById('qGateInit');
    var customWrap = document.getElementById('qGateCustomWrap');
    if (!sel) return;
    gateInitialState = sel.value;
    if (customWrap) {
      customWrap.style.display = sel.value === 'custom' ? 'flex' : 'none';
    }
    gateStepIndex = -1;
  }

  function gateAngleChange() {
    var slider = document.getElementById('qGateAngle');
    var valEl = document.getElementById('qGateAngleVal');
    if (!slider) return;
    gateRotAngle = parseFloat(slider.value) / 1000;
    if (valEl) {
      var piRatio = gateRotAngle / Math.PI;
      if (Math.abs(piRatio - Math.round(piRatio)) < 0.01) {
        var r = Math.round(piRatio);
        valEl.textContent = r === 0 ? '0' : (r === 1 ? 'π' : (r === -1 ? '-π' : r + 'π'));
      } else {
        valEl.textContent = roundN(gateRotAngle, 3).toString();
      }
    }
  }

  function getGateMatrix(g) {
    if (g.id === 'Rx') return gateRx(g.angle || gateRotAngle);
    if (g.id === 'Ry') return gateRy(g.angle || gateRotAngle);
    if (g.id === 'Rz') return gateRz(g.angle || gateRotAngle);
    return GATES[g.id];
  }

  function showGateMatrix(gateId) {
    var matWrap = document.getElementById('qGateMatrix');
    if (!matWrap) return;
    matWrap.style.visibility = 'visible';

    var g;
    if (gateId === 'Rx') g = gateRx(gateRotAngle);
    else if (gateId === 'Ry') g = gateRy(gateRotAngle);
    else if (gateId === 'Rz') g = gateRz(gateRotAngle);
    else g = GATES[gateId];

    if (!g) return;
    var m = g.matrix;
    var html = '';
    for (var i = 0; i < m.length; i++) {
      for (var j = 0; j < m[i].length; j++) {
        html += '<div class="q-matrix-cell">' + m[i][j].toString() + '</div>';
      }
    }
    matWrap.innerHTML = html;
  }

  function getInitialStateVec() {
    switch (gateInitialState) {
      case '0': return [C1, C0];
      case '1': return [C0, C1];
      case '+': return [new Complex(SQRT2INV, 0), new Complex(SQRT2INV, 0)];
      case '-': return [new Complex(SQRT2INV, 0), new Complex(-SQRT2INV, 0)];
      case 'custom':
        var aEl = document.getElementById('qGateCustomAlpha');
        var bEl = document.getElementById('qGateCustomBeta');
        var a = parseFloat(aEl ? aEl.value : '1') || 0;
        var b = parseFloat(bEl ? bEl.value : '0') || 0;
        // Normalize
        var norm = Math.sqrt(a * a + b * b);
        if (norm < 1e-10) return [C1, C0];
        return [new Complex(a / norm, 0), new Complex(b / norm, 0)];
      default: return [C1, C0];
    }
  }

  function renderGateChain() {
    var chainEl = document.getElementById('qGateChain');
    if (!chainEl) return;

    if (gateChain.length === 0) {
      chainEl.innerHTML = '<span class="q-chain-empty">Click gates above to build a chain</span>';
      return;
    }

    var html = '';
    for (var i = 0; i < gateChain.length; i++) {
      var hl = (i <= gateStepIndex) ? ' highlight' : '';
      html += '<span class="q-chain-item' + hl + '" data-ci="' + i + '">' + gateChain[i].label + '</span>';
    }
    chainEl.innerHTML = html;

    // Click to remove
    var items = chainEl.querySelectorAll('.q-chain-item');
    for (var i = 0; i < items.length; i++) {
      items[i].addEventListener('click', function (e) {
        var idx = parseInt(e.currentTarget.getAttribute('data-ci'));
        gateChain.splice(idx, 1);
        gateStepIndex = -1;
        renderGateChain();
        updateGateResult(-1);
      });
    }
  }

  function gateStepClick() {
    if (gateChain.length === 0) return;
    gateStepIndex++;
    if (gateStepIndex >= gateChain.length) gateStepIndex = 0;
    renderGateChain();
    updateGateResult(gateStepIndex);
  }

  function gateRunAllClick() {
    if (gateChain.length === 0) return;
    gateStepIndex = gateChain.length - 1;
    renderGateChain();
    updateGateResult(gateStepIndex);
  }

  function gateClearClick() {
    gateChain = [];
    gateStepIndex = -1;
    renderGateChain();
    var res = document.getElementById('qGateResult');
    var p0 = document.getElementById('qGateP0');
    var p1 = document.getElementById('qGateP1');
    if (res) res.textContent = '—';
    if (p0) p0.textContent = '—';
    if (p1) p1.textContent = '—';
  }

  function updateGateResult(upToStep) {
    var state = getInitialStateVec();

    if (upToStep < 0) {
      var res = document.getElementById('qGateResult');
      var p0 = document.getElementById('qGateP0');
      var p1 = document.getElementById('qGateP1');
      if (res) res.textContent = stateToString(state);
      if (p0) p0.textContent = roundN(state[0].magnitudeSq() * 100, 2) + '%';
      if (p1) p1.textContent = roundN(state[1].magnitudeSq() * 100, 2) + '%';
      return;
    }

    for (var i = 0; i <= upToStep && i < gateChain.length; i++) {
      var gInfo = getGateMatrix(gateChain[i]);
      if (gInfo) state = applyGate(state, gInfo.matrix);
    }

    var res = document.getElementById('qGateResult');
    var p0El = document.getElementById('qGateP0');
    var p1El = document.getElementById('qGateP1');
    if (res) res.textContent = stateToString(state);
    if (p0El) p0El.textContent = roundN(state[0].magnitudeSq() * 100, 2) + '%';
    if (p1El) p1El.textContent = roundN(state[1].magnitudeSq() * 100, 2) + '%';
  }

  // ===== TAB 3: CIRCUIT SIMULATOR =====
  function initCircuitTab() {
    // Qubit count buttons
    var btn2 = document.getElementById('qCirc2Q');
    var btn3 = document.getElementById('qCirc3Q');
    if (btn2) { btn2.addEventListener('click', function () { setCircuitQubits(2); }); }
    if (btn3) { btn3.addEventListener('click', function () { setCircuitQubits(3); }); }

    // Palette
    var palette = document.getElementById('qCircPalette');
    if (palette) {
      palette.addEventListener('click', circPaletteClick);
      eventRefs.push({ el: palette, ev: 'click', fn: circPaletteClick });
    }

    // Canvas click
    var canvas = document.getElementById('qCircCanvas');
    if (canvas) {
      canvas.addEventListener('click', circCanvasClick);
      eventRefs.push({ el: canvas, ev: 'click', fn: circCanvasClick });
    }

    // Run / Reset
    var runBtn = document.getElementById('qCircRun');
    var resetBtn = document.getElementById('qCircReset');
    if (runBtn) { runBtn.addEventListener('click', circRun); eventRefs.push({ el: runBtn, ev: 'click', fn: circRun }); }
    if (resetBtn) { resetBtn.addEventListener('click', circReset); eventRefs.push({ el: resetBtn, ev: 'click', fn: circReset }); }

    drawCircuit();
  }

  function setCircuitQubits(n) {
    circuitQubits = n;
    circuitGates = [];
    circuitSelectedGate = null;
    var btn2 = document.getElementById('qCirc2Q');
    var btn3 = document.getElementById('qCirc3Q');
    if (btn2) btn2.classList.toggle('active', n === 2);
    if (btn3) btn3.classList.toggle('active', n === 3);

    var canvas = document.getElementById('qCircCanvas');
    if (canvas) {
      canvas.height = n === 3 ? 220 : 160;
    }

    var resultSection = document.getElementById('qCircResultSection');
    if (resultSection) resultSection.style.display = 'none';

    drawCircuit();
  }

  function circPaletteClick(e) {
    var btn = e.target.closest('[data-cg]');
    if (!btn) return;
    var gate = btn.getAttribute('data-cg');

    // Toggle selection
    var allBtns = document.querySelectorAll('#qCircPalette .q-palette-btn');
    for (var i = 0; i < allBtns.length; i++) allBtns[i].classList.remove('selected');

    if (circuitSelectedGate === gate) {
      circuitSelectedGate = null;
    } else {
      circuitSelectedGate = gate;
      btn.classList.add('selected');
    }
  }

  function circCanvasClick(e) {
    if (!circuitSelectedGate) return;

    var canvas = document.getElementById('qCircCanvas');
    if (!canvas) return;
    var rect = canvas.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;

    var wireSpacing = circuitQubits === 3 ? 60 : 65;
    var wireStartY = circuitQubits === 3 ? 40 : 45;
    var colStartX = 80;
    var colWidth = 50;

    // Find which qubit (wire)
    var qubit = -1;
    for (var q = 0; q < circuitQubits; q++) {
      var wy = wireStartY + q * wireSpacing;
      if (Math.abs(my - wy) < 25) { qubit = q; break; }
    }
    if (qubit < 0) return;

    // Find column
    var col = Math.floor((mx - colStartX + colWidth / 2) / colWidth);
    if (col < 0) col = 0;
    if (col >= circuitMaxCols) col = circuitMaxCols - 1;

    var g = circuitSelectedGate;

    // Handle CNOT: needs control + target on different qubits
    if (g === 'CNOT') {
      if (circuitQubits < 2) return;
      var control = qubit;
      var target = (qubit + 1) % circuitQubits;
      // Check if something is already at this position
      circuitGates = circuitGates.filter(function (cg) {
        return !(cg.col === col && (cg.qubit === control || cg.qubit === target ||
          (cg.target !== undefined && (cg.target === control || cg.target === target))));
      });
      circuitGates.push({ gate: 'CNOT', qubit: control, target: target, col: col });
    } else if (g === 'SWAP') {
      if (circuitQubits < 2) return;
      var q1 = qubit;
      var q2 = (qubit + 1) % circuitQubits;
      circuitGates = circuitGates.filter(function (cg) {
        return !(cg.col === col && (cg.qubit === q1 || cg.qubit === q2 ||
          (cg.target !== undefined && (cg.target === q1 || cg.target === q2))));
      });
      circuitGates.push({ gate: 'SWAP', qubit: q1, target: q2, col: col });
    } else {
      // Single qubit gate - remove existing at same position
      circuitGates = circuitGates.filter(function (cg) {
        return !(cg.col === col && cg.qubit === qubit && cg.target === undefined);
      });
      circuitGates.push({ gate: g, qubit: qubit, col: col });
    }

    drawCircuit();
  }

  function drawCircuit() {
    var canvas = document.getElementById('qCircCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    var wireSpacing = circuitQubits === 3 ? 60 : 65;
    var wireStartY = circuitQubits === 3 ? 40 : 45;
    var colStartX = 80;
    var colWidth = 50;

    // Draw wires
    for (var q = 0; q < circuitQubits; q++) {
      var wy = wireStartY + q * wireSpacing;

      // Qubit label
      ctx.font = '13px JetBrains Mono';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'right';
      ctx.fillText('q' + q + ' |0⟩', colStartX - 12, wy + 4);

      // Wire line
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(colStartX, wy);
      ctx.lineTo(colStartX + circuitMaxCols * colWidth, wy);
      ctx.stroke();
    }

    // Column guides
    for (var c = 0; c < circuitMaxCols; c++) {
      var cx = colStartX + c * colWidth;
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, wireStartY - 20);
      ctx.lineTo(cx, wireStartY + (circuitQubits - 1) * wireSpacing + 20);
      ctx.stroke();
    }

    // Draw gates
    for (var i = 0; i < circuitGates.length; i++) {
      var g = circuitGates[i];
      var gx = colStartX + g.col * colWidth;
      var gy = wireStartY + g.qubit * wireSpacing;

      if (g.gate === 'CNOT') {
        var ty = wireStartY + g.target * wireSpacing;
        // Vertical line
        ctx.strokeStyle = '#818cf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx, ty);
        ctx.stroke();

        // Control dot
        ctx.fillStyle = '#818cf8';
        ctx.beginPath();
        ctx.arc(gx, gy, 5, 0, Math.PI * 2);
        ctx.fill();

        // Target ⊕
        ctx.strokeStyle = '#818cf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(gx, ty, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(gx, ty - 12);
        ctx.lineTo(gx, ty + 12);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(gx - 12, ty);
        ctx.lineTo(gx + 12, ty);
        ctx.stroke();
      } else if (g.gate === 'SWAP') {
        var ty = wireStartY + g.target * wireSpacing;
        // Vertical line
        ctx.strokeStyle = '#a78bfa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx, ty);
        ctx.stroke();

        // × symbols
        var drawX = function (x, y) {
          ctx.strokeStyle = '#a78bfa';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x - 7, y - 7);
          ctx.lineTo(x + 7, y + 7);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x + 7, y - 7);
          ctx.lineTo(x - 7, y + 7);
          ctx.stroke();
        };
        drawX(gx, gy);
        drawX(gx, ty);
      } else if (g.gate === 'M') {
        // Measure symbol
        ctx.fillStyle = 'rgba(248,113,113,0.2)';
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 1.5;
        roundRect(ctx, gx - 16, gy - 16, 32, 32, 6);
        ctx.fill();
        ctx.stroke();
        // Meter arc
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(gx, gy + 4, 8, Math.PI, 0);
        ctx.stroke();
        // Arrow
        ctx.beginPath();
        ctx.moveTo(gx, gy + 4);
        ctx.lineTo(gx + 6, gy - 8);
        ctx.stroke();
      } else {
        // Standard gate box
        var colors = {
          'H': '#818cf8', 'X': '#f87171', 'Y': '#34d399', 'Z': '#fbbf24',
          'S': '#a78bfa', 'T': '#f472b6'
        };
        var color = colors[g.gate] || '#818cf8';
        ctx.fillStyle = color + '30';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        roundRect(ctx, gx - 16, gy - 16, 32, 32, 6);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 13px JetBrains Mono';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(g.gate, gx, gy);
        ctx.textBaseline = 'alphabetic';
      }
    }

    ctx.textAlign = 'left';
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function circRun() {
    var nq = circuitQubits;
    var dim = Math.pow(2, nq);

    // Initial state |00...0⟩
    var state = [];
    for (var i = 0; i < dim; i++) state.push(i === 0 ? C1 : C0);

    // Sort gates by column
    var sorted = circuitGates.slice().sort(function (a, b) { return a.col - b.col; });

    var measurements = {}; // qubit -> measured column

    for (var gi = 0; gi < sorted.length; gi++) {
      var g = sorted[gi];

      if (g.gate === 'M') {
        // Measurement: collapse qubit
        state = measureQubit(state, g.qubit, nq);
        measurements[g.qubit] = g.col;
        continue;
      }

      if (g.gate === 'CNOT') {
        state = applyCNOT(state, g.qubit, g.target, nq);
      } else if (g.gate === 'SWAP') {
        state = applySWAP(state, g.qubit, g.target, nq);
      } else {
        // Single qubit gate
        var gInfo = GATES[g.gate];
        if (!gInfo) continue;
        state = applySingleGate(state, gInfo.matrix, g.qubit, nq);
      }
    }

    // Display results
    var resultSection = document.getElementById('qCircResultSection');
    if (resultSection) resultSection.style.display = 'block';

    var stateEl = document.getElementById('qCircResultState');
    if (stateEl) stateEl.textContent = stateToString(state);

    // Probability bars
    var barsEl = document.getElementById('qCircProbBars');
    if (barsEl) {
      var html = '';
      var barColors = ['#818cf8', '#a78bfa', '#34d399', '#f87171', '#fbbf24', '#f472b6', '#38bdf8', '#fb923c'];
      for (var i = 0; i < dim; i++) {
        var prob = state[i].magnitudeSq();
        var label = '|' + i.toString(2).padStart(nq, '0') + '⟩';
        var color = barColors[i % barColors.length];
        html += '<div class="q-prob-row">' +
          '<span class="q-prob-label">' + label + '</span>' +
          '<div class="q-prob-bar-bg"><div class="q-prob-bar" style="width:' + (prob * 100) + '%;background:' + color + ';transition:width .5s cubic-bezier(.4,0,.2,1)"></div></div>' +
          '<span class="q-prob-val">' + roundN(prob * 100, 2) + '%</span>' +
        '</div>';
      }
      barsEl.innerHTML = html;
      // Trigger animation by re-reading layout
      barsEl.offsetHeight;
    }
  }

  function applySingleGate(state, gateMatrix, qubit, nQubits) {
    var dim = state.length;
    var result = [];
    for (var i = 0; i < dim; i++) result.push(C0);

    var blockSize = Math.pow(2, nQubits - qubit);
    var halfBlock = blockSize / 2;

    for (var i = 0; i < dim; i++) {
      var bitVal = (i >> (nQubits - 1 - qubit)) & 1;
      var partner = i ^ (1 << (nQubits - 1 - qubit));

      if (bitVal === 0) {
        // |0⟩ component
        result[i] = result[i].add(gateMatrix[0][0].mul(state[i]));
        result[i] = result[i].add(gateMatrix[0][1].mul(state[partner]));
        result[partner] = result[partner].add(gateMatrix[1][0].mul(state[i]));
        result[partner] = result[partner].add(gateMatrix[1][1].mul(state[partner]));
      }
    }
    return result;
  }

  function applyCNOT(state, control, target, nQubits) {
    var dim = state.length;
    var result = [];
    for (var i = 0; i < dim; i++) result.push(C0);

    for (var i = 0; i < dim; i++) {
      var cBit = (i >> (nQubits - 1 - control)) & 1;
      if (cBit === 0) {
        result[i] = result[i].add(state[i]);
      } else {
        // Flip target bit
        var flipped = i ^ (1 << (nQubits - 1 - target));
        result[flipped] = result[flipped].add(state[i]);
      }
    }
    return result;
  }

  function applySWAP(state, q1, q2, nQubits) {
    var dim = state.length;
    var result = [];
    for (var i = 0; i < dim; i++) result.push(C0);

    for (var i = 0; i < dim; i++) {
      var b1 = (i >> (nQubits - 1 - q1)) & 1;
      var b2 = (i >> (nQubits - 1 - q2)) & 1;
      if (b1 === b2) {
        result[i] = state[i];
      } else {
        var swapped = i ^ (1 << (nQubits - 1 - q1)) ^ (1 << (nQubits - 1 - q2));
        result[swapped] = state[i];
      }
    }
    return result;
  }

  function measureQubit(state, qubit, nQubits) {
    var dim = state.length;
    // Calculate probability of |0⟩ on this qubit
    var p0 = 0;
    for (var i = 0; i < dim; i++) {
      var bit = (i >> (nQubits - 1 - qubit)) & 1;
      if (bit === 0) p0 += state[i].magnitudeSq();
    }
    // Random collapse
    var outcome = Math.random() < p0 ? 0 : 1;
    var norm = outcome === 0 ? Math.sqrt(p0) : Math.sqrt(1 - p0);

    var result = [];
    for (var i = 0; i < dim; i++) {
      var bit = (i >> (nQubits - 1 - qubit)) & 1;
      if (bit === outcome) {
        result.push(state[i].scale(1 / norm));
      } else {
        result.push(C0);
      }
    }
    return result;
  }

  function circReset() {
    circuitGates = [];
    circuitSelectedGate = null;
    var allBtns = document.querySelectorAll('#qCircPalette .q-palette-btn');
    for (var i = 0; i < allBtns.length; i++) allBtns[i].classList.remove('selected');
    var resultSection = document.getElementById('qCircResultSection');
    if (resultSection) resultSection.style.display = 'none';
    drawCircuit();
  }

  // ===== TAB 4: ENTANGLEMENT LAB =====
  function initEntangleTab() {
    // Bell state buttons
    var bellGrid = document.getElementById('qBellGrid');
    if (bellGrid) {
      bellGrid.addEventListener('click', bellClick);
      eventRefs.push({ el: bellGrid, ev: 'click', fn: bellClick });
    }

    // Measure button
    var measureBtn = document.getElementById('qEntMeasure');
    if (measureBtn) {
      measureBtn.addEventListener('click', entMeasure);
      eventRefs.push({ el: measureBtn, ev: 'click', fn: entMeasure });
    }
  }

  var BELL_STATES = {
    'phiP': {
      label: '|Φ⁺⟩',
      state: [new Complex(SQRT2INV, 0), C0, C0, new Complex(SQRT2INV, 0)],
      desc: '<strong>|Φ⁺⟩ = (|00⟩ + |11⟩) / √2</strong><br><br>The Bell state Phi-plus. When measured, both qubits always yield the same result: both |0⟩ or both |1⟩, each with 50% probability. This is the maximally entangled state commonly used in quantum teleportation and superdense coding protocols.'
    },
    'phiM': {
      label: '|Φ⁻⟩',
      state: [new Complex(SQRT2INV, 0), C0, C0, new Complex(-SQRT2INV, 0)],
      desc: '<strong>|Φ⁻⟩ = (|00⟩ - |11⟩) / √2</strong><br><br>The Bell state Phi-minus. Similar to Φ⁺, both qubits yield the same outcome, but with a relative phase difference of π. This state is distinguishable from Φ⁺ only through interference measurements, not by individual qubit measurements.'
    },
    'psiP': {
      label: '|Ψ⁺⟩',
      state: [C0, new Complex(SQRT2INV, 0), new Complex(SQRT2INV, 0), C0],
      desc: '<strong>|Ψ⁺⟩ = (|01⟩ + |10⟩) / √2</strong><br><br>The Bell state Psi-plus. When measured, the qubits always yield opposite results: if one is |0⟩ the other is |1⟩ and vice versa. This is the symmetric anti-correlated Bell state.'
    },
    'psiM': {
      label: '|Ψ⁻⟩',
      state: [C0, new Complex(SQRT2INV, 0), new Complex(-SQRT2INV, 0), C0],
      desc: '<strong>|Ψ⁻⟩ = (|01⟩ - |10⟩) / √2</strong><br><br>The Bell state Psi-minus, also known as the singlet state. The qubits are anti-correlated (opposite results) with a relative phase of π. This state is unique among Bell states as the only one antisymmetric under particle exchange, making it fundamental in quantum key distribution (BB84/E91).'
    }
  };

  var activeBell = null;

  function bellClick(e) {
    var btn = e.target.closest('[data-bell]');
    if (!btn) return;
    var bellId = btn.getAttribute('data-bell');
    activeBell = bellId;
    entCollapsed = false;

    // Update button states
    var allBtns = document.querySelectorAll('#qBellGrid .q-bell-btn');
    for (var i = 0; i < allBtns.length; i++) {
      allBtns[i].classList.toggle('active', allBtns[i].getAttribute('data-bell') === bellId);
    }

    var bell = BELL_STATES[bellId];
    entState = bell.state.slice();

    updateEntanglementDisplay();

    // Show measure button
    var measureBtn = document.getElementById('qEntMeasure');
    if (measureBtn) measureBtn.style.display = 'inline-block';

    // Clear measure result
    var resultEl = document.getElementById('qEntMeasureResult');
    if (resultEl) resultEl.innerHTML = '';

    // Show explanation
    var explEl = document.getElementById('qEntExplanation');
    if (explEl) {
      explEl.style.display = 'block';
      explEl.innerHTML = bell.desc;
    }
  }

  function updateEntanglementDisplay() {
    if (!entState) return;

    // State vector display
    var stateEl = document.getElementById('qEntState');
    if (stateEl) stateEl.textContent = stateToString(entState);

    // Amplitudes
    var ampsEl = document.getElementById('qEntAmps');
    if (ampsEl) ampsEl.style.display = 'flex';

    var labels = ['qEntA00', 'qEntA01', 'qEntA10', 'qEntA11'];
    for (var i = 0; i < 4; i++) {
      var el = document.getElementById(labels[i]);
      if (el) el.textContent = entState[i].toString();
    }

    // Entanglement visualization
    var linkEl = document.getElementById('qEntLink');
    if (linkEl) {
      linkEl.className = 'q-ent-link ' + (entCollapsed ? 'collapsed' : 'entangled');
    }

    // Von Neumann entropy
    var entropyEl = document.getElementById('qEntEntropy');
    var entropyVal = document.getElementById('qEntEntropyVal');
    if (entropyEl) entropyEl.style.display = 'block';
    if (entropyVal) {
      var S = vonNeumannEntropy(entState);
      entropyVal.textContent = 'S = ' + roundN(S, 4) + (S > 0.99 ? ' (maximally entangled)' : (S < 0.01 ? ' (separable / collapsed)' : ''));
    }

    // Qubit labels
    var q0El = document.getElementById('qEntQ0');
    var q1El = document.getElementById('qEntQ1');
    if (entCollapsed) {
      // Show measured values
      for (var i = 0; i < 4; i++) {
        if (entState[i].magnitude() > 0.9) {
          var bits = i.toString(2).padStart(2, '0');
          if (q0El) q0El.textContent = '|' + bits[0] + '⟩';
          if (q1El) q1El.textContent = '|' + bits[1] + '⟩';
          break;
        }
      }
    } else {
      if (q0El) q0El.textContent = 'Q₀';
      if (q1El) q1El.textContent = 'Q₁';
    }
  }

  function vonNeumannEntropy(state4) {
    // For a 2-qubit pure state, compute reduced density matrix of qubit 0
    // ρ_A = Tr_B(|ψ⟩⟨ψ|)
    // For state [a00, a01, a10, a11]:
    // ρ_00 = |a00|² + |a01|²
    // ρ_01 = a00·a10* + a01·a11*
    // ρ_10 = a10·a00* + a11·a01*
    // ρ_11 = |a10|² + |a11|²

    var a00 = state4[0], a01 = state4[1], a10 = state4[2], a11 = state4[3];

    var rho00 = a00.magnitudeSq() + a01.magnitudeSq();
    var rho11 = a10.magnitudeSq() + a11.magnitudeSq();
    var rho01 = a00.mul(a10.conjugate()).add(a01.mul(a11.conjugate()));

    // Eigenvalues of 2x2 density matrix
    var trace = rho00 + rho11;
    var det = rho00 * rho11 - rho01.magnitudeSq();

    var disc = trace * trace / 4 - det;
    if (disc < 0) disc = 0;
    var sqrtDisc = Math.sqrt(disc);

    var lambda1 = trace / 2 + sqrtDisc;
    var lambda2 = trace / 2 - sqrtDisc;

    // S = -Σ λ_i log2(λ_i)
    var S = 0;
    if (lambda1 > 1e-12) S -= lambda1 * Math.log2(lambda1);
    if (lambda2 > 1e-12) S -= lambda2 * Math.log2(lambda2);

    return S;
  }

  function entMeasure() {
    if (!entState) return;
    entCollapsed = true;

    // Compute probabilities for each basis state
    var probs = [];
    for (var i = 0; i < 4; i++) {
      probs.push(entState[i].magnitudeSq());
    }

    // Random collapse
    var r = Math.random();
    var cumulative = 0;
    var outcome = 0;
    for (var i = 0; i < 4; i++) {
      cumulative += probs[i];
      if (r < cumulative) { outcome = i; break; }
    }

    // Collapse state
    entState = [C0, C0, C0, C0];
    entState[outcome] = C1;

    updateEntanglementDisplay();

    // Show result
    var bits = outcome.toString(2).padStart(2, '0');
    var resultEl = document.getElementById('qEntMeasureResult');
    if (resultEl) {
      resultEl.innerHTML = '<div class="q-measure-result" style="background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.25);color:#34d399">' +
        'Measurement Result: <strong>|' + bits + '⟩</strong><br>' +
        '<span style="font-size:12px;color:#94a3b8">Qubit 0 → |' + bits[0] + '⟩ &nbsp;·&nbsp; Qubit 1 → |' + bits[1] + '⟩</span>' +
      '</div>';
    }
  }

  // ===== DESTROY =====
  function destroyModule() {
    stopBlochAnimation();
    if (entGlowAnimId) cancelAnimationFrame(entGlowAnimId);
    entGlowAnimId = null;

    // We won't manually remove listeners since the container gets cleared anyway
    eventRefs = [];
    gateChain = [];
    circuitGates = [];
    entState = null;
    activeBell = null;
  }

  // ===== Register Module =====
  window.CalcModules['quantum'] = {
    name: 'Quantum Computing',
    render: renderModule,
    init: initModule,
    destroy: destroyModule
  };

})();
