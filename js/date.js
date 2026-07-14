/**
 * Date Calculator Module
 * Date difference & date arithmetic (add/subtract days/months/years).
 */
(function () {
  'use strict';
  window.CalcModules = window.CalcModules || {};

  var activeTab = 'difference';
  var keyHandler = null;

  function getDayName(date) {
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  }

  function getMonthName(m) {
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[m];
  }

  function formatDate(d) {
    return getDayName(d) + ', ' + getMonthName(d.getMonth()) + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  function dateDifference(d1, d2) {
    if (d1 > d2) { var tmp = d1; d1 = d2; d2 = tmp; }

    var totalMs = d2.getTime() - d1.getTime();
    var totalDays = Math.floor(totalMs / 86400000);

    // Calculate years, months, days
    var years = d2.getFullYear() - d1.getFullYear();
    var months = d2.getMonth() - d1.getMonth();
    var days = d2.getDate() - d1.getDate();

    if (days < 0) {
      months--;
      var prevMonth = new Date(d2.getFullYear(), d2.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) { years--; months += 12; }

    // Weeks
    var weeks = Math.floor(totalDays / 7);
    var remainDays = totalDays % 7;

    return {
      years: years, months: months, days: days,
      totalDays: totalDays, weeks: weeks, remainDays: remainDays
    };
  }

  function addToDate(baseDate, years, months, days, subtract) {
    var mult = subtract ? -1 : 1;
    var result = new Date(baseDate);
    result.setFullYear(result.getFullYear() + years * mult);
    result.setMonth(result.getMonth() + months * mult);
    result.setDate(result.getDate() + days * mult);
    return result;
  }

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function calcDifference() {
    var from = document.getElementById('dateFrom');
    var to = document.getElementById('dateTo');
    var res = document.getElementById('dateResult');
    if (!from || !to || !res) return;
    if (!from.value || !to.value) { res.innerHTML = '<span class="date-hint">Select both dates to see the difference</span>'; return; }

    var d1 = new Date(from.value + 'T00:00:00');
    var d2 = new Date(to.value + 'T00:00:00');
    var diff = dateDifference(d1, d2);

    var parts = [];
    if (diff.years > 0) parts.push('<span class="date-num">' + diff.years + '</span> ' + (diff.years === 1 ? 'year' : 'years'));
    if (diff.months > 0) parts.push('<span class="date-num">' + diff.months + '</span> ' + (diff.months === 1 ? 'month' : 'months'));
    if (diff.days > 0 || parts.length === 0) parts.push('<span class="date-num">' + diff.days + '</span> ' + (diff.days === 1 ? 'day' : 'days'));

    res.innerHTML =
      '<div class="date-result-main">' + parts.join(', ') + '</div>' +
      '<div class="date-result-detail">' +
        '<div>Or <span class="date-num">' + diff.totalDays + '</span> total days</div>' +
        '<div>Or <span class="date-num">' + diff.weeks + '</span> weeks and <span class="date-num">' + diff.remainDays + '</span> days</div>' +
        '<div class="date-result-days">' + formatDate(d1) + ' → ' + formatDate(d2) + '</div>' +
      '</div>';
  }

  function calcArith() {
    var base = document.getElementById('dateBase');
    var yrs = document.getElementById('dateYears');
    var mos = document.getElementById('dateMonths');
    var ds = document.getElementById('dateDays');
    var sub = document.getElementById('dateSubtract');
    var res = document.getElementById('dateArithResult');
    if (!base || !res) return;
    if (!base.value) { res.innerHTML = '<span class="date-hint">Select a start date</span>'; return; }

    var baseDate = new Date(base.value + 'T00:00:00');
    var y = parseInt(yrs ? yrs.value : 0) || 0;
    var m = parseInt(mos ? mos.value : 0) || 0;
    var d = parseInt(ds ? ds.value : 0) || 0;
    var isSubtract = sub ? sub.checked : false;

    var result = addToDate(baseDate, y, m, d, isSubtract);

    var diff = dateDifference(baseDate, result);
    res.innerHTML =
      '<div class="date-result-main">' + formatDate(result) + '</div>' +
      '<div class="date-result-detail">' +
        '<div>' + (isSubtract ? 'Subtracted' : 'Added') + ' ' + y + 'y ' + m + 'm ' + d + 'd from ' + formatDate(baseDate) + '</div>' +
        '<div>That\'s <span class="date-num">' + diff.totalDays + '</span> total days ' + (isSubtract ? 'before' : 'after') + '</div>' +
      '</div>';
  }

  function switchTab(tab) {
    activeTab = tab;
    var diffTab = document.getElementById('dateDiffTab');
    var arithTab = document.getElementById('dateArithTab');
    var diffContent = document.getElementById('dateDiffContent');
    var arithContent = document.getElementById('dateArithContent');
    if (diffTab) diffTab.classList.toggle('active', tab === 'difference');
    if (arithTab) arithTab.classList.toggle('active', tab === 'arithmetic');
    if (diffContent) diffContent.style.display = tab === 'difference' ? 'block' : 'none';
    if (arithContent) arithContent.style.display = tab === 'arithmetic' ? 'block' : 'none';
  }

  window.CalcModules['date'] = {
    name: 'Date Calculation',

    render: function (container) {
      var today = todayISO();
      container.innerHTML =
        '<div class="date-calc">' +
          '<div class="date-tabs">' +
            '<button class="date-tab active" id="dateDiffTab">Difference</button>' +
            '<button class="date-tab" id="dateArithTab">Add / Subtract</button>' +
          '</div>' +

          // Difference tab
          '<div class="date-content" id="dateDiffContent">' +
            '<div class="date-field"><label class="date-label">From</label><input type="date" class="date-input" id="dateFrom" value="' + today + '"></div>' +
            '<div class="date-field"><label class="date-label">To</label><input type="date" class="date-input" id="dateTo" value="' + today + '"></div>' +
            '<div class="date-result-box" id="dateResult"><span class="date-hint">Select both dates to see the difference</span></div>' +
          '</div>' +

          // Arithmetic tab
          '<div class="date-content" id="dateArithContent" style="display:none">' +
            '<div class="date-field"><label class="date-label">Start date</label><input type="date" class="date-input" id="dateBase" value="' + today + '"></div>' +
            '<div class="date-arith-toggle"><label class="date-toggle-label"><input type="checkbox" id="dateSubtract"><span class="date-toggle-text">Subtract</span></label></div>' +
            '<div class="date-arith-inputs">' +
              '<div class="date-arith-field"><label>Years</label><input type="number" class="date-num-input" id="dateYears" value="0" min="0" max="9999"></div>' +
              '<div class="date-arith-field"><label>Months</label><input type="number" class="date-num-input" id="dateMonths" value="0" min="0" max="999"></div>' +
              '<div class="date-arith-field"><label>Days</label><input type="number" class="date-num-input" id="dateDays" value="0" min="0" max="99999"></div>' +
            '</div>' +
            '<div class="date-result-box" id="dateArithResult"><span class="date-hint">Select a start date and enter values</span></div>' +
          '</div>' +
        '</div>';
    },

    init: function () {
      activeTab = 'difference';

      // Tab switching
      var diffTab = document.getElementById('dateDiffTab');
      var arithTab = document.getElementById('dateArithTab');
      if (diffTab) diffTab.addEventListener('click', function () { switchTab('difference'); });
      if (arithTab) arithTab.addEventListener('click', function () { switchTab('arithmetic'); });

      // Difference inputs
      var from = document.getElementById('dateFrom');
      var to = document.getElementById('dateTo');
      if (from) from.addEventListener('change', calcDifference);
      if (to) to.addEventListener('change', calcDifference);

      // Arithmetic inputs
      ['dateBase', 'dateYears', 'dateMonths', 'dateDays', 'dateSubtract'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', calcArith);
      });

      calcDifference();
    },

    destroy: function () {
      // No global listeners to clean up
    }
  };
})();
