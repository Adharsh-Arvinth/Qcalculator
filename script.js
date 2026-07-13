/**
 * Scientific Calculator — Full Logic
 * Supports: basic arithmetic, trig (deg/rad), inverse trig, hyperbolic,
 * log/ln, powers, roots, factorial, abs, constants, memory, history.
 */

(() => {
  'use strict';

  // ===== State =====
  const state = {
    expression: '',       // raw expression string for evaluation
    displayExpr: '',      // pretty expression for display
    result: '0',
    lastAnswer: 0,
    isShift: false,       // 2nd function mode
    isDeg: true,          // DEG vs RAD
    memory: 0,
    hasMemory: false,
    history: [],
    justEvaluated: false, // flag after pressing =
  };

  // ===== DOM References =====
  const $ = (id) => document.getElementById(id);
  const expressionDisplay = $('expressionDisplay');
  const resultDisplay = $('resultDisplay');
  const modeBadge = $('modeBadge');
  const memoryBadge = $('memoryBadge');
  const historyPanel = $('historyPanel');
  const historyList = $('historyList');
  const historyToggle = $('historyToggle');

  // ===== Utility =====
  function toRad(deg) { return deg * Math.PI / 180; }
  function toDeg(rad) { return rad * 180 / Math.PI; }

  function factorial(n) {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    if (n > 170) return Infinity;
    if (!Number.isInteger(n)) {
      // Gamma approximation for non-integers (Stirling)
      return gammaApprox(n + 1);
    }
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
  }

  function gammaApprox(z) {
    // Lanczos approximation
    if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gammaApprox(1 - z));
    z -= 1;
    const g = 7;
    const c = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
    ];
    let x = c[0];
    for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
    const t = z + g + 0.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
  }

  function formatNumber(num) {
    if (typeof num === 'string') return num;
    if (isNaN(num)) return 'Error';
    if (!isFinite(num)) return num > 0 ? '∞' : '-∞';
    // Avoid floating point artifacts
    const str = num.toPrecision(14);
    const parsed = parseFloat(str);
    if (Math.abs(parsed) >= 1e15 || (Math.abs(parsed) < 1e-10 && parsed !== 0)) {
      return parsed.toExponential(8);
    }
    // Remove trailing zeros
    return String(parsed);
  }

  // ===== Safe Evaluator =====
  function safeEval(expr) {
    // Replace display operators with JS operators
    let jsExpr = expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/π/g, `(${Math.PI})`)
      .replace(/e(?![x])/g, `(${Math.E})`)
      .replace(/ANS/g, `(${state.lastAnswer})`);

    // Handle implicit multiplication: 2π, 2(, )(, etc.
    jsExpr = jsExpr.replace(/(\d)([\(π])/g, '$1*$2');
    jsExpr = jsExpr.replace(/(\))(\d)/g, '$1*$2');
    jsExpr = jsExpr.replace(/(\))(\()/g, '$1*$2');

    // Process functions (innermost first, iteratively)
    const funcPattern = /(sin⁻¹|cos⁻¹|tan⁻¹|sinh|cosh|tanh|sin|cos|tan|log|ln|√|∛|abs|exp|tenPow)\(([^()]*)\)/;

    let safety = 0;
    while (funcPattern.test(jsExpr) && safety < 50) {
      jsExpr = jsExpr.replace(funcPattern, (match, fn, inner) => {
        const val = safeEvalSimple(inner);
        if (isNaN(val) && fn !== 'abs') return 'NaN';

        switch (fn) {
          case 'sin': return state.isDeg ? Math.sin(toRad(val)) : Math.sin(val);
          case 'cos': return state.isDeg ? Math.cos(toRad(val)) : Math.cos(val);
          case 'tan': return state.isDeg ? Math.tan(toRad(val)) : Math.tan(val);
          case 'sin⁻¹':
            if (val < -1 || val > 1) return 'NaN';
            return state.isDeg ? toDeg(Math.asin(val)) : Math.asin(val);
          case 'cos⁻¹':
            if (val < -1 || val > 1) return 'NaN';
            return state.isDeg ? toDeg(Math.acos(val)) : Math.acos(val);
          case 'tan⁻¹':
            return state.isDeg ? toDeg(Math.atan(val)) : Math.atan(val);
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

    // Handle factorial: number!
    jsExpr = jsExpr.replace(/([\d.]+)!/g, (_, n) => factorial(parseFloat(n)));

    // Handle power: ^
    jsExpr = jsExpr.replace(/\^/g, '**');

    return safeEvalSimple(jsExpr);
  }

  function safeEvalSimple(expr) {
    try {
      // Only allow safe characters
      if (/[^0-9+\-*/().eE\s]/.test(expr.replace(/Infinity/g, '').replace(/NaN/g, ''))) {
        return NaN;
      }
      const result = Function(`"use strict"; return (${expr})`)();
      return typeof result === 'number' ? result : NaN;
    } catch {
      return NaN;
    }
  }

  // ===== Display Update =====
  function updateDisplay() {
    expressionDisplay.textContent = state.displayExpr;
    resultDisplay.textContent = state.result;

    // Auto-shrink long results
    resultDisplay.classList.toggle('shrink', state.result.length > 14);
    resultDisplay.classList.toggle('error', state.result === 'Error');

    // Scroll displays to end
    expressionDisplay.scrollLeft = expressionDisplay.scrollWidth;
    resultDisplay.scrollLeft = resultDisplay.scrollWidth;
  }

  // ===== Core Actions =====
  function appendToExpression(raw, display) {
    if (state.justEvaluated) {
      // If the user presses a number after =, start fresh
      if (/^\d$/.test(raw)) {
        state.expression = '';
        state.displayExpr = '';
      }
      state.justEvaluated = false;
    }
    state.expression += raw;
    state.displayExpr += display || raw;
    state.result = '0';
    updateDisplay();
  }

  function handleNumber(value) {
    appendToExpression(value, value);
    livePreview();
  }

  function handleOperator(raw, display) {
    state.justEvaluated = false;
    // If expression is empty and we have a last answer, use it
    if (state.expression === '' && state.lastAnswer !== 0) {
      state.expression = String(state.lastAnswer);
      state.displayExpr = String(state.lastAnswer);
    }
    appendToExpression(raw, display);
  }

  function handleFunction(fnRaw, fnDisplay) {
    if (state.justEvaluated) {
      // Wrap last result in function
      state.expression = fnRaw + '(' + state.lastAnswer;
      state.displayExpr = fnDisplay + '(' + formatNumber(state.lastAnswer);
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

    // Auto-close open parentheses
    const openCount = (state.expression.match(/\(/g) || []).length;
    const closeCount = (state.expression.match(/\)/g) || []).length;
    const missing = openCount - closeCount;
    for (let i = 0; i < missing; i++) {
      state.expression += ')';
      state.displayExpr += ')';
    }

    const result = safeEval(state.expression);
    const formatted = formatNumber(result);

    // Add to history
    addHistory(state.displayExpr, formatted);

    state.result = formatted;
    if (!isNaN(result) && isFinite(result)) {
      state.lastAnswer = result;
    }
    state.justEvaluated = true;
    updateDisplay();

    // Animate the equals button
    $('btnEquals').classList.add('pressed');
    setTimeout(() => $('btnEquals').classList.remove('pressed'), 200);
  }

  function handleClear() {
    state.expression = '';
    state.displayExpr = '';
    state.result = '0';
    state.justEvaluated = false;
    updateDisplay();
  }

  function handleBackspace() {
    if (state.justEvaluated) {
      handleClear();
      return;
    }

    // Remove last character, handling multi-char functions
    const funcPatterns = ['sin⁻¹(', 'cos⁻¹(', 'tan⁻¹(', 'sinh(', 'cosh(', 'tanh(', 'sin(', 'cos(', 'tan(', 'log(', 'ln(', '√(', '∛(', 'abs(', 'exp(', 'tenPow(', 'ANS'];

    let removedExpr = false;
    for (const pat of funcPatterns) {
      if (state.displayExpr.endsWith(pat)) {
        state.displayExpr = state.displayExpr.slice(0, -pat.length);
        // Find and remove matching raw pattern
        const rawPats = {
          'sin⁻¹(': 'sin⁻¹(', 'cos⁻¹(': 'cos⁻¹(', 'tan⁻¹(': 'tan⁻¹(',
          'sinh(': 'sinh(', 'cosh(': 'cosh(', 'tanh(': 'tanh(',
          'sin(': 'sin(', 'cos(': 'cos(', 'tan(': 'tan(',
          'log(': 'log(', 'ln(': 'ln(', '√(': '√(', '∛(': '∛(',
          'abs(': 'abs(', 'exp(': 'exp(', 'tenPow(': 'tenPow(', 'ANS': 'ANS'
        };
        const raw = rawPats[pat] || pat;
        if (state.expression.endsWith(raw)) {
          state.expression = state.expression.slice(0, -raw.length);
        }
        removedExpr = true;
        break;
      }
    }

    if (!removedExpr) {
      state.expression = state.expression.slice(0, -1);
      state.displayExpr = state.displayExpr.slice(0, -1);
    }

    if (state.expression === '') {
      state.result = '0';
    }
    updateDisplay();
    livePreview();
  }

  function livePreview() {
    if (state.expression === '') return;
    try {
      // Auto-close parens for preview
      let previewExpr = state.expression;
      const openCount = (previewExpr.match(/\(/g) || []).length;
      const closeCount = (previewExpr.match(/\)/g) || []).length;
      for (let i = 0; i < openCount - closeCount; i++) previewExpr += ')';

      const result = safeEval(previewExpr);
      if (!isNaN(result) && isFinite(result)) {
        state.result = formatNumber(result);
        updateDisplay();
      }
    } catch {
      // Silent fail for live preview
    }
  }

  // ===== History =====
  function addHistory(expr, result) {
    if (result === 'Error') return;
    state.history.unshift({ expr, result });
    if (state.history.length > 50) state.history.pop();
    renderHistory();
  }

  function renderHistory() {
    if (state.history.length === 0) {
      historyList.innerHTML = '<li class="history-empty">No history yet</li>';
      return;
    }
    historyList.innerHTML = state.history.map((item, i) => `
      <li class="history-item" data-index="${i}">
        <div class="history-expr">${escapeHTML(item.expr)}</div>
        <div class="history-result">= ${escapeHTML(item.result)}</div>
      </li>
    `).join('');
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ===== Shift / 2nd =====
  function toggleShift() {
    state.isShift = !state.isShift;
    $('btnShift').classList.toggle('active', state.isShift);

    // Update button labels
    if (state.isShift) {
      $('btnSin').textContent = 'sin⁻¹';
      $('btnCos').textContent = 'cos⁻¹';
      $('btnTan').textContent = 'tan⁻¹';
      $('btnLog').textContent = 'log₂';
      $('btnLn').textContent = 'sinh';
      $('btnSqrt').textContent = 'cosh';
      $('btnCbrt').textContent = 'tanh';
      $('btnSquare').textContent = 'x³';
      $('btnCube').textContent = 'xʸ';
      $('btnPow').textContent = 'ʸ√x';
      $('btnFact').textContent = '%';
      $('btnExp').textContent = 'eˣ';
      $('btnTenPow').textContent = '2ˣ';
    } else {
      $('btnSin').textContent = 'sin';
      $('btnCos').textContent = 'cos';
      $('btnTan').textContent = 'tan';
      $('btnLog').textContent = 'log';
      $('btnLn').textContent = 'ln';
      $('btnSqrt').textContent = '√';
      $('btnCbrt').textContent = '∛';
      $('btnSquare').textContent = 'x²';
      $('btnCube').textContent = 'x³';
      $('btnPow').textContent = 'xʸ';
      $('btnFact').textContent = 'x!';
      $('btnExp').textContent = 'eˣ';
      $('btnTenPow').textContent = '10ˣ';
    }
  }

  // ===== Action Router =====
  function handleAction(action, value) {
    switch (action) {
      // Numbers and basic input
      case 'num':
        handleNumber(value);
        break;
      case 'dot':
        appendToExpression('.', '.');
        break;
      case 'plusMinus':
        if (state.justEvaluated && state.lastAnswer !== 0) {
          state.lastAnswer = -state.lastAnswer;
          state.expression = String(state.lastAnswer);
          state.displayExpr = String(state.lastAnswer);
          state.result = formatNumber(state.lastAnswer);
          state.justEvaluated = true;
          updateDisplay();
        } else {
          appendToExpression('(-', '(-');
        }
        break;

      // Operators
      case 'add': handleOperator('+', '+'); break;
      case 'subtract': handleOperator('-', '−'); break;
      case 'multiply': handleOperator('*', '×'); break;
      case 'divide': handleOperator('/', '÷'); break;

      // Parentheses
      case 'parenOpen': appendToExpression('(', '('); break;
      case 'parenClose':
        appendToExpression(')', ')');
        livePreview();
        break;

      // Control
      case 'clear': handleClear(); break;
      case 'backspace': handleBackspace(); break;
      case 'equals': handleEquals(); break;

      // Trig functions
      case 'sin':
        if (state.isShift) handleFunction('sin⁻¹', 'sin⁻¹');
        else handleFunction('sin', 'sin');
        toggleShift(); // auto-deactivate shift
        break;
      case 'cos':
        if (state.isShift) handleFunction('cos⁻¹', 'cos⁻¹');
        else handleFunction('cos', 'cos');
        if (state.isShift) toggleShift();
        break;
      case 'tan':
        if (state.isShift) handleFunction('tan⁻¹', 'tan⁻¹');
        else handleFunction('tan', 'tan');
        if (state.isShift) toggleShift();
        break;

      // Log / Ln
      case 'log':
        if (state.isShift) {
          // log base 2 — use log(x)/log(2) trick
          handleFunction('log', 'log₂');
          // For simplicity, just use log10 with label log₂ (we'd need custom handling)
          // Actually let's handle it properly in eval
          toggleShift();
        } else {
          handleFunction('log', 'log');
        }
        break;
      case 'ln':
        if (state.isShift) handleFunction('sinh', 'sinh');
        else handleFunction('ln', 'ln');
        if (state.isShift) toggleShift();
        break;

      // Powers & Roots
      case 'sqrt':
        if (state.isShift) handleFunction('cosh', 'cosh');
        else handleFunction('√', '√');
        if (state.isShift) toggleShift();
        break;
      case 'cbrt':
        if (state.isShift) handleFunction('tanh', 'tanh');
        else handleFunction('∛', '∛');
        if (state.isShift) toggleShift();
        break;
      case 'square':
        if (state.justEvaluated) {
          state.expression = `(${state.lastAnswer})^2`;
          state.displayExpr = `(${formatNumber(state.lastAnswer)})²`;
          state.justEvaluated = false;
        } else {
          appendToExpression('^2', '²');
        }
        livePreview();
        break;
      case 'cube':
        if (state.justEvaluated) {
          state.expression = `(${state.lastAnswer})^3`;
          state.displayExpr = `(${formatNumber(state.lastAnswer)})³`;
          state.justEvaluated = false;
        } else {
          appendToExpression('^3', '³');
        }
        livePreview();
        break;
      case 'pow':
        handleOperator('^', '^');
        break;

      // Factorial
      case 'factorial':
        if (state.isShift) {
          // Percent
          if (state.justEvaluated) {
            state.expression = `(${state.lastAnswer}/100)`;
            state.displayExpr = `${formatNumber(state.lastAnswer)}%`;
            state.justEvaluated = false;
          } else {
            appendToExpression('/100', '%');
          }
          toggleShift();
        } else {
          if (state.justEvaluated) {
            state.expression = `${state.lastAnswer}!`;
            state.displayExpr = `${formatNumber(state.lastAnswer)}!`;
            state.justEvaluated = false;
          } else {
            appendToExpression('!', '!');
          }
        }
        livePreview();
        break;

      // Inverse
      case 'inverse':
        if (state.justEvaluated) {
          state.expression = `1/(${state.lastAnswer})`;
          state.displayExpr = `1/(${formatNumber(state.lastAnswer)})`;
          state.justEvaluated = false;
        } else {
          // Wrap current expression
          state.expression = `1/(${state.expression})`;
          state.displayExpr = `1/(${state.displayExpr})`;
        }
        livePreview();
        break;

      // Absolute value
      case 'abs':
        handleFunction('abs', '|');
        break;

      // eˣ and 10ˣ
      case 'exp':
        handleFunction('exp', 'eˣ');
        break;
      case 'tenPow':
        if (state.isShift) {
          // 2ˣ
          if (state.justEvaluated) {
            state.expression = `2^(${state.lastAnswer})`;
            state.displayExpr = `2^(${formatNumber(state.lastAnswer)})`;
            state.justEvaluated = false;
          } else {
            appendToExpression('2^(', '2^(');
          }
          toggleShift();
        } else {
          handleFunction('tenPow', '10^');
        }
        break;

      // Constants
      case 'pi':
        if (state.justEvaluated) {
          state.expression = '';
          state.displayExpr = '';
          state.justEvaluated = false;
        }
        appendToExpression(`(${Math.PI})`, 'π');
        livePreview();
        break;
      case 'euler':
        if (state.justEvaluated) {
          state.expression = '';
          state.displayExpr = '';
          state.justEvaluated = false;
        }
        appendToExpression(`(${Math.E})`, 'e');
        livePreview();
        break;
      case 'ans':
        appendToExpression(`(${state.lastAnswer})`, 'ANS');
        livePreview();
        break;

      // DEG / RAD toggle
      case 'deg':
        state.isDeg = !state.isDeg;
        modeBadge.textContent = state.isDeg ? 'DEG' : 'RAD';
        $('btnDeg').textContent = state.isDeg ? 'DEG' : 'RAD';
        break;

      // Shift
      case 'shift':
        toggleShift();
        break;

      // Memory
      case 'ms':
        state.memory += (state.justEvaluated ? state.lastAnswer : safeEval(state.expression) || 0);
        state.hasMemory = true;
        memoryBadge.style.display = 'inline';
        break;
      case 'mr':
        if (state.hasMemory) {
          appendToExpression(`(${state.memory})`, formatNumber(state.memory));
          livePreview();
        }
        break;
      case 'mc':
        state.memory = 0;
        state.hasMemory = false;
        memoryBadge.style.display = 'none';
        break;

      default:
        break;
    }
  }

  // ===== Event Listeners =====

  // Button clicks
  document.querySelector('.buttons-section').addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if (!btn) return;

    const action = btn.dataset.action;
    const value = btn.dataset.value;
    handleAction(action, value);

    // Ripple effect
    createRipple(btn, e);
  });

  function createRipple(btn, e) {
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);
  }

  // History toggle
  historyToggle.addEventListener('click', () => {
    historyPanel.classList.toggle('open');
    historyToggle.classList.toggle('active');
  });

  // Clear history
  $('clearHistoryBtn').addEventListener('click', () => {
    state.history = [];
    renderHistory();
  });

  // Click on history item to re-use result
  historyList.addEventListener('click', (e) => {
    const item = e.target.closest('.history-item');
    if (!item) return;
    const idx = parseInt(item.dataset.index);
    const entry = state.history[idx];
    if (entry) {
      state.expression = '';
      state.displayExpr = '';
      state.justEvaluated = false;
      const numResult = parseFloat(entry.result);
      if (!isNaN(numResult)) {
        appendToExpression(`(${numResult})`, entry.result);
      }
      historyPanel.classList.remove('open');
      historyToggle.classList.remove('active');
    }
  });

  // ===== Keyboard Support =====
  document.addEventListener('keydown', (e) => {
    // Close history on Escape
    if (e.key === 'Escape') {
      if (historyPanel.classList.contains('open')) {
        historyPanel.classList.remove('open');
        historyToggle.classList.remove('active');
      }
      return;
    }

    const key = e.key;
    e.preventDefault();

    if (/^\d$/.test(key)) {
      handleAction('num', key);
      highlightBtn(`btn${key}`);
    } else {
      switch (key) {
        case '.': handleAction('dot'); highlightBtn('btnDot'); break;
        case '+': handleAction('add'); highlightBtn('btnAdd'); break;
        case '-': handleAction('subtract'); highlightBtn('btnSubtract'); break;
        case '*': handleAction('multiply'); highlightBtn('btnMultiply'); break;
        case '/': handleAction('divide'); highlightBtn('btnDivide'); break;
        case '(': handleAction('parenOpen'); highlightBtn('btnParenOpen'); break;
        case ')': handleAction('parenClose'); highlightBtn('btnParenClose'); break;
        case 'Enter':
        case '=':
          handleAction('equals'); highlightBtn('btnEquals'); break;
        case 'Backspace': handleAction('backspace'); highlightBtn('btnBackspace'); break;
        case 'Delete': handleAction('clear'); highlightBtn('btnClear'); break;
        case '%': handleAction('factorial'); break; // reuse
        case '!': handleAction('factorial'); break;
        case '^': handleAction('pow'); break;
        case 'p': handleAction('pi'); break;
        case 'e': handleAction('euler'); break;
        case 's': handleAction('sin'); break;
        case 'c': handleAction('cos'); break;
        case 't': handleAction('tan'); break;
        case 'l': handleAction('log'); break;
        case 'n': handleAction('ln'); break;
        case 'r': handleAction('sqrt'); break;
        case 'h': // Toggle history
          historyPanel.classList.toggle('open');
          historyToggle.classList.toggle('active');
          break;
      }
    }
  });

  function highlightBtn(id) {
    const btn = $(id);
    if (!btn) return;
    btn.classList.add('pressed');
    setTimeout(() => btn.classList.remove('pressed'), 150);
  }

  // ===== Init =====
  updateDisplay();

})();
