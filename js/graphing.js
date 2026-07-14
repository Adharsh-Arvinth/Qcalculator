/**
 * Graphing Calculator Module
 * Supports up to 4 simultaneous function plots with pan, zoom, trace, and touch.
 */
(function () {
  'use strict';

  window.CalcModules = window.CalcModules || {};

  // ===== Function Colors =====
  var COLORS = ['#818cf8', '#f87171', '#34d399', '#fbbf24'];
  var COLOR_NAMES = ['Indigo', 'Red', 'Green', 'Yellow'];

  // ===== State =====
  var state = {
    xMin: -10, xMax: 10,
    yMin: -7, yMax: 7,
    showGrid: true,
    functions: [
      { expr: 'sin(x)', enabled: true, compiled: null, error: false },
      { expr: '', enabled: true, compiled: null, error: false },
      { expr: '', enabled: true, compiled: null, error: false },
      { expr: '', enabled: true, compiled: null, error: false }
    ],
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragStartXMin: 0,
    dragStartYMin: 0,
    dragStartXMax: 0,
    dragStartYMax: 0,
    mouseX: -1,
    mouseY: -1,
    showTrace: false,
    animFrameId: null,
    debounceTimers: [null, null, null, null],
    pinchStartDist: 0,
    pinchStartXMin: 0,
    pinchStartXMax: 0,
    pinchStartYMin: 0,
    pinchStartYMax: 0,
    touchStartX: 0,
    touchStartY: 0,
    touchDragXMin: 0,
    touchDragXMax: 0,
    touchDragYMin: 0,
    touchDragYMax: 0
  };

  // ===== Bound event handlers (for cleanup) =====
  var handlers = {};

  // ===== Expression Parser =====
  function compileExpression(expr) {
    if (!expr || !expr.trim()) return null;

    try {
      var processed = expr.trim();

      // Replace constants first (before any other processing)
      processed = processed.replace(/\bpi\b/gi, '(Math.PI)');
      processed = processed.replace(/\be\b/gi, '(Math.E)');

      // Replace function names with Math equivalents
      processed = processed.replace(/\basin\b/gi, 'Math.asin');
      processed = processed.replace(/\bacos\b/gi, 'Math.acos');
      processed = processed.replace(/\batan\b/gi, 'Math.atan');
      processed = processed.replace(/\bsinh\b/gi, 'Math.sinh');
      processed = processed.replace(/\bcosh\b/gi, 'Math.cosh');
      processed = processed.replace(/\btanh\b/gi, 'Math.tanh');
      processed = processed.replace(/\bsin\b/gi, 'Math.sin');
      processed = processed.replace(/\bcos\b/gi, 'Math.cos');
      processed = processed.replace(/\btan\b/gi, 'Math.tan');
      processed = processed.replace(/\blog\b/gi, 'Math.log10');
      processed = processed.replace(/\bln\b/gi, 'Math.log');
      processed = processed.replace(/\bsqrt\b/gi, 'Math.sqrt');
      processed = processed.replace(/\bcbrt\b/gi, 'Math.cbrt');
      processed = processed.replace(/\babs\b/gi, 'Math.abs');
      processed = processed.replace(/\bexp\b/gi, 'Math.exp');
      processed = processed.replace(/\bfloor\b/gi, 'Math.floor');
      processed = processed.replace(/\bceil\b/gi, 'Math.ceil');
      processed = processed.replace(/\bround\b/gi, 'Math.round');

      // Replace ^ with ** for power
      processed = processed.replace(/\^/g, '**');

      // Implicit multiplication patterns:
      // 2x -> 2*x, 2sin -> 2*sin, 2( -> 2*(, )2 -> )*2, )x -> )*x, )( -> )*(
      // x( -> x*(, number followed by Math -> number*Math
      processed = processed.replace(/(\d)([x(])/gi, '$1*$2');
      processed = processed.replace(/(\d)(Math\.)/g, '$1*$2');
      processed = processed.replace(/(\))([\dx(])/gi, '$1*$2');
      processed = processed.replace(/(\))(Math\.)/g, '$1*$2');
      processed = processed.replace(/(x)(Math\.)/gi, '$1*$2');
      processed = processed.replace(/(x)\(/gi, '$1*(');
      processed = processed.replace(/(\.\w+)\s*(\d)/g, '$1*$2');

      // Validate: only allow safe characters
      var safePattern = /^[0-9x+\-*/().,%\s*]*$/;
      var testStr = processed
        .replace(/Math\.\w+/g, '')
        .replace(/\*\*/g, '');
      if (!safePattern.test(testStr)) {
        return null;
      }

      // Try compiling
      var fn = new Function('x', '"use strict"; return (' + processed + ');');

      // Quick test to make sure it doesn't throw
      fn(0);
      fn(1);

      return fn;
    } catch (e) {
      return null;
    }
  }

  // ===== Nice Grid Spacing =====
  function niceStep(range, targetSteps) {
    var rawStep = range / targetSteps;
    var magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    var normalized = rawStep / magnitude;

    var niceNorm;
    if (normalized <= 1) niceNorm = 1;
    else if (normalized <= 2) niceNorm = 2;
    else if (normalized <= 5) niceNorm = 5;
    else niceNorm = 10;

    return niceNorm * magnitude;
  }

  // ===== Canvas Rendering =====
  function drawGraph() {
    var canvas = document.getElementById('graphCanvas');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    var W = canvas.width;
    var H = canvas.height;
    var dpr = window.devicePixelRatio || 1;

    // Clear
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, W, H);

    var xMin = state.xMin;
    var xMax = state.xMax;
    var yMin = state.yMin;
    var yMax = state.yMax;
    var xRange = xMax - xMin;
    var yRange = yMax - yMin;

    // Coordinate transforms
    function toCanvasX(x) { return ((x - xMin) / xRange) * W; }
    function toCanvasY(y) { return H - ((y - yMin) / yRange) * H; }
    function toMathX(cx) { return xMin + (cx / W) * xRange; }
    function toMathY(cy) { return yMax - (cy / H) * yRange; }

    // ===== Grid =====
    if (state.showGrid) {
      var targetGridLines = 10;
      var xStep = niceStep(xRange, targetGridLines);
      var yStep = niceStep(yRange, targetGridLines);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1 * dpr;
      ctx.setLineDash([]);

      // Vertical grid lines
      var xStart = Math.ceil(xMin / xStep) * xStep;
      for (var gx = xStart; gx <= xMax; gx += xStep) {
        var cx = toCanvasX(gx);
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, H);
        ctx.stroke();
      }

      // Horizontal grid lines
      var yStart = Math.ceil(yMin / yStep) * yStep;
      for (var gy = yStart; gy <= yMax; gy += yStep) {
        var cy = toCanvasY(gy);
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(W, cy);
        ctx.stroke();
      }

      // ===== Axis labels =====
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.font = (11 * dpr) + 'px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      var axisY = toCanvasY(0);
      var axisX = toCanvasX(0);

      // X-axis labels
      for (var lx = xStart; lx <= xMax; lx += xStep) {
        if (Math.abs(lx) < xStep * 0.01) continue; // skip 0
        var lcx = toCanvasX(lx);
        var labelY = Math.min(Math.max(axisY + 4 * dpr, 2 * dpr), H - 16 * dpr);
        var labelText = parseFloat(lx.toPrecision(10));
        ctx.fillText(labelText, lcx, labelY);
      }

      // Y-axis labels
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      for (var ly = yStart; ly <= yMax; ly += yStep) {
        if (Math.abs(ly) < yStep * 0.01) continue;
        var lcy = toCanvasY(ly);
        var labelX = Math.min(Math.max(axisX + 4 * dpr, 2 * dpr), W - 40 * dpr);
        var labelTextY = parseFloat(ly.toPrecision(10));
        ctx.fillText(labelTextY, labelX, lcy);
      }
    }

    // ===== Axes =====
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.5 * dpr;
    ctx.setLineDash([]);

    // X-axis
    var originY = toCanvasY(0);
    if (originY >= 0 && originY <= H) {
      ctx.beginPath();
      ctx.moveTo(0, originY);
      ctx.lineTo(W, originY);
      ctx.stroke();

      // Arrow tip right
      ctx.beginPath();
      ctx.moveTo(W - 10 * dpr, originY - 4 * dpr);
      ctx.lineTo(W, originY);
      ctx.lineTo(W - 10 * dpr, originY + 4 * dpr);
      ctx.stroke();
    }

    // Y-axis
    var originX = toCanvasX(0);
    if (originX >= 0 && originX <= W) {
      ctx.beginPath();
      ctx.moveTo(originX, 0);
      ctx.lineTo(originX, H);
      ctx.stroke();

      // Arrow tip up
      ctx.beginPath();
      ctx.moveTo(originX - 4 * dpr, 10 * dpr);
      ctx.lineTo(originX, 0);
      ctx.lineTo(originX + 4 * dpr, 10 * dpr);
      ctx.stroke();
    }

    // ===== Origin label =====
    if (state.showGrid && originX >= 0 && originX <= W && originY >= 0 && originY <= H) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.font = (11 * dpr) + 'px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('0', originX + 4 * dpr, originY + 4 * dpr);
    }

    // ===== Function Curves =====
    var sampleCount = W; // 2 points per CSS pixel = W/dpr*2, but W = cssW*dpr so W already has plenty
    if (sampleCount < 600) sampleCount = 600;

    for (var fi = 0; fi < 4; fi++) {
      var func = state.functions[fi];
      if (!func.enabled || !func.compiled) continue;

      ctx.strokeStyle = COLORS[fi];
      ctx.lineWidth = 2 * dpr;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([]);
      ctx.beginPath();

      var started = false;
      var prevY = null;
      var prevValid = false;
      var JUMP_THRESHOLD = H * 0.5; // detect discontinuities

      for (var si = 0; si <= sampleCount; si++) {
        var mathX = xMin + (si / sampleCount) * xRange;
        var mathY;
        try {
          mathY = func.compiled(mathX);
        } catch (e) {
          mathY = NaN;
        }

        var valid = isFinite(mathY) && !isNaN(mathY);
        var canvasXPt = toCanvasX(mathX);
        var canvasYPt = valid ? toCanvasY(mathY) : 0;

        if (valid) {
          // Check for singularity jumps
          if (prevValid && Math.abs(canvasYPt - prevY) > JUMP_THRESHOLD) {
            // Break the line — discontinuity
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(canvasXPt, canvasYPt);
          } else if (!started || !prevValid) {
            ctx.moveTo(canvasXPt, canvasYPt);
          } else {
            ctx.lineTo(canvasXPt, canvasYPt);
          }
          started = true;
        } else {
          if (started && prevValid) {
            // End current segment
            ctx.stroke();
            ctx.beginPath();
          }
        }

        prevY = canvasYPt;
        prevValid = valid;
      }

      ctx.stroke();
    }

    // ===== Trace / Crosshair =====
    if (state.showTrace && state.mouseX >= 0 && state.mouseY >= 0) {
      var mx = state.mouseX * dpr;
      var my = state.mouseY * dpr;

      var traceMathX = toMathX(mx);
      var traceMathY = toMathY(my);

      // Find nearest function value
      var snapY = null;
      var snapFuncIdx = -1;
      var snapDist = Infinity;

      for (var ti = 0; ti < 4; ti++) {
        var tf = state.functions[ti];
        if (!tf.enabled || !tf.compiled) continue;

        try {
          var fy = tf.compiled(traceMathX);
          if (isFinite(fy) && !isNaN(fy)) {
            var fCanvasY = toCanvasY(fy);
            var dist = Math.abs(fCanvasY - my);
            if (dist < 20 * dpr && dist < snapDist) {
              snapDist = dist;
              snapY = fy;
              snapFuncIdx = ti;
            }
          }
        } catch (e) {
          // skip
        }
      }

      var displayX = traceMathX;
      var displayY = snapY !== null ? snapY : traceMathY;
      var crossY = snapY !== null ? toCanvasY(snapY) : my;

      // Crosshair lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1 * dpr;
      ctx.setLineDash([4 * dpr, 4 * dpr]);

      ctx.beginPath();
      ctx.moveTo(mx, 0);
      ctx.lineTo(mx, H);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, crossY);
      ctx.lineTo(W, crossY);
      ctx.stroke();

      ctx.setLineDash([]);

      // Snap dot
      var dotColor = snapFuncIdx >= 0 ? COLORS[snapFuncIdx] : 'rgba(255,255,255,0.7)';
      ctx.fillStyle = dotColor;
      ctx.beginPath();
      ctx.arc(mx, crossY, 5 * dpr, 0, Math.PI * 2);
      ctx.fill();

      // Dot ring
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath();
      ctx.arc(mx, crossY, 5 * dpr, 0, Math.PI * 2);
      ctx.stroke();

      // Update coordinate display
      var coordEl = document.getElementById('graphCoordDisplay');
      if (coordEl) {
        var xStr = displayX.toFixed(4);
        var yStr = displayY.toFixed(4);
        coordEl.textContent = 'x: ' + xStr + '  y: ' + yStr;
        coordEl.style.opacity = '1';
      }
    } else {
      var coordElHide = document.getElementById('graphCoordDisplay');
      if (coordElHide) coordElHide.style.opacity = '0';
    }
  }

  function scheduleRedraw() {
    if (state.animFrameId) cancelAnimationFrame(state.animFrameId);
    state.animFrameId = requestAnimationFrame(drawGraph);
  }

  // ===== Zoom =====
  function zoomAtPoint(factor, centerFracX, centerFracY) {
    var xRange = state.xMax - state.xMin;
    var yRange = state.yMax - state.yMin;

    var centerX = state.xMin + centerFracX * xRange;
    var centerY = state.yMin + centerFracY * yRange;

    var newXRange = xRange * factor;
    var newYRange = yRange * factor;

    // Clamp to reasonable limits
    if (newXRange < 0.0001 || newXRange > 100000) return;
    if (newYRange < 0.0001 || newYRange > 100000) return;

    state.xMin = centerX - centerFracX * newXRange;
    state.xMax = centerX + (1 - centerFracX) * newXRange;
    state.yMin = centerY - (1 - centerFracY) * newYRange;
    state.yMax = centerY + centerFracY * newYRange;

    updateViewportDisplay();
    scheduleRedraw();
  }

  function zoomIn() { zoomAtPoint(0.7, 0.5, 0.5); }
  function zoomOut() { zoomAtPoint(1.4, 0.5, 0.5); }

  function resetView() {
    state.xMin = -10;
    state.xMax = 10;
    state.yMin = -7;
    state.yMax = 7;
    updateViewportDisplay();
    scheduleRedraw();
  }

  function toggleGrid() {
    state.showGrid = !state.showGrid;
    var btn = document.getElementById('graphGridToggle');
    if (btn) {
      btn.style.background = state.showGrid ? 'rgba(129, 140, 248, 0.25)' : 'rgba(255,255,255,0.06)';
      btn.style.borderColor = state.showGrid ? 'rgba(129, 140, 248, 0.4)' : 'rgba(255,255,255,0.1)';
    }
    scheduleRedraw();
  }

  function updateViewportDisplay() {
    var el = document.getElementById('graphViewport');
    if (el) {
      el.textContent = 'x:[' + state.xMin.toFixed(2) + ', ' + state.xMax.toFixed(2) + ']  y:[' + state.yMin.toFixed(2) + ', ' + state.yMax.toFixed(2) + ']';
    }
  }

  // ===== Resize Canvas =====
  function resizeCanvas() {
    var canvas = document.getElementById('graphCanvas');
    if (!canvas) return;

    var container = canvas.parentElement;
    if (!container) return;

    var dpr = window.devicePixelRatio || 1;
    var cssWidth = container.clientWidth;
    var cssHeight = 400;

    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;

    scheduleRedraw();
  }

  // ===== Get canvas-relative position =====
  function getCanvasPos(e) {
    var canvas = document.getElementById('graphCanvas');
    if (!canvas) return { x: 0, y: 0 };
    var rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  // ===== Event Handlers =====
  function onMouseDown(e) {
    if (e.button !== 0) return;
    var pos = getCanvasPos(e);
    state.isDragging = true;
    state.dragStartX = pos.x;
    state.dragStartY = pos.y;
    state.dragStartXMin = state.xMin;
    state.dragStartXMax = state.xMax;
    state.dragStartYMin = state.yMin;
    state.dragStartYMax = state.yMax;

    var canvas = document.getElementById('graphCanvas');
    if (canvas) canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }

  function onMouseMove(e) {
    var canvas = document.getElementById('graphCanvas');
    if (!canvas) return;

    var pos = getCanvasPos(e);

    if (state.isDragging) {
      var rect = canvas.getBoundingClientRect();
      var cssWidth = rect.width;
      var cssHeight = rect.height;

      var dxFrac = (pos.x - state.dragStartX) / cssWidth;
      var dyFrac = (pos.y - state.dragStartY) / cssHeight;

      var xRange = state.dragStartXMax - state.dragStartXMin;
      var yRange = state.dragStartYMax - state.dragStartYMin;

      state.xMin = state.dragStartXMin - dxFrac * xRange;
      state.xMax = state.dragStartXMax - dxFrac * xRange;
      state.yMin = state.dragStartYMin + dyFrac * yRange;
      state.yMax = state.dragStartYMax + dyFrac * yRange;

      updateViewportDisplay();
      scheduleRedraw();
    } else {
      state.showTrace = true;
      state.mouseX = pos.x;
      state.mouseY = pos.y;
      scheduleRedraw();
    }
  }

  function onMouseUp(e) {
    state.isDragging = false;
    var canvas = document.getElementById('graphCanvas');
    if (canvas) canvas.style.cursor = 'crosshair';
  }

  function onMouseLeave(e) {
    state.isDragging = false;
    state.showTrace = false;
    state.mouseX = -1;
    state.mouseY = -1;
    var canvas = document.getElementById('graphCanvas');
    if (canvas) canvas.style.cursor = 'crosshair';
    scheduleRedraw();
  }

  function onWheel(e) {
    e.preventDefault();
    var canvas = document.getElementById('graphCanvas');
    if (!canvas) return;

    var rect = canvas.getBoundingClientRect();
    var fracX = (e.clientX - rect.left) / rect.width;
    var fracY = 1 - (e.clientY - rect.top) / rect.height;

    var factor = e.deltaY > 0 ? 1.15 : 0.87;
    zoomAtPoint(factor, fracX, fracY);
  }

  // ===== Touch Handlers =====
  function getTouchDist(e) {
    var dx = e.touches[0].clientX - e.touches[1].clientX;
    var dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function onTouchStart(e) {
    if (e.touches.length === 1) {
      var pos = getCanvasPos(e.touches[0]);
      state.isDragging = true;
      state.touchStartX = pos.x;
      state.touchStartY = pos.y;
      state.touchDragXMin = state.xMin;
      state.touchDragXMax = state.xMax;
      state.touchDragYMin = state.yMin;
      state.touchDragYMax = state.yMax;
    } else if (e.touches.length === 2) {
      state.isDragging = false;
      state.pinchStartDist = getTouchDist(e);
      state.pinchStartXMin = state.xMin;
      state.pinchStartXMax = state.xMax;
      state.pinchStartYMin = state.yMin;
      state.pinchStartYMax = state.yMax;
    }
    e.preventDefault();
  }

  function onTouchMove(e) {
    var canvas = document.getElementById('graphCanvas');
    if (!canvas) return;

    if (e.touches.length === 1 && state.isDragging) {
      var pos = getCanvasPos(e.touches[0]);
      var rect = canvas.getBoundingClientRect();
      var dxFrac = (pos.x - state.touchStartX) / rect.width;
      var dyFrac = (pos.y - state.touchStartY) / rect.height;

      var xRange = state.touchDragXMax - state.touchDragXMin;
      var yRange = state.touchDragYMax - state.touchDragYMin;

      state.xMin = state.touchDragXMin - dxFrac * xRange;
      state.xMax = state.touchDragXMax - dxFrac * xRange;
      state.yMin = state.touchDragYMin + dyFrac * yRange;
      state.yMax = state.touchDragYMax + dyFrac * yRange;

      updateViewportDisplay();
      scheduleRedraw();
    } else if (e.touches.length === 2) {
      var dist = getTouchDist(e);
      var scale = state.pinchStartDist / dist;

      var cx = (state.pinchStartXMin + state.pinchStartXMax) / 2;
      var cy = (state.pinchStartYMin + state.pinchStartYMax) / 2;
      var halfXRange = ((state.pinchStartXMax - state.pinchStartXMin) / 2) * scale;
      var halfYRange = ((state.pinchStartYMax - state.pinchStartYMin) / 2) * scale;

      if (halfXRange * 2 > 0.0001 && halfXRange * 2 < 100000) {
        state.xMin = cx - halfXRange;
        state.xMax = cx + halfXRange;
        state.yMin = cy - halfYRange;
        state.yMax = cy + halfYRange;

        updateViewportDisplay();
        scheduleRedraw();
      }
    }
    e.preventDefault();
  }

  function onTouchEnd(e) {
    if (e.touches.length === 0) {
      state.isDragging = false;
    } else if (e.touches.length === 1) {
      // Transitioned from pinch to single touch
      var pos = getCanvasPos(e.touches[0]);
      state.isDragging = true;
      state.touchStartX = pos.x;
      state.touchStartY = pos.y;
      state.touchDragXMin = state.xMin;
      state.touchDragXMax = state.xMax;
      state.touchDragYMin = state.yMin;
      state.touchDragYMax = state.yMax;
    }
  }

  // ===== Resize Observer =====
  function onResize() {
    resizeCanvas();
  }

  // ===== Module Definition =====
  window.CalcModules['graphing'] = {
    name: 'Graphing',

    render: function (container) {
      // Build function input rows
      var inputRows = '';
      for (var i = 0; i < 4; i++) {
        var color = COLORS[i];
        var placeholder = i === 0 ? 'e.g. sin(x), x^2 + 3*x - 1' : 'Enter function...';
        var val = state.functions[i].expr || '';
        inputRows += '' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">' +
            '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;flex-shrink:0;">' +
              '<input type="checkbox" id="graphEnable' + i + '" ' + (state.functions[i].enabled ? 'checked' : '') +
              ' style="accent-color:' + color + ';width:16px;height:16px;cursor:pointer;" />' +
              '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + color + ';flex-shrink:0;box-shadow:0 0 6px ' + color + '55;"></span>' +
            '</label>' +
            '<input type="text" id="graphInput' + i + '" value="' + window.CalcUtils.escapeHTML(val) + '"' +
            ' placeholder="' + placeholder + '"' +
            ' autocomplete="off" spellcheck="false"' +
            ' style="flex:1;background:rgba(255,255,255,0.06);border:1.5px solid rgba(255,255,255,0.1);border-radius:8px;' +
            'padding:8px 12px;color:#f1f5f9;font-family:\'JetBrains Mono\',monospace;font-size:13px;outline:none;' +
            'transition:border-color 0.2s,box-shadow 0.2s;" />' +
          '</div>';
      }

      container.innerHTML = '' +
        '<div style="padding:0 4px 16px 4px;max-width:700px;margin:0 auto;">' +

          // Function inputs
          '<div style="margin-bottom:12px;">' +
            '<div style="font-size:12px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;font-weight:500;">Functions</div>' +
            inputRows +
          '</div>' +

          // Controls row
          '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;align-items:center;">' +
            '<button id="graphZoomIn" style="' + btnStyle() + '">＋ Zoom In</button>' +
            '<button id="graphZoomOut" style="' + btnStyle() + '">－ Zoom Out</button>' +
            '<button id="graphReset" style="' + btnStyle() + '">⟲ Reset</button>' +
            '<button id="graphGridToggle" style="' + btnStyle() + 'background:rgba(129,140,248,0.25);border-color:rgba(129,140,248,0.4);">⊞ Grid</button>' +
            '<div style="flex:1;"></div>' +
            '<span id="graphViewport" style="font-size:11px;color:rgba(255,255,255,0.35);font-family:\'JetBrains Mono\',monospace;white-space:nowrap;"></span>' +
          '</div>' +

          // Canvas wrapper
          '<div style="position:relative;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);box-shadow:0 4px 24px rgba(0,0,0,0.3);">' +
            '<canvas id="graphCanvas" style="display:block;cursor:crosshair;touch-action:none;"></canvas>' +
            '<div id="graphCoordDisplay" style="position:absolute;bottom:8px;right:10px;font-family:\'JetBrains Mono\',monospace;' +
              'font-size:12px;color:rgba(255,255,255,0.7);background:rgba(0,0,0,0.55);backdrop-filter:blur(8px);' +
              'padding:4px 10px;border-radius:6px;border:1px solid rgba(255,255,255,0.08);pointer-events:none;' +
              'opacity:0;transition:opacity 0.15s;">x: 0  y: 0</div>' +
          '</div>' +

          // Help text
          '<div style="margin-top:10px;font-size:11px;color:rgba(255,255,255,0.3);line-height:1.6;">' +
            '<span style="color:rgba(255,255,255,0.45);font-weight:500;">Supported:</span> ' +
            'sin, cos, tan, asin, acos, atan, sinh, cosh, tanh, log, ln, sqrt, cbrt, abs, exp, floor, ceil, round, pi, e &nbsp;|&nbsp; ' +
            '<span style="color:rgba(255,255,255,0.45);">Drag</span> to pan, <span style="color:rgba(255,255,255,0.45);">scroll</span> to zoom, ' +
            '<span style="color:rgba(255,255,255,0.45);">hover</span> to trace' +
          '</div>' +
        '</div>';
    },

    init: function () {
      // Compile initial functions
      for (var i = 0; i < 4; i++) {
        var fn = compileExpression(state.functions[i].expr);
        state.functions[i].compiled = fn;
        state.functions[i].error = (state.functions[i].expr.trim() !== '' && fn === null);
        applyInputStyle(i);
      }

      // Resize canvas
      resizeCanvas();
      updateViewportDisplay();
      scheduleRedraw();

      // Canvas event listeners
      var canvas = document.getElementById('graphCanvas');
      if (canvas) {
        handlers.mousedown = onMouseDown;
        handlers.mousemove = onMouseMove;
        handlers.mouseup = onMouseUp;
        handlers.mouseleave = onMouseLeave;
        handlers.wheel = onWheel;
        handlers.touchstart = onTouchStart;
        handlers.touchmove = onTouchMove;
        handlers.touchend = onTouchEnd;

        canvas.addEventListener('mousedown', handlers.mousedown);
        canvas.addEventListener('mousemove', handlers.mousemove);
        canvas.addEventListener('mouseup', handlers.mouseup);
        canvas.addEventListener('mouseleave', handlers.mouseleave);
        canvas.addEventListener('wheel', handlers.wheel, { passive: false });
        canvas.addEventListener('touchstart', handlers.touchstart, { passive: false });
        canvas.addEventListener('touchmove', handlers.touchmove, { passive: false });
        canvas.addEventListener('touchend', handlers.touchend);
      }

      // Also listen for mouseup on window (in case user releases outside canvas)
      handlers.windowMouseUp = function () {
        state.isDragging = false;
        if (canvas) canvas.style.cursor = 'crosshair';
      };
      window.addEventListener('mouseup', handlers.windowMouseUp);

      // Resize
      handlers.resize = onResize;
      window.addEventListener('resize', handlers.resize);

      // Control buttons
      var zoomInBtn = document.getElementById('graphZoomIn');
      var zoomOutBtn = document.getElementById('graphZoomOut');
      var resetBtn = document.getElementById('graphReset');
      var gridBtn = document.getElementById('graphGridToggle');

      handlers.zoomIn = function (e) { zoomIn(); window.CalcUtils.createRipple(this, e); };
      handlers.zoomOut = function (e) { zoomOut(); window.CalcUtils.createRipple(this, e); };
      handlers.reset = function (e) { resetView(); window.CalcUtils.createRipple(this, e); };
      handlers.gridToggle = function (e) { toggleGrid(); window.CalcUtils.createRipple(this, e); };

      if (zoomInBtn) zoomInBtn.addEventListener('click', handlers.zoomIn);
      if (zoomOutBtn) zoomOutBtn.addEventListener('click', handlers.zoomOut);
      if (resetBtn) resetBtn.addEventListener('click', handlers.reset);
      if (gridBtn) gridBtn.addEventListener('click', handlers.gridToggle);

      // Function input listeners
      handlers.inputHandlers = [];
      handlers.checkboxHandlers = [];

      for (var idx = 0; idx < 4; idx++) {
        (function (i) {
          var input = document.getElementById('graphInput' + i);
          var checkbox = document.getElementById('graphEnable' + i);

          var inputHandler = function () {
            state.functions[i].expr = input.value;

            // Debounce
            if (state.debounceTimers[i]) clearTimeout(state.debounceTimers[i]);
            state.debounceTimers[i] = setTimeout(function () {
              var fn = compileExpression(state.functions[i].expr);
              state.functions[i].compiled = fn;
              state.functions[i].error = (state.functions[i].expr.trim() !== '' && fn === null);
              applyInputStyle(i);
              scheduleRedraw();
            }, 200);
          };

          var checkboxHandler = function () {
            state.functions[i].enabled = checkbox.checked;
            scheduleRedraw();
          };

          // Focus styling
          var focusHandler = function () {
            if (!state.functions[i].error) {
              input.style.borderColor = COLORS[i];
              input.style.boxShadow = '0 0 0 2px ' + COLORS[i] + '22';
            }
          };
          var blurHandler = function () {
            applyInputStyle(i);
          };

          if (input) {
            input.addEventListener('input', inputHandler);
            input.addEventListener('focus', focusHandler);
            input.addEventListener('blur', blurHandler);
          }
          if (checkbox) {
            checkbox.addEventListener('change', checkboxHandler);
          }

          handlers.inputHandlers.push({ input: input, handler: inputHandler, focus: focusHandler, blur: blurHandler });
          handlers.checkboxHandlers.push({ checkbox: checkbox, handler: checkboxHandler });
        })(idx);
      }

      // Hover effects for buttons
      var buttons = [zoomInBtn, zoomOutBtn, resetBtn, gridBtn];
      handlers.btnEnterHandlers = [];
      handlers.btnLeaveHandlers = [];
      buttons.forEach(function (btn) {
        if (!btn) return;
        var enter = function () { btn.style.background = 'rgba(255,255,255,0.12)'; };
        var leave = function () {
          if (btn.id === 'graphGridToggle' && state.showGrid) {
            btn.style.background = 'rgba(129,140,248,0.25)';
          } else {
            btn.style.background = 'rgba(255,255,255,0.06)';
          }
        };
        btn.addEventListener('mouseenter', enter);
        btn.addEventListener('mouseleave', leave);
        handlers.btnEnterHandlers.push({ btn: btn, handler: enter });
        handlers.btnLeaveHandlers.push({ btn: btn, handler: leave });
      });
    },

    destroy: function () {
      // Cancel animation frame
      if (state.animFrameId) {
        cancelAnimationFrame(state.animFrameId);
        state.animFrameId = null;
      }

      // Cancel debounce timers
      for (var i = 0; i < 4; i++) {
        if (state.debounceTimers[i]) {
          clearTimeout(state.debounceTimers[i]);
          state.debounceTimers[i] = null;
        }
      }

      // Remove canvas listeners
      var canvas = document.getElementById('graphCanvas');
      if (canvas) {
        canvas.removeEventListener('mousedown', handlers.mousedown);
        canvas.removeEventListener('mousemove', handlers.mousemove);
        canvas.removeEventListener('mouseup', handlers.mouseup);
        canvas.removeEventListener('mouseleave', handlers.mouseleave);
        canvas.removeEventListener('wheel', handlers.wheel);
        canvas.removeEventListener('touchstart', handlers.touchstart);
        canvas.removeEventListener('touchmove', handlers.touchmove);
        canvas.removeEventListener('touchend', handlers.touchend);
      }

      // Window listeners
      if (handlers.windowMouseUp) window.removeEventListener('mouseup', handlers.windowMouseUp);
      if (handlers.resize) window.removeEventListener('resize', handlers.resize);

      // Button listeners
      var zoomInBtn = document.getElementById('graphZoomIn');
      var zoomOutBtn = document.getElementById('graphZoomOut');
      var resetBtn = document.getElementById('graphReset');
      var gridBtn = document.getElementById('graphGridToggle');

      if (zoomInBtn && handlers.zoomIn) zoomInBtn.removeEventListener('click', handlers.zoomIn);
      if (zoomOutBtn && handlers.zoomOut) zoomOutBtn.removeEventListener('click', handlers.zoomOut);
      if (resetBtn && handlers.reset) resetBtn.removeEventListener('click', handlers.reset);
      if (gridBtn && handlers.gridToggle) gridBtn.removeEventListener('click', handlers.gridToggle);

      // Input handlers
      if (handlers.inputHandlers) {
        handlers.inputHandlers.forEach(function (h) {
          if (h.input) {
            h.input.removeEventListener('input', h.handler);
            h.input.removeEventListener('focus', h.focus);
            h.input.removeEventListener('blur', h.blur);
          }
        });
      }
      if (handlers.checkboxHandlers) {
        handlers.checkboxHandlers.forEach(function (h) {
          if (h.checkbox) h.checkbox.removeEventListener('change', h.handler);
        });
      }

      // Button hover handlers
      if (handlers.btnEnterHandlers) {
        handlers.btnEnterHandlers.forEach(function (h) {
          if (h.btn) h.btn.removeEventListener('mouseenter', h.handler);
        });
      }
      if (handlers.btnLeaveHandlers) {
        handlers.btnLeaveHandlers.forEach(function (h) {
          if (h.btn) h.btn.removeEventListener('mouseleave', h.handler);
        });
      }

      handlers = {};

      // Reset dragging state
      state.isDragging = false;
      state.showTrace = false;
      state.mouseX = -1;
      state.mouseY = -1;
    }
  };

  // ===== Helpers =====
  function btnStyle() {
    return 'background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:20px;' +
      'color:rgba(255,255,255,0.75);font-size:12px;font-family:Inter,sans-serif;font-weight:500;' +
      'padding:6px 14px;cursor:pointer;transition:all 0.2s;outline:none;position:relative;overflow:hidden;';
  }

  function applyInputStyle(i) {
    var input = document.getElementById('graphInput' + i);
    if (!input) return;

    if (state.functions[i].error) {
      input.style.borderColor = '#f87171';
      input.style.boxShadow = '0 0 0 2px rgba(248,113,113,0.15)';
    } else {
      input.style.borderColor = 'rgba(255,255,255,0.1)';
      input.style.boxShadow = 'none';
    }
  }

})();
