/**
 * Scientific Calculator Module
 * Refactored from original script.js into modular architecture.
 */
(function () {
  'use strict';
  window.CalcModules = window.CalcModules || {};

  var state = {
    expression: '',
    displayExpr: '',
    result: '0',
    lastAnswer: 0,
    isShift: false,
    isDeg: true,
    memory: 0,
    hasMemory: false,
    history: [],
    justEvaluated: false
  };

  var keyHandler = null;

  function toRad(deg) { return deg * Math.PI / 180; }
  function toDeg(rad) { return rad * 180 / Math.PI; }

  function factorial(n) {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    if (n > 170) return Infinity;
    if (!Number.isInteger(n)) return gammaApprox(n + 1);
    var r = 1;
    for (var i = 2; i <= n; i++) r *= i;
    return r;
  }

  function gammaApprox(z) {
    if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gammaApprox(1 - z));
    z -= 1;
    var g = 7;
    var c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    var x = c[0];
    for (var i = 1; i < g + 2; i++) x += c[i] / (z + i);
    var t = z + g + 0.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
  }

  var fmt = function (n) { return window.CalcUtils.formatNumber(n); };

  function safeEval(expr) {
    var jsExpr = expr
      .replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')
      .replace(/π/g, '(' + Math.PI + ')')
      .replace(/e(?![x])/g, '(' + Math.E + ')')
      .replace(/ANS/g, '(' + state.lastAnswer + ')');
    jsExpr = jsExpr.replace(/(\d)([\(π])/g, '$1*$2');
    jsExpr = jsExpr.replace(/(\))(\d)/g, '$1*$2');
    jsExpr = jsExpr.replace(/(\))(\()/g, '$1*$2');

    var funcPattern = /(sin⁻¹|cos⁻¹|tan⁻¹|sinh|cosh|tanh|sin|cos|tan|log|ln|√|∛|abs|exp|tenPow)\(([^()]*)\)/;
    var safety = 0;
    while (funcPattern.test(jsExpr) && safety < 50) {
      jsExpr = jsExpr.replace(funcPattern, function (match, fn, inner) {
        var val = safeEvalSimple(inner);
        if (isNaN(val) && fn !== 'abs') return 'NaN';
        switch (fn) {
          case 'sin': return state.isDeg ? Math.sin(toRad(val)) : Math.sin(val);
          case 'cos': return state.isDeg ? Math.cos(toRad(val)) : Math.cos(val);
          case 'tan': return state.isDeg ? Math.tan(toRad(val)) : Math.tan(val);
          case 'sin⁻¹': return (val < -1 || val > 1) ? 'NaN' : (state.isDeg ? toDeg(Math.asin(val)) : Math.asin(val));
          case 'cos⁻¹': return (val < -1 || val > 1) ? 'NaN' : (state.isDeg ? toDeg(Math.acos(val)) : Math.acos(val));
          case 'tan⁻¹': return state.isDeg ? toDeg(Math.atan(val)) : Math.atan(val);
          case 'sinh': return Math.sinh(val);
          case 'cosh': return Math.cosh(val);
          case 'tanh': return Math.tanh(val);
          case 'log': return val <= 0 ? 'NaN' : Math.log10(val);
          case 'ln': return val <= 0 ? 'NaN' : Math.log(val);
          case '√': return val < 0 ? 'NaN' : Math.sqrt(val);
          case '∛': return Math.cbrt(val);
          case 'abs': return Math.abs(val);
          case 'exp': return Math.exp(val);
          case 'tenPow': return Math.pow(10, val);
          default: return val;
        }
      });
      safety++;
    }
    jsExpr = jsExpr.replace(/([\d.]+)!/g, function (_, n) { return factorial(parseFloat(n)); });
    jsExpr = jsExpr.replace(/\^/g, '**');
    return safeEvalSimple(jsExpr);
  }

  function safeEvalSimple(expr) {
    try {
      if (/[^0-9+\-*/().eE\s]/.test(expr.replace(/Infinity/g, '').replace(/NaN/g, ''))) return NaN;
      var result = Function('"use strict"; return (' + expr + ')')();
      return typeof result === 'number' ? result : NaN;
    } catch (e) { return NaN; }
  }

  function $(id) { return document.getElementById(id); }

  function updateDisplay() {
    var exprEl = $('sciExprDisplay');
    var resEl = $('sciResultDisplay');
    if (!exprEl || !resEl) return;
    exprEl.textContent = state.displayExpr;
    resEl.textContent = state.result;
    resEl.classList.toggle('shrink', state.result.length > 14);
    resEl.classList.toggle('error', state.result === 'Error');
    exprEl.scrollLeft = exprEl.scrollWidth;
    resEl.scrollLeft = resEl.scrollWidth;
  }

  function appendToExpression(raw, display) {
    if (state.justEvaluated) {
      if (/^\d$/.test(raw)) { state.expression = ''; state.displayExpr = ''; }
      state.justEvaluated = false;
    }
    state.expression += raw;
    state.displayExpr += display || raw;
    state.result = '0';
    updateDisplay();
  }

  function handleNumber(v) { appendToExpression(v, v); livePreview(); }

  function handleOperator(raw, display) {
    state.justEvaluated = false;
    if (state.expression === '' && state.lastAnswer !== 0) {
      state.expression = String(state.lastAnswer);
      state.displayExpr = String(state.lastAnswer);
    }
    appendToExpression(raw, display);
  }

  function handleFunction(fnRaw, fnDisplay) {
    if (state.justEvaluated) {
      state.expression = fnRaw + '(' + state.lastAnswer;
      state.displayExpr = fnDisplay + '(' + fmt(state.lastAnswer);
      state.justEvaluated = false;
      state.result = '0';
      updateDisplay();
      livePreview();
      return;
    }
    appendToExpression(fnRaw + '(', fnDisplay + '(');
  }

  function handleEquals() {
    if (state.expression === '') return;
    var open = (state.expression.match(/\(/g) || []).length;
    var close = (state.expression.match(/\)/g) || []).length;
    for (var i = 0; i < open - close; i++) { state.expression += ')'; state.displayExpr += ')'; }
    var result = safeEval(state.expression);
    var formatted = fmt(result);
    addHistory(state.displayExpr, formatted);
    state.result = formatted;
    if (!isNaN(result) && isFinite(result)) state.lastAnswer = result;
    state.justEvaluated = true;
    updateDisplay();
  }

  function handleClear() {
    state.expression = ''; state.displayExpr = ''; state.result = '0'; state.justEvaluated = false;
    updateDisplay();
  }

  function handleBackspace() {
    if (state.justEvaluated) { handleClear(); return; }
    var funcPats = ['sin⁻¹(', 'cos⁻¹(', 'tan⁻¹(', 'sinh(', 'cosh(', 'tanh(', 'sin(', 'cos(', 'tan(', 'log(', 'ln(', '√(', '∛(', 'abs(', 'exp(', 'tenPow(', 'ANS'];
    var removed = false;
    for (var p = 0; p < funcPats.length; p++) {
      if (state.displayExpr.endsWith(funcPats[p])) {
        state.displayExpr = state.displayExpr.slice(0, -funcPats[p].length);
        if (state.expression.endsWith(funcPats[p])) state.expression = state.expression.slice(0, -funcPats[p].length);
        removed = true; break;
      }
    }
    if (!removed) { state.expression = state.expression.slice(0, -1); state.displayExpr = state.displayExpr.slice(0, -1); }
    if (state.expression === '') state.result = '0';
    updateDisplay(); livePreview();
  }

  function livePreview() {
    if (state.expression === '') return;
    try {
      var pe = state.expression;
      var o = (pe.match(/\(/g) || []).length;
      var c = (pe.match(/\)/g) || []).length;
      for (var i = 0; i < o - c; i++) pe += ')';
      var r = safeEval(pe);
      if (!isNaN(r) && isFinite(r)) { state.result = fmt(r); updateDisplay(); }
    } catch (e) { }
  }

  function addHistory(expr, result) {
    if (result === 'Error') return;
    state.history.unshift({ expr: expr, result: result });
    if (state.history.length > 50) state.history.pop();
    renderHistory();
  }

  function renderHistory() {
    var hl = $('sciHistoryList');
    if (!hl) return;
    if (state.history.length === 0) { hl.innerHTML = '<li class="history-empty">No history yet</li>'; return; }
    hl.innerHTML = state.history.map(function (it, i) {
      return '<li class="history-item" data-index="' + i + '"><div class="history-expr">' + window.CalcUtils.escapeHTML(it.expr) + '</div><div class="history-result">= ' + window.CalcUtils.escapeHTML(it.result) + '</div></li>';
    }).join('');
  }

  function toggleShift() {
    state.isShift = !state.isShift;
    var btn = $('sciBtnShift');
    if (btn) btn.classList.toggle('active', state.isShift);
    var labels = state.isShift
      ? { sin: 'sin⁻¹', cos: 'cos⁻¹', tan: 'tan⁻¹', log: 'log₂', ln: 'sinh', sqrt: 'cosh', cbrt: 'tanh', square: 'x³', cube: 'xʸ', pow: 'ʸ√x', fact: '%', exp: 'eˣ', tenPow: '2ˣ' }
      : { sin: 'sin', cos: 'cos', tan: 'tan', log: 'log', ln: 'ln', sqrt: '√', cbrt: '∛', square: 'x²', cube: 'x³', pow: 'xʸ', fact: 'x!', exp: 'eˣ', tenPow: '10ˣ' };
    Object.keys(labels).forEach(function (k) { var el = $('sciBtn_' + k); if (el) el.textContent = labels[k]; });
  }

  function handleAction(action, value) {
    switch (action) {
      case 'num': handleNumber(value); break;
      case 'dot': appendToExpression('.', '.'); break;
      case 'plusMinus':
        if (state.justEvaluated && state.lastAnswer !== 0) { state.lastAnswer = -state.lastAnswer; state.expression = String(state.lastAnswer); state.displayExpr = String(state.lastAnswer); state.result = fmt(state.lastAnswer); state.justEvaluated = true; updateDisplay(); }
        else appendToExpression('(-', '(-'); break;
      case 'add': handleOperator('+', '+'); break;
      case 'subtract': handleOperator('-', '−'); break;
      case 'multiply': handleOperator('*', '×'); break;
      case 'divide': handleOperator('/', '÷'); break;
      case 'parenOpen': appendToExpression('(', '('); break;
      case 'parenClose': appendToExpression(')', ')'); livePreview(); break;
      case 'clear': handleClear(); break;
      case 'backspace': handleBackspace(); break;
      case 'equals': handleEquals(); break;
      case 'sin':
        if (state.isShift) handleFunction('sin⁻¹', 'sin⁻¹'); else handleFunction('sin', 'sin');
        if (state.isShift) toggleShift(); break;
      case 'cos':
        if (state.isShift) handleFunction('cos⁻¹', 'cos⁻¹'); else handleFunction('cos', 'cos');
        if (state.isShift) toggleShift(); break;
      case 'tan':
        if (state.isShift) handleFunction('tan⁻¹', 'tan⁻¹'); else handleFunction('tan', 'tan');
        if (state.isShift) toggleShift(); break;
      case 'log':
        handleFunction('log', state.isShift ? 'log₂' : 'log');
        if (state.isShift) toggleShift(); break;
      case 'ln':
        if (state.isShift) handleFunction('sinh', 'sinh'); else handleFunction('ln', 'ln');
        if (state.isShift) toggleShift(); break;
      case 'sqrt':
        if (state.isShift) handleFunction('cosh', 'cosh'); else handleFunction('√', '√');
        if (state.isShift) toggleShift(); break;
      case 'cbrt':
        if (state.isShift) handleFunction('tanh', 'tanh'); else handleFunction('∛', '∛');
        if (state.isShift) toggleShift(); break;
      case 'square':
        if (state.justEvaluated) { state.expression = '(' + state.lastAnswer + ')^2'; state.displayExpr = '(' + fmt(state.lastAnswer) + ')²'; state.justEvaluated = false; }
        else appendToExpression('^2', '²');
        livePreview(); break;
      case 'cube':
        if (state.justEvaluated) { state.expression = '(' + state.lastAnswer + ')^3'; state.displayExpr = '(' + fmt(state.lastAnswer) + ')³'; state.justEvaluated = false; }
        else appendToExpression('^3', '³');
        livePreview(); break;
      case 'pow': handleOperator('^', '^'); break;
      case 'factorial':
        if (state.isShift) {
          if (state.justEvaluated) { state.expression = '(' + state.lastAnswer + '/100)'; state.displayExpr = fmt(state.lastAnswer) + '%'; state.justEvaluated = false; }
          else appendToExpression('/100', '%');
          toggleShift();
        } else {
          if (state.justEvaluated) { state.expression = state.lastAnswer + '!'; state.displayExpr = fmt(state.lastAnswer) + '!'; state.justEvaluated = false; }
          else appendToExpression('!', '!');
        }
        livePreview(); break;
      case 'inverse':
        if (state.justEvaluated) { state.expression = '1/(' + state.lastAnswer + ')'; state.displayExpr = '1/(' + fmt(state.lastAnswer) + ')'; state.justEvaluated = false; }
        else { state.expression = '1/(' + state.expression + ')'; state.displayExpr = '1/(' + state.displayExpr + ')'; }
        livePreview(); break;
      case 'abs': handleFunction('abs', '|'); break;
      case 'exp': handleFunction('exp', 'eˣ'); break;
      case 'tenPow':
        if (state.isShift) {
          if (state.justEvaluated) { state.expression = '2^(' + state.lastAnswer + ')'; state.displayExpr = '2^(' + fmt(state.lastAnswer) + ')'; state.justEvaluated = false; }
          else appendToExpression('2^(', '2^(');
          toggleShift();
        } else handleFunction('tenPow', '10^');
        break;
      case 'pi':
        if (state.justEvaluated) { state.expression = ''; state.displayExpr = ''; state.justEvaluated = false; }
        appendToExpression('(' + Math.PI + ')', 'π'); livePreview(); break;
      case 'euler':
        if (state.justEvaluated) { state.expression = ''; state.displayExpr = ''; state.justEvaluated = false; }
        appendToExpression('(' + Math.E + ')', 'e'); livePreview(); break;
      case 'ans': appendToExpression('(' + state.lastAnswer + ')', 'ANS'); livePreview(); break;
      case 'deg':
        state.isDeg = !state.isDeg;
        var mb = $('sciModeBadge'); if (mb) mb.textContent = state.isDeg ? 'DEG' : 'RAD';
        var db = $('sciBtn_deg'); if (db) db.textContent = state.isDeg ? 'DEG' : 'RAD';
        break;
      case 'shift': toggleShift(); break;
      case 'ms': state.memory += (state.justEvaluated ? state.lastAnswer : safeEval(state.expression) || 0); state.hasMemory = true; var mmb = $('sciMemBadge'); if (mmb) mmb.style.display = 'inline'; break;
      case 'mr': if (state.hasMemory) { appendToExpression('(' + state.memory + ')', fmt(state.memory)); livePreview(); } break;
      case 'mc': state.memory = 0; state.hasMemory = false; var mcb = $('sciMemBadge'); if (mcb) mcb.style.display = 'none'; break;
    }
  }

  window.CalcModules['scientific'] = {
    name: 'Scientific',

    render: function (container) {
      container.innerHTML = '<div class="sci-calc">' +
        '<section class="sci-display">' +
          '<div class="display-top-bar"><span class="mode-badge" id="sciModeBadge">DEG</span><span class="memory-badge" id="sciMemBadge" style="display:none">M</span>' +
          '<button class="history-toggle" id="sciHistoryToggle" title="History"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/><path d="M3 12a9 9 0 0 1 9-9"/></svg></button></div>' +
          '<div class="expression-display" id="sciExprDisplay"></div>' +
          '<div class="result-display" id="sciResultDisplay">0</div>' +
        '</section>' +
        '<aside class="history-panel" id="sciHistoryPanel"><div class="history-header"><button class="history-back-btn" id="sciHistoryBack" title="Back"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button><h2>History</h2><button class="clear-history-btn" id="sciClearHistory" title="Clear all"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg></button></div><ul class="history-list" id="sciHistoryList"><li class="history-empty">No history yet</li></ul></aside>' +
        '<section class="buttons-section" id="sciButtons">' +
          '<div class="btn-row fn-row">' +
            '<button class="btn btn-fn" id="sciBtnShift" data-a="shift">2nd</button>' +
            '<button class="btn btn-fn" id="sciBtn_deg" data-a="deg">DEG</button>' +
            '<button class="btn btn-fn" data-a="pi">π</button>' +
            '<button class="btn btn-fn" data-a="euler">e</button>' +
            '<button class="btn btn-fn" data-a="ans">ANS</button>' +
          '</div>' +
          '<div class="btn-row sci-row">' +
            '<button class="btn btn-sci" id="sciBtn_sin" data-a="sin">sin</button>' +
            '<button class="btn btn-sci" id="sciBtn_cos" data-a="cos">cos</button>' +
            '<button class="btn btn-sci" id="sciBtn_tan" data-a="tan">tan</button>' +
            '<button class="btn btn-sci" id="sciBtn_log" data-a="log">log</button>' +
            '<button class="btn btn-sci" id="sciBtn_ln" data-a="ln">ln</button>' +
          '</div>' +
          '<div class="btn-row sci-row">' +
            '<button class="btn btn-sci" id="sciBtn_sqrt" data-a="sqrt">√</button>' +
            '<button class="btn btn-sci" id="sciBtn_cbrt" data-a="cbrt">∛</button>' +
            '<button class="btn btn-sci" id="sciBtn_square" data-a="square">x²</button>' +
            '<button class="btn btn-sci" id="sciBtn_cube" data-a="cube">x³</button>' +
            '<button class="btn btn-sci" id="sciBtn_pow" data-a="pow">xʸ</button>' +
          '</div>' +
          '<div class="btn-row sci-row">' +
            '<button class="btn btn-sci" id="sciBtn_fact" data-a="factorial">x!</button>' +
            '<button class="btn btn-sci" data-a="inverse">1/x</button>' +
            '<button class="btn btn-sci" data-a="abs">|x|</button>' +
            '<button class="btn btn-sci" id="sciBtn_exp" data-a="exp">eˣ</button>' +
            '<button class="btn btn-sci" id="sciBtn_tenPow" data-a="tenPow">10ˣ</button>' +
          '</div>' +
          '<div class="btn-grid main-grid">' +
            '<button class="btn btn-util" data-a="clear">AC</button>' +
            '<button class="btn btn-util" data-a="parenOpen">(</button>' +
            '<button class="btn btn-util" data-a="parenClose">)</button>' +
            '<button class="btn btn-op" data-a="divide">÷</button>' +
            '<button class="btn btn-num" data-a="num" data-v="7">7</button>' +
            '<button class="btn btn-num" data-a="num" data-v="8">8</button>' +
            '<button class="btn btn-num" data-a="num" data-v="9">9</button>' +
            '<button class="btn btn-op" data-a="multiply">×</button>' +
            '<button class="btn btn-num" data-a="num" data-v="4">4</button>' +
            '<button class="btn btn-num" data-a="num" data-v="5">5</button>' +
            '<button class="btn btn-num" data-a="num" data-v="6">6</button>' +
            '<button class="btn btn-op" data-a="subtract">−</button>' +
            '<button class="btn btn-num" data-a="num" data-v="1">1</button>' +
            '<button class="btn btn-num" data-a="num" data-v="2">2</button>' +
            '<button class="btn btn-num" data-a="num" data-v="3">3</button>' +
            '<button class="btn btn-op" data-a="add">+</button>' +
            '<button class="btn btn-num" data-a="plusMinus">±</button>' +
            '<button class="btn btn-num" data-a="num" data-v="0">0</button>' +
            '<button class="btn btn-num" data-a="dot">.</button>' +
            '<button class="btn btn-equals" id="sciBtnEquals" data-a="equals">=</button>' +
            '<button class="btn btn-util btn-small" data-a="backspace"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg></button>' +
            '<button class="btn btn-util btn-small" data-a="mc">MC</button>' +
            '<button class="btn btn-util btn-small" data-a="mr">MR</button>' +
            '<button class="btn btn-util btn-small" data-a="ms">M+</button>' +
          '</div>' +
        '</section>' +
      '</div>';
    },

    init: function () {
      updateDisplay();
      renderHistory();

      var btns = document.getElementById('sciButtons');
      if (btns) {
        btns.addEventListener('click', function (e) {
          var btn = e.target.closest('.btn');
          if (!btn) return;
          handleAction(btn.dataset.a, btn.dataset.v);
          window.CalcUtils.createRipple(btn, e);
        });
      }

      function closeHistory() {
        var hp = $('sciHistoryPanel');
        if (hp) hp.classList.remove('open');
        var ht = $('sciHistoryToggle');
        if (ht) ht.classList.remove('active');
      }

      var ht = $('sciHistoryToggle');
      if (ht) ht.addEventListener('click', function () {
        var hp = $('sciHistoryPanel');
        if (hp) hp.classList.toggle('open');
        ht.classList.toggle('active');
      });

      var hb = $('sciHistoryBack');
      if (hb) hb.addEventListener('click', closeHistory);

      var ch = $('sciClearHistory');
      if (ch) ch.addEventListener('click', function () { state.history = []; renderHistory(); });

      var hl = $('sciHistoryList');
      if (hl) hl.addEventListener('click', function (e) {
        var item = e.target.closest('.history-item');
        if (!item) return;
        var idx = parseInt(item.dataset.index);
        var entry = state.history[idx];
        if (entry) {
          state.expression = ''; state.displayExpr = ''; state.justEvaluated = false;
          var nr = parseFloat(entry.result);
          if (!isNaN(nr)) appendToExpression('(' + nr + ')', entry.result);
          closeHistory();
        }
      });

      keyHandler = function (e) {
        if (e.key === 'Escape') { closeHistory(); return; }
        var key = e.key;
        if (/^\d$/.test(key)) { e.preventDefault(); handleAction('num', key); }
        else {
          switch (key) {
            case '.': e.preventDefault(); handleAction('dot'); break;
            case '+': e.preventDefault(); handleAction('add'); break;
            case '-': e.preventDefault(); handleAction('subtract'); break;
            case '*': e.preventDefault(); handleAction('multiply'); break;
            case '/': e.preventDefault(); handleAction('divide'); break;
            case '(': e.preventDefault(); handleAction('parenOpen'); break;
            case ')': e.preventDefault(); handleAction('parenClose'); break;
            case 'Enter': case '=': e.preventDefault(); handleAction('equals'); break;
            case 'Backspace': e.preventDefault(); handleAction('backspace'); break;
            case 'Delete': e.preventDefault(); handleAction('clear'); break;
            case '!': e.preventDefault(); handleAction('factorial'); break;
            case '^': e.preventDefault(); handleAction('pow'); break;
          }
        }
      };
      document.addEventListener('keydown', keyHandler);
    },

    destroy: function () {
      if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; }
    }
  };
})();
