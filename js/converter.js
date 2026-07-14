/**
 * Unit Converter Module — All 13 converter modes
 * Currency, Volume, Length, Weight, Temperature, Energy, Area,
 * Speed, Time, Power, Data, Pressure, Angle
 */
(function () {
  'use strict';

  window.CalcModules = window.CalcModules || {};

  // ============================================================
  // SHARED STYLES
  // ============================================================
  var STYLES = {
    wrapper: 'display:flex;flex-direction:column;gap:16px;padding:20px 16px;max-width:480px;margin:0 auto;height:100%;',
    unitGroup: 'background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:10px;transition:border-color 0.3s ease;',
    unitGroupFocused: 'border-color:rgba(129,140,248,0.5);',
    select: 'width:100%;padding:10px 14px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#f1f5f9;font-family:"Inter",sans-serif;font-size:0.9rem;outline:none;cursor:pointer;appearance:none;-webkit-appearance:none;-moz-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23818cf8\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;transition:border-color 0.3s ease,background 0.3s ease;',
    selectHover: 'border-color:rgba(129,140,248,0.4);background:rgba(255,255,255,0.09);',
    input: 'width:100%;padding:12px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;color:#f1f5f9;font-family:"JetBrains Mono",monospace;font-size:1.8rem;font-weight:500;outline:none;transition:border-color 0.3s ease,box-shadow 0.3s ease;',
    inputFocused: 'border-color:#818cf8;box-shadow:0 0 20px rgba(129,140,248,0.15);',
    label: 'font-family:"Inter",sans-serif;font-size:0.75rem;color:rgba(203,213,225,0.5);text-transform:uppercase;letter-spacing:0.5px;',
    swapBtn: 'display:flex;align-items:center;justify-content:center;width:48px;height:48px;margin:0 auto;background:rgba(129,140,248,0.15);border:1px solid rgba(129,140,248,0.3);border-radius:50%;color:#818cf8;font-size:1.4rem;cursor:pointer;transition:all 0.3s ease;user-select:none;position:relative;overflow:hidden;',
    swapBtnHover: 'background:rgba(129,140,248,0.25);transform:rotate(180deg);',
    formula: 'text-align:center;font-family:"JetBrains Mono",monospace;font-size:0.82rem;color:rgba(203,213,225,0.5);padding:8px 16px;background:rgba(255,255,255,0.02);border-radius:10px;border:1px solid rgba(255,255,255,0.04);',
    loading: 'display:flex;align-items:center;justify-content:center;gap:6px;padding:20px;color:rgba(203,213,225,0.5);font-family:"Inter",sans-serif;font-size:0.85rem;',
    rateInfo: 'text-align:center;font-family:"Inter",sans-serif;font-size:0.72rem;color:rgba(203,213,225,0.35);padding:4px 0;',
    dot: 'width:6px;height:6px;border-radius:50%;background:#818cf8;',
  };

  // ============================================================
  // UNIT DATA DEFINITIONS
  // ============================================================

  // Currency — static fallback rates (relative to USD)
  var CURRENCY_STATIC = {
    USD: 1, EUR: 0.92, GBP: 0.79, INR: 83.12, JPY: 149.50,
    AUD: 1.53, CAD: 1.36, CHF: 0.88, CNY: 7.24, KRW: 1325.0,
    BRL: 4.97, MXN: 17.15, SGD: 1.34, HKD: 7.82, NOK: 10.55,
    SEK: 10.45, DKK: 6.87, NZD: 1.63, ZAR: 18.65, RUB: 91.50,
    THB: 35.20, TWD: 31.50, AED: 3.67, SAR: 3.75, PHP: 55.80
  };

  var CURRENCY_INFO = {
    USD: { name: 'US Dollar', flag: '🇺🇸' },
    EUR: { name: 'Euro', flag: '🇪🇺' },
    GBP: { name: 'British Pound', flag: '🇬🇧' },
    INR: { name: 'Indian Rupee', flag: '🇮🇳' },
    JPY: { name: 'Japanese Yen', flag: '🇯🇵' },
    AUD: { name: 'Australian Dollar', flag: '🇦🇺' },
    CAD: { name: 'Canadian Dollar', flag: '🇨🇦' },
    CHF: { name: 'Swiss Franc', flag: '🇨🇭' },
    CNY: { name: 'Chinese Yuan', flag: '🇨🇳' },
    KRW: { name: 'South Korean Won', flag: '🇰🇷' },
    BRL: { name: 'Brazilian Real', flag: '🇧🇷' },
    MXN: { name: 'Mexican Peso', flag: '🇲🇽' },
    SGD: { name: 'Singapore Dollar', flag: '🇸🇬' },
    HKD: { name: 'Hong Kong Dollar', flag: '🇭🇰' },
    NOK: { name: 'Norwegian Krone', flag: '🇳🇴' },
    SEK: { name: 'Swedish Krona', flag: '🇸🇪' },
    DKK: { name: 'Danish Krone', flag: '🇩🇰' },
    NZD: { name: 'New Zealand Dollar', flag: '🇳🇿' },
    ZAR: { name: 'South African Rand', flag: '🇿🇦' },
    RUB: { name: 'Russian Ruble', flag: '🇷🇺' },
    THB: { name: 'Thai Baht', flag: '🇹🇭' },
    TWD: { name: 'Taiwan Dollar', flag: '🇹🇼' },
    AED: { name: 'UAE Dirham', flag: '🇦🇪' },
    SAR: { name: 'Saudi Riyal', flag: '🇸🇦' },
    PHP: { name: 'Philippine Peso', flag: '🇵🇭' }
  };

  // Volume (base: mL)
  var VOLUME_UNITS = [
    { name: 'Milliliter', abbr: 'mL', factor: 1 },
    { name: 'Liter', abbr: 'L', factor: 1000 },
    { name: 'US Gallon', abbr: 'gal', factor: 3785.41 },
    { name: 'US Quart', abbr: 'qt', factor: 946.353 },
    { name: 'US Pint', abbr: 'pt', factor: 473.176 },
    { name: 'US Cup', abbr: 'cup', factor: 236.588 },
    { name: 'US Fluid Ounce', abbr: 'fl oz', factor: 29.5735 },
    { name: 'Cubic Meter', abbr: 'm³', factor: 1e6 },
    { name: 'Cubic Centimeter', abbr: 'cm³', factor: 1 },
    { name: 'Imperial Gallon', abbr: 'imp gal', factor: 4546.09 },
    { name: 'Imperial Pint', abbr: 'imp pt', factor: 568.261 }
  ];

  // Length (base: m)
  var LENGTH_UNITS = [
    { name: 'Nanometer', abbr: 'nm', factor: 1e-9 },
    { name: 'Micrometer', abbr: 'μm', factor: 1e-6 },
    { name: 'Millimeter', abbr: 'mm', factor: 0.001 },
    { name: 'Centimeter', abbr: 'cm', factor: 0.01 },
    { name: 'Meter', abbr: 'm', factor: 1 },
    { name: 'Kilometer', abbr: 'km', factor: 1000 },
    { name: 'Inch', abbr: 'in', factor: 0.0254 },
    { name: 'Foot', abbr: 'ft', factor: 0.3048 },
    { name: 'Yard', abbr: 'yd', factor: 0.9144 },
    { name: 'Mile', abbr: 'mi', factor: 1609.344 },
    { name: 'Nautical Mile', abbr: 'nmi', factor: 1852 }
  ];

  // Weight (base: g)
  var WEIGHT_UNITS = [
    { name: 'Milligram', abbr: 'mg', factor: 0.001 },
    { name: 'Gram', abbr: 'g', factor: 1 },
    { name: 'Kilogram', abbr: 'kg', factor: 1000 },
    { name: 'Metric Tonne', abbr: 't', factor: 1e6 },
    { name: 'Ounce', abbr: 'oz', factor: 28.3495 },
    { name: 'Pound', abbr: 'lb', factor: 453.592 },
    { name: 'Stone', abbr: 'st', factor: 6350.29 },
    { name: 'Short Ton', abbr: 'US ton', factor: 907185 },
    { name: 'Long Ton', abbr: 'UK ton', factor: 1.016e6 }
  ];

  // Temperature — special, uses formulas
  var TEMP_UNITS = [
    { name: 'Celsius', abbr: '°C' },
    { name: 'Fahrenheit', abbr: '°F' },
    { name: 'Kelvin', abbr: 'K' }
  ];

  // Energy (base: J)
  var ENERGY_UNITS = [
    { name: 'Joule', abbr: 'J', factor: 1 },
    { name: 'Kilojoule', abbr: 'kJ', factor: 1000 },
    { name: 'Calorie', abbr: 'cal', factor: 4.184 },
    { name: 'Kilocalorie', abbr: 'kcal', factor: 4184 },
    { name: 'Watt-hour', abbr: 'Wh', factor: 3600 },
    { name: 'Kilowatt-hour', abbr: 'kWh', factor: 3.6e6 },
    { name: 'Electronvolt', abbr: 'eV', factor: 1.602e-19 },
    { name: 'BTU', abbr: 'BTU', factor: 1055.06 },
    { name: 'Foot-pound', abbr: 'ft·lbf', factor: 1.35582 }
  ];

  // Area (base: m²)
  var AREA_UNITS = [
    { name: 'Sq Millimeter', abbr: 'mm²', factor: 1e-6 },
    { name: 'Sq Centimeter', abbr: 'cm²', factor: 1e-4 },
    { name: 'Sq Meter', abbr: 'm²', factor: 1 },
    { name: 'Sq Kilometer', abbr: 'km²', factor: 1e6 },
    { name: 'Sq Inch', abbr: 'in²', factor: 6.4516e-4 },
    { name: 'Sq Foot', abbr: 'ft²', factor: 0.092903 },
    { name: 'Sq Yard', abbr: 'yd²', factor: 0.836127 },
    { name: 'Sq Mile', abbr: 'mi²', factor: 2.59e6 },
    { name: 'Acre', abbr: 'ac', factor: 4046.86 },
    { name: 'Hectare', abbr: 'ha', factor: 10000 }
  ];

  // Speed (base: m/s)
  var SPEED_UNITS = [
    { name: 'Meters per second', abbr: 'm/s', factor: 1 },
    { name: 'Kilometers per hour', abbr: 'km/h', factor: 0.277778 },
    { name: 'Miles per hour', abbr: 'mph', factor: 0.44704 },
    { name: 'Knots', abbr: 'kn', factor: 0.514444 },
    { name: 'Feet per second', abbr: 'ft/s', factor: 0.3048 },
    { name: 'Mach', abbr: 'Mach', factor: 343 }
  ];

  // Time (base: seconds)
  var TIME_UNITS = [
    { name: 'Nanosecond', abbr: 'ns', factor: 1e-9 },
    { name: 'Microsecond', abbr: 'μs', factor: 1e-6 },
    { name: 'Millisecond', abbr: 'ms', factor: 0.001 },
    { name: 'Second', abbr: 's', factor: 1 },
    { name: 'Minute', abbr: 'min', factor: 60 },
    { name: 'Hour', abbr: 'hr', factor: 3600 },
    { name: 'Day', abbr: 'day', factor: 86400 },
    { name: 'Week', abbr: 'wk', factor: 604800 },
    { name: 'Month', abbr: 'mo', factor: 2.628e6 },
    { name: 'Year', abbr: 'yr', factor: 3.154e7 }
  ];

  // Power (base: W)
  var POWER_UNITS = [
    { name: 'Watt', abbr: 'W', factor: 1 },
    { name: 'Kilowatt', abbr: 'kW', factor: 1000 },
    { name: 'Megawatt', abbr: 'MW', factor: 1e6 },
    { name: 'Horsepower', abbr: 'hp', factor: 745.7 },
    { name: 'BTU/hour', abbr: 'BTU/h', factor: 0.29307 },
    { name: 'Foot-pound/second', abbr: 'ft·lbf/s', factor: 1.35582 }
  ];

  // Data (base: bytes)
  var DATA_UNITS = [
    { name: 'Bit', abbr: 'b', factor: 0.125 },
    { name: 'Byte', abbr: 'B', factor: 1 },
    { name: 'Kilobyte', abbr: 'KB', factor: 1000 },
    { name: 'Megabyte', abbr: 'MB', factor: 1e6 },
    { name: 'Gigabyte', abbr: 'GB', factor: 1e9 },
    { name: 'Terabyte', abbr: 'TB', factor: 1e12 },
    { name: 'Petabyte', abbr: 'PB', factor: 1e15 },
    { name: 'Kibibyte', abbr: 'KiB', factor: 1024 },
    { name: 'Mebibyte', abbr: 'MiB', factor: 1048576 },
    { name: 'Gibibyte', abbr: 'GiB', factor: 1073741824 },
    { name: 'Tebibyte', abbr: 'TiB', factor: 1099511627776 }
  ];

  // Pressure (base: Pa)
  var PRESSURE_UNITS = [
    { name: 'Pascal', abbr: 'Pa', factor: 1 },
    { name: 'Kilopascal', abbr: 'kPa', factor: 1000 },
    { name: 'Megapascal', abbr: 'MPa', factor: 1e6 },
    { name: 'Bar', abbr: 'bar', factor: 100000 },
    { name: 'Atmosphere', abbr: 'atm', factor: 101325 },
    { name: 'PSI', abbr: 'psi', factor: 6894.76 },
    { name: 'mmHg', abbr: 'mmHg', factor: 133.322 },
    { name: 'Torr', abbr: 'Torr', factor: 133.322 }
  ];

  // Angle (base: degrees)
  var ANGLE_UNITS = [
    { name: 'Degree', abbr: '°', factor: 1 },
    { name: 'Radian', abbr: 'rad', factor: 57.2958 },
    { name: 'Gradian', abbr: 'gon', factor: 0.9 },
    { name: 'Arcminute', abbr: '′', factor: 1 / 60 },
    { name: 'Arcsecond', abbr: '″', factor: 1 / 3600 },
    { name: 'Turn', abbr: 'turn', factor: 360 }
  ];


  // ============================================================
  // TEMPERATURE CONVERSION FUNCTIONS
  // ============================================================
  function celsiusTo(val, to) {
    switch (to) {
      case 'Celsius': return val;
      case 'Fahrenheit': return val * 9 / 5 + 32;
      case 'Kelvin': return val + 273.15;
    }
  }

  function toCelsius(val, from) {
    switch (from) {
      case 'Celsius': return val;
      case 'Fahrenheit': return (val - 32) * 5 / 9;
      case 'Kelvin': return val - 273.15;
    }
  }

  function convertTemperature(val, fromName, toName) {
    var c = toCelsius(val, fromName);
    return celsiusTo(c, toName);
  }

  function getTempFormula(fromName, toName) {
    var key = fromName + '->' + toName;
    var formulas = {
      'Celsius->Fahrenheit': '°F = °C × 9/5 + 32',
      'Celsius->Kelvin': 'K = °C + 273.15',
      'Fahrenheit->Celsius': '°C = (°F − 32) × 5/9',
      'Fahrenheit->Kelvin': 'K = (°F − 32) × 5/9 + 273.15',
      'Kelvin->Celsius': '°C = K − 273.15',
      'Kelvin->Fahrenheit': '°F = (K − 273.15) × 9/5 + 32',
      'Celsius->Celsius': '°C = °C',
      'Fahrenheit->Fahrenheit': '°F = °F',
      'Kelvin->Kelvin': 'K = K'
    };
    return formulas[key] || '';
  }


  // ============================================================
  // GENERIC FACTOR-BASED CONVERSION
  // ============================================================
  function convertByFactor(val, fromFactor, toFactor) {
    // value_in_base = val * fromFactor
    // result = value_in_base / toFactor
    return (val * fromFactor) / toFactor;
  }


  // ============================================================
  // FORMAT RESULT WITH FULL PRECISION
  // ============================================================
  function formatResult(num) {
    if (typeof num !== 'number' || isNaN(num)) return '';
    if (!isFinite(num)) return num > 0 ? '∞' : '-∞';
    if (num === 0) return '0';

    var abs = Math.abs(num);
    // Use exponential for very large or very small
    if (abs >= 1e15 || (abs < 1e-10 && abs !== 0)) {
      return num.toExponential(10);
    }
    // High precision, remove trailing zeros
    var str = num.toPrecision(15);
    var parsed = parseFloat(str);
    return String(parsed);
  }

  function formatFormulaNum(num) {
    if (typeof num !== 'number' || isNaN(num)) return '?';
    if (!isFinite(num)) return '∞';
    var abs = Math.abs(num);
    if (abs >= 1e9 || (abs < 1e-6 && abs !== 0)) {
      return num.toExponential(6);
    }
    var str = num.toPrecision(8);
    return String(parseFloat(str));
  }


  // ============================================================
  // CURRENCY RATE CACHE
  // ============================================================
  var currencyCache = {
    rates: null,
    lastUpdated: null,
    loading: false,
    fetched: false
  };


  // ============================================================
  // HTML BUILDER for the converter UI
  // ============================================================
  function buildConverterHTML(id, options, isTemp, isCurrency) {
    var topIdx = 0;
    var bottomIdx = options.length > 1 ? 1 : 0;

    var optionsHTML = '';
    for (var i = 0; i < options.length; i++) {
      optionsHTML += '<option value="' + i + '">' + window.CalcUtils.escapeHTML(options[i].label) + '</option>';
    }

    var loadingHTML = '';
    if (isCurrency) {
      loadingHTML = '<div id="' + id + '-loading" style="' + STYLES.loading + '">' +
        '<span style="' + STYLES.dot + 'animation:convPulse 1.4s infinite ease-in-out;"></span>' +
        '<span style="' + STYLES.dot + 'animation:convPulse 1.4s infinite ease-in-out 0.2s;"></span>' +
        '<span style="' + STYLES.dot + 'animation:convPulse 1.4s infinite ease-in-out 0.4s;"></span>' +
        '<span style="margin-left:6px;">Loading live rates…</span>' +
        '</div>';
    }

    var rateInfoHTML = '';
    if (isCurrency) {
      rateInfoHTML = '<div id="' + id + '-rateinfo" style="' + STYLES.rateInfo + 'display:none;"></div>';
    }

    var html = '<style>' +
      '@keyframes convPulse{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}' +
      '@keyframes convSwapSpin{0%{transform:rotate(0deg)}100%{transform:rotate(180deg)}}' +
      '#' + id + '-top-group:focus-within{border-color:rgba(129,140,248,0.5)!important}' +
      '#' + id + '-bot-group:focus-within{border-color:rgba(129,140,248,0.5)!important}' +
      '#' + id + '-top-select:hover,#' + id + '-bot-select:hover{' + STYLES.selectHover + '}' +
      '#' + id + '-top-input:focus,#' + id + '-bot-input:focus{' + STYLES.inputFocused + '}' +
      '#' + id + '-swap:hover{background:rgba(129,140,248,0.25)!important;box-shadow:0 0 20px rgba(129,140,248,0.2);}' +
      '</style>' +
      '<div style="' + STYLES.wrapper + '">' +
        loadingHTML +
        '<div id="' + id + '-content" style="display:flex;flex-direction:column;gap:16px;' + (isCurrency ? 'display:none;' : '') + '">' +
          // Top unit group
          '<div id="' + id + '-top-group" style="' + STYLES.unitGroup + '">' +
            '<label style="' + STYLES.label + '">From</label>' +
            '<select id="' + id + '-top-select" style="' + STYLES.select + '">' + optionsHTML + '</select>' +
            '<input id="' + id + '-top-input" type="text" inputmode="decimal" value="1" placeholder="Enter value" ' +
              'style="' + STYLES.input + '" autocomplete="off" />' +
          '</div>' +

          // Swap button
          '<div style="display:flex;align-items:center;justify-content:center;">' +
            '<button id="' + id + '-swap" style="' + STYLES.swapBtn + '" title="Swap units">' +
              '↕' +
            '</button>' +
          '</div>' +

          // Bottom unit group
          '<div id="' + id + '-bot-group" style="' + STYLES.unitGroup + '">' +
            '<label style="' + STYLES.label + '">To</label>' +
            '<select id="' + id + '-bot-select" style="' + STYLES.select + '">' +
              optionsHTML.replace('value="0"', 'value="0"').replace('value="' + bottomIdx + '"', 'value="' + bottomIdx + '" selected') +
            '</select>' +
            '<input id="' + id + '-bot-input" type="text" inputmode="decimal" value="" placeholder="Result" ' +
              'style="' + STYLES.input + '" autocomplete="off" />' +
          '</div>' +

          // Formula display
          '<div id="' + id + '-formula" style="' + STYLES.formula + '"></div>' +

          rateInfoHTML +
        '</div>' +
      '</div>';

    return html;
  }


  // ============================================================
  // GENERIC CONVERTER FACTORY
  // ============================================================
  function createConverterModule(key, displayName, units, isTemp, isCurrency) {
    var id = key.replace(/-/g, '');
    var state = {
      topIdx: 0,
      botIdx: units.length > 1 ? 1 : 0,
      lastEdited: 'top', // which input was last edited
      handlers: {},
      abortController: null
    };

    // Build option labels
    var options = [];
    for (var i = 0; i < units.length; i++) {
      var u = units[i];
      if (isCurrency) {
        var info = CURRENCY_INFO[u.code] || {};
        options.push({ label: (info.flag || '') + ' ' + u.code + ' — ' + (info.name || u.code) });
      } else {
        options.push({ label: u.name + (u.abbr ? ' (' + u.abbr + ')' : '') });
      }
    }

    function getElements() {
      return {
        topSelect: document.getElementById(id + '-top-select'),
        botSelect: document.getElementById(id + '-bot-select'),
        topInput: document.getElementById(id + '-top-input'),
        botInput: document.getElementById(id + '-bot-input'),
        formula: document.getElementById(id + '-formula'),
        swap: document.getElementById(id + '-swap'),
        loading: document.getElementById(id + '-loading'),
        content: document.getElementById(id + '-content'),
        rateinfo: document.getElementById(id + '-rateinfo')
      };
    }

    function convert(value, fromIdx, toIdx) {
      if (isTemp) {
        return convertTemperature(value, units[fromIdx].name, units[toIdx].name);
      }
      if (isCurrency) {
        var rates = currencyCache.rates || CURRENCY_STATIC;
        var fromCode = units[fromIdx].code;
        var toCode = units[toIdx].code;
        var fromRate = rates[fromCode] || 1;
        var toRate = rates[toCode] || 1;
        return value * (toRate / fromRate);
      }
      return convertByFactor(value, units[fromIdx].factor, units[toIdx].factor);
    }

    function updateFormula(els) {
      var fromIdx = state.topIdx;
      var toIdx = state.botIdx;

      if (isTemp) {
        els.formula.textContent = getTempFormula(units[fromIdx].name, units[toIdx].name);
        return;
      }

      // Show "1 fromUnit = X toUnit"
      var oneConverted = convert(1, fromIdx, toIdx);
      var fromLabel = isCurrency ? units[fromIdx].code : (units[fromIdx].abbr || units[fromIdx].name);
      var toLabel = isCurrency ? units[toIdx].code : (units[toIdx].abbr || units[toIdx].name);
      els.formula.textContent = '1 ' + fromLabel + ' = ' + formatFormulaNum(oneConverted) + ' ' + toLabel;
    }

    function doConversion(direction) {
      var els = getElements();
      if (!els.topInput || !els.botInput) return;

      state.topIdx = parseInt(els.topSelect.value, 10);
      state.botIdx = parseInt(els.botSelect.value, 10);

      if (direction === 'top') {
        var val = parseFloat(els.topInput.value);
        if (isNaN(val) || els.topInput.value.trim() === '') {
          els.botInput.value = '';
        } else {
          var result = convert(val, state.topIdx, state.botIdx);
          els.botInput.value = formatResult(result);
        }
      } else {
        var val2 = parseFloat(els.botInput.value);
        if (isNaN(val2) || els.botInput.value.trim() === '') {
          els.topInput.value = '';
        } else {
          var result2 = convert(val2, state.botIdx, state.topIdx);
          els.topInput.value = formatResult(result2);
        }
      }

      updateFormula(els);
    }

    function showContent(els) {
      if (els.loading) els.loading.style.display = 'none';
      if (els.content) els.content.style.display = 'flex';
    }

    function fetchCurrencyRates(els) {
      if (currencyCache.fetched && currencyCache.rates) {
        showContent(els);
        doConversion('top');
        if (els.rateinfo && currencyCache.lastUpdated) {
          els.rateinfo.style.display = 'block';
          els.rateinfo.textContent = 'Last updated: ' + currencyCache.lastUpdated;
        }
        return;
      }

      if (currencyCache.loading) {
        // Another instance is loading, wait for it
        var checkInterval = setInterval(function () {
          if (!currencyCache.loading) {
            clearInterval(checkInterval);
            showContent(els);
            doConversion('top');
            if (els.rateinfo && currencyCache.lastUpdated) {
              els.rateinfo.style.display = 'block';
              els.rateinfo.textContent = 'Last updated: ' + currencyCache.lastUpdated;
            }
          }
        }, 200);
        state.handlers._currencyInterval = checkInterval;
        return;
      }

      currencyCache.loading = true;

      fetch('https://api.exchangerate-api.com/v4/latest/USD')
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function (data) {
          currencyCache.rates = data.rates || CURRENCY_STATIC;
          currencyCache.lastUpdated = data.date || new Date().toISOString().slice(0, 10);
          currencyCache.fetched = true;
          currencyCache.loading = false;

          var currentEls = getElements();
          showContent(currentEls);
          doConversion('top');
          if (currentEls.rateinfo) {
            currentEls.rateinfo.style.display = 'block';
            currentEls.rateinfo.textContent = 'Last updated: ' + currencyCache.lastUpdated;
          }
        })
        .catch(function () {
          currencyCache.rates = CURRENCY_STATIC;
          currencyCache.lastUpdated = 'Offline (static rates)';
          currencyCache.fetched = true;
          currencyCache.loading = false;

          var currentEls = getElements();
          showContent(currentEls);
          doConversion('top');
          if (currentEls.rateinfo) {
            currentEls.rateinfo.style.display = 'block';
            currentEls.rateinfo.textContent = 'Using static fallback rates';
          }
        });
    }

    // ========== MODULE ==========
    window.CalcModules[key] = {
      name: displayName,

      render: function (container) {
        container.innerHTML = buildConverterHTML(id, options, isTemp, isCurrency);

        // Fix the bottom select default
        var botSel = document.getElementById(id + '-bot-select');
        if (botSel) {
          botSel.value = String(state.botIdx);
        }
      },

      init: function () {
        var els = getElements();
        if (!els.topInput) return;

        // --- Top input handler ---
        state.handlers.topInput = function () {
          state.lastEdited = 'top';
          doConversion('top');
        };
        els.topInput.addEventListener('input', state.handlers.topInput);

        // --- Bottom input handler ---
        state.handlers.botInput = function () {
          state.lastEdited = 'bottom';
          doConversion('bottom');
        };
        els.botInput.addEventListener('input', state.handlers.botInput);

        // --- Top select handler ---
        state.handlers.topSelect = function () {
          state.topIdx = parseInt(els.topSelect.value, 10);
          doConversion(state.lastEdited);
        };
        els.topSelect.addEventListener('change', state.handlers.topSelect);

        // --- Bottom select handler ---
        state.handlers.botSelect = function () {
          state.botIdx = parseInt(els.botSelect.value, 10);
          doConversion(state.lastEdited);
        };
        els.botSelect.addEventListener('change', state.handlers.botSelect);

        // --- Swap button ---
        state.handlers.swap = function (e) {
          window.CalcUtils.createRipple(els.swap, e);

          // Animate spin
          els.swap.style.transition = 'transform 0.35s cubic-bezier(0.4,0,0.2,1)';
          els.swap.style.transform = 'rotate(180deg)';
          setTimeout(function () {
            els.swap.style.transform = 'rotate(0deg)';
          }, 350);

          // Swap indices
          var tmp = els.topSelect.value;
          els.topSelect.value = els.botSelect.value;
          els.botSelect.value = tmp;

          state.topIdx = parseInt(els.topSelect.value, 10);
          state.botIdx = parseInt(els.botSelect.value, 10);

          // Swap input values
          var topVal = els.topInput.value;
          els.topInput.value = els.botInput.value;
          els.botInput.value = topVal;

          updateFormula(els);
        };
        els.swap.addEventListener('click', state.handlers.swap);

        // --- Initialize ---
        if (isCurrency) {
          fetchCurrencyRates(els);
        } else {
          doConversion('top');
        }
      },

      destroy: function () {
        var els = getElements();
        if (els.topInput && state.handlers.topInput) {
          els.topInput.removeEventListener('input', state.handlers.topInput);
        }
        if (els.botInput && state.handlers.botInput) {
          els.botInput.removeEventListener('input', state.handlers.botInput);
        }
        if (els.topSelect && state.handlers.topSelect) {
          els.topSelect.removeEventListener('change', state.handlers.topSelect);
        }
        if (els.botSelect && state.handlers.botSelect) {
          els.botSelect.removeEventListener('change', state.handlers.botSelect);
        }
        if (els.swap && state.handlers.swap) {
          els.swap.removeEventListener('click', state.handlers.swap);
        }
        if (state.handlers._currencyInterval) {
          clearInterval(state.handlers._currencyInterval);
        }
        state.handlers = {};
      }
    };
  }


  // ============================================================
  // BUILD CURRENCY UNITS ARRAY
  // ============================================================
  var CURRENCY_CODES = [
    'USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'KRW',
    'BRL', 'MXN', 'SGD', 'HKD', 'NOK', 'SEK', 'DKK', 'NZD', 'ZAR', 'RUB',
    'THB', 'TWD', 'AED', 'SAR', 'PHP'
  ];
  var CURRENCY_UNITS = [];
  for (var i = 0; i < CURRENCY_CODES.length; i++) {
    CURRENCY_UNITS.push({ code: CURRENCY_CODES[i], name: CURRENCY_INFO[CURRENCY_CODES[i]].name });
  }


  // ============================================================
  // REGISTER ALL 13 CONVERTER MODULES
  // ============================================================
  createConverterModule('converter-currency',    'Currency',       CURRENCY_UNITS,   false, true);
  createConverterModule('converter-volume',      'Volume',         VOLUME_UNITS,     false, false);
  createConverterModule('converter-length',      'Length',         LENGTH_UNITS,     false, false);
  createConverterModule('converter-weight',      'Weight & Mass',  WEIGHT_UNITS,     false, false);
  createConverterModule('converter-temperature', 'Temperature',    TEMP_UNITS,       true,  false);
  createConverterModule('converter-energy',      'Energy',         ENERGY_UNITS,     false, false);
  createConverterModule('converter-area',        'Area',           AREA_UNITS,       false, false);
  createConverterModule('converter-speed',       'Speed',          SPEED_UNITS,      false, false);
  createConverterModule('converter-time',        'Time',           TIME_UNITS,       false, false);
  createConverterModule('converter-power',       'Power',          POWER_UNITS,      false, false);
  createConverterModule('converter-data',        'Data',           DATA_UNITS,       false, false);
  createConverterModule('converter-pressure',    'Pressure',       PRESSURE_UNITS,   false, false);
  createConverterModule('converter-angle',       'Angle',          ANGLE_UNITS,      false, false);

})();
