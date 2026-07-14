# Quantum Scientific Calculator

A powerful, multi-mode scientific calculator web application featuring scientific, graphing, programmer, date, and quantum computing modes, along with 13 unit converters. Built with vanilla JavaScript, HTML5, and modern CSS.
https://adharsh-arvinth.github.io/calci/#scientific

## 🎯 Features

### Calculator Modes
1. **Scientific Calculator** - Advanced mathematical operations with trigonometry, logarithms, factorial, and more
2. **Graphing Calculator** - Plot and visualize mathematical functions with zoom and pan controls
3. **Programmer Calculator** - Binary, Octal, Decimal, and Hexadecimal conversions with bitwise operations
4. **Date Calculator** - Calculate date differences and perform date arithmetic
5. **Quantum Computing** - Quantum qubit operations and computations
6. **Unit Converters** (13 types)
   - Currency, Volume, Length, Weight & Mass
   - Temperature, Energy, Area, Speed, Time
   - Power, Data, Pressure, Angle

## 📂 Project Structure

```
calci/
├── index.html           # Main HTML structure
├── style.css            # Global styling & themes
├── js/
│   ├── app.js           # Core app controller & mode switching
│   ├── scientific.js    # Scientific calculator module
│   ├── graphing.js      # Graphing calculator module
│   ├── programmer.js    # Programmer calculator module
│   ├── date.js          # Date calculator module
│   ├── converter.js     # Unit converter module
│   └── quantum.js       # Quantum computing module
└── README.md            # This file
```

## 🔧 Core Modules & Functions

### app.js - Application Controller
**Purpose:** Manages navigation, mode switching, and module lifecycle

**Key Functions:**
- `openSidebar()` - Opens the navigation sidebar
- `closeSidebar()` - Closes the navigation sidebar
- `switchMode(modeName)` - Switches between calculator modes
- `window.CalcUtils.formatNumber(num)` - Formats numbers for display
- `window.CalcUtils.escapeHTML(str)` - HTML entity escaping
- `window.CalcUtils.createRipple(btn, e)` - Creates ripple effect on button click

**Global Variables:**
- `currentMode` - Currently active calculator module
- `currentModuleName` - Name of current mode
- `window.CalcModules` - Registry of all available calculator modules
- `window.CalcUtils` - Shared utility functions

---

### scientific.js - Scientific Calculator Module
**Purpose:** Provides advanced mathematical calculations with trigonometry, logarithms, and more

**Key Functions:**
- `toRad(deg)` - Converts degrees to radians
- `toDeg(rad)` - Converts radians to degrees
- `factorial(n)` - Calculates factorial of n
- `gammaApprox(z)` - Approximates gamma function
- `safeEval(expr)` - Safely evaluates mathematical expressions
- `safeEvalSimple(expr)` - Basic expression evaluator
- `updateDisplay()` - Updates calculator display
- `appendToExpression(raw, display)` - Appends to current expression
- `handleNumber(v)` - Handles number input
- `handleOperator(raw, display)` - Handles mathematical operators
- `handleFunction(fnRaw, fnDisplay)` - Handles function calls (sin, cos, log, etc.)
- `handleEquals()` - Evaluates the expression
- `handleClear()` - Clears all input
- `handleBackspace()` - Removes last character
- `livePreview()` - Shows live calculation preview
- `addHistory(expr, result)` - Adds calculation to history
- `renderHistory()` - Renders history panel
- `toggleShift()` - Toggles shift mode for alternate functions

**State Variables:**
```javascript
state = {
  expression: '',           // Internal expression
  displayExpr: '',          // Display-friendly expression
  result: '0',              // Current result
  lastAnswer: 0,            // Last calculated result
  isShift: false,           // Shift mode toggle
  isDeg: true,              // Degree/Radian mode
  memory: 0,                // Memory value
  hasMemory: false,         // Memory status
  history: [],              // Calculation history
  justEvaluated: false      // Post-evaluation flag
}
```

**Supported Operations:**
- Basic: +, −, ×, ÷
- Trigonometry: sin, cos, tan, sin⁻¹, cos⁻¹, tan⁻¹, sinh, cosh, tanh
- Logarithms: log (base 10), ln (natural), log₂
- Powers: xʸ, x², x³, √, ∛, ʸ√x
- Advanced: factorial, |x|, eˣ, 10ˣ, 2ˣ, %

---

### programmer.js - Programmer Calculator Module
**Purpose:** Binary, Octal, Decimal, Hexadecimal conversions with bitwise operations

**Key Functions:**
- `clampToWord(val)` - Clamps value to word size limits
- `toUnsigned(val)` - Converts to unsigned representation
- `formatBin(val)` - Formats as binary with spacing
- `formatOct(val)` - Formats as octal
- `formatDec(val)` - Formats as decimal
- `formatHex(val)` - Formats as hexadecimal
- `parseInput(str, base)` - Parses input in given base
- `updateAllDisplays()` - Updates all base displays
- `updateBitToggles()` - Updates bit toggle visualization
- `toggleBit(idx)` - Toggles individual bit
- `updateButtonStates()` - Enables/disables buttons based on base
- `handleProgAction(action, value)` - Handles programmer calculator actions
- `renderBitGrid()` - Renders bit toggle grid

**Key Variables:**
```javascript
currentBase = 'DEC';      // Current number base (BIN, OCT, DEC, HEX)
currentValue = 0;         // Current value
wordSize = 32;            // Word size (8, 16, 32, 64)
expression = '';          // Current input expression
```

**Supported Operations:**
- Base Conversions: Binary, Octal, Decimal, Hexadecimal
- Bitwise: AND, OR, XOR, NOT, Left Shift (≪), Right Shift (≫)
- Word Sizes: BYTE (8), WORD (16), DWORD (32), QWORD (64)
- Bit Toggling: Click individual bits to toggle

---

### graphing.js - Graphing Calculator Module
**Purpose:** Plot and visualize mathematical functions with interactive zoom and pan

**Key Functions:**
- `compileExpression(expr)` - Parses mathematical expressions
- `toCanvasX(x)` - Converts math coordinates to canvas X
- `toCanvasY(y)` - Converts math coordinates to canvas Y
- `toMathX(cx)` - Converts canvas X to math coordinates
- `toMathY(cy)` - Converts canvas Y to math coordinates
- `drawGraph()` - Draws the function curves and grid
- `niceStep(range, targetSteps)` - Calculates nice grid spacing
- `zoomIn()` - Zooms in at center
- `zoomOut()` - Zooms out from center
- `zoomAtPoint(factor, px, py)` - Zooms at specific point
- `resetView()` - Resets to default view (-10 to 10)
- `toggleGrid()` - Toggles grid display
- `resizeCanvas()` - Resizes canvas to fit container
- `getCanvasPos(e)` - Gets mouse position relative to canvas

**Key Variables:**
```javascript
xMin, xMax, yMin, yMax   // View bounds
xRange, yRange            // Current range
W, H                      // Canvas width & height
functions[]               // Array of function objects
state.showGrid            // Grid visibility
state.isDragging          // Pan state
```

**Features:**
- Input up to 4 simultaneous functions
- Interactive zoom and pan
- Grid toggle
- Axis display with labels
- Trace mode showing coordinates
- Function coloring (Indigo, Red, Green, Yellow)

---

### date.js - Date Calculator Module
**Purpose:** Calculate date differences and perform date arithmetic

**Key Functions:**
- `getDayName(date)` - Returns day name (Monday, Tuesday, etc.)
- `getMonthName(m)` - Returns month name
- `formatDate(d)` - Formats date as readable string
- `dateDifference(d1, d2)` - Calculates difference between two dates
- `addToDate(baseDate, years, months, days, subtract)` - Adds/subtracts from date
- `todayISO()` - Returns today's date in ISO format
- `calcDifference()` - Calculates and displays date difference
- `calcArith()` - Calculates date arithmetic
- `switchTab(tab)` - Switches between difference/arithmetic tabs

**Supported Operations:**
- Date Difference: Years, Months, Days, Weeks, Total Days
- Date Arithmetic: Add/Subtract Years, Months, Days

---

### converter.js - Unit Converter Module
**Purpose:** Convert between 13 different unit types

**Supported Converters:**
1. **Currency** - Live or fixed exchange rates (25 currencies)
2. **Volume** - mL, L, fl oz, cup, pint, gallon, m³
3. **Length** - mm, cm, m, km, in, ft, yd, mi, nmi
4. **Weight & Mass** - mg, g, kg, oz, lb, stone, ton
5. **Temperature** - Celsius, Fahrenheit, Kelvin
6. **Energy** - Joule, Calorie, Watt-hour, BTU, erg, eV
7. **Area** - mm², cm², m², km², in², ft², yd², acre, hectare
8. **Speed** - m/s, km/h, mph, knot, Mach
9. **Time** - ms, s, min, hr, day, week, month, year
10. **Power** - Watt, Kilowatt, Megawatt, Horsepower, BTU/hr
11. **Data** - Byte, KB, MB, GB, TB, bit, Kibibyte, Mebibyte, Gibibyte, Tebibyte
12. **Pressure** - Pa, kPa, atm, bar, psi, mmHg, Torr
13. **Angle** - Degree, Radian, Gradian, Arcminute, Arcsecond, Turn

**Key Functions:**
- `createConverterModule(key, displayName, units, isTemp, isCurrency)` - Factory function for converters
- `convert(value, fromIdx, toIdx)` - Performs unit conversion
- `convertByFactor(val, fromFactor, toFactor)` - Factor-based conversion
- `convertTemperature(val, fromName, toName)` - Temperature conversion
- `formatResult(num)` - Formats conversion result
- `fetchCurrencyRates(els)` - Fetches live currency rates

---

### quantum.js - Quantum Computing Module
**Purpose:** Quantum qubit operations and computations

**Key Classes/Functions:**
- `Complex(re, im)` - Complex number implementation
  - `.add(c)` - Addition
  - `.sub(c)` - Subtraction
  - `.mul(c)` - Multiplication
  - `.scale(s)` - Scalar multiplication
  - `.conjugate()` - Complex conjugate
  - `.magnitude()` - Magnitude/modulus
  - `.magnitudeSq()` - Magnitude squared
  - `.phase()` - Phase angle
  - `.toString()` - String representation
  
- Quantum Gates:
  - Pauli gates: I, X, Y, Z
  - Hadamard: H
  - Phase gates: S, T
  - Rotation gates: Rx, Ry, Rz
  - Multi-qubit: CNOT, SWAP
  
- Quantum Operations:
  - `applyGate(state, gate)` - Applies gate to state
  - `tensorProduct(a, b)` - Tensor product of states
  - `kroneckerMatrix(A, B)` - Kronecker product of matrices
  - `measureQubit(state, qubit, nQubits)` - Simulates measurement
  - `applyCNOT(state, control, target, nQubits)` - Applies CNOT gate
  - `applySWAP(state, q1, q2, nQubits)` - Applies SWAP gate
  - `vonNeumannEntropy(state4)` - Calculates entanglement entropy
  
- Visualization:
  - `drawBlochSphere()` - Renders 3D Bloch sphere
  - `drawCircuit()` - Draws quantum circuit diagram

**Key Variables:**
```javascript
theta, phi                // Bloch sphere angles
amplitude_0               // |0⟩ component (alpha)
amplitude_1               // |1⟩ component (beta)
gateChain[]               // Chain of applied gates
circuitQubits             // Number of qubits (2 or 3)
circuitGates[]            // Gates in circuit
entState[]                // Entangled state vector
```

**Quantum Tabs:**
1. **Qubit State** - Bloch sphere visualization
2. **Gate Calculator** - Apply gates step-by-step
3. **Circuit Simulator** - Build and run circuits
4. **Entanglement Lab** - Bell states and measurement

---

## 🎨 CSS Variables & Theming

Located in `style.css`:

**Color Scheme:**
```css
--bg-primary: #0a0a1a              /* Main background */
--bg-secondary: #111128            /* Secondary background */
--accent-primary: #818cf8          /* Primary accent (Indigo) */
--accent-secondary: #a78bfa        /* Secondary accent (Purple) */
--text-primary: #f1f5f9            /* Primary text */
--text-secondary: rgba(203, 213, 225, 0.7)  /* Secondary text */
--text-muted: rgba(148, 163, 184, 0.5)      /* Muted text */
```

**Button Classes:**
- `.btn-num` - Number buttons
- `.btn-op` - Operator buttons
- `.btn-equals` - Equals button
- `.btn-fn` - Function buttons
- `.btn-sci` - Scientific buttons
- `.btn-util` - Utility buttons

**Radius & Spacing:**
- `--radius-lg: 24px` - Large border radius
- `--radius-md: 16px` - Medium border radius
- `--radius-sm: 12px` - Small border radius
- `--radius-xs: 8px` - Extra small border radius

---

## 🚀 Getting Started

1. Clone or download the repository
2. Open `index.html` in a modern web browser
3. Use the sidebar to navigate between different calculator modes
4. Press `Escape` to close the sidebar

## ⌨️ Keyboard Shortcuts

**Scientific Calculator:**
- Numbers: 0-9
- Operators: `+`, `-`, `*`, `/`
- Parentheses: `(`, `)`
- Equals: `Enter` or `=`
- Clear: `Delete`
- Backspace: `Backspace`
- Factorial: `!`
- Power: `^`

**Programmer Calculator:**
- Hex digits: 0-F
- Backspace: `Backspace`
- Clear: `Delete`

**Graphing Calculator:**
- Scroll: Zoom in/out
- Drag: Pan the view
- Hover: Trace coordinates

---

## 🔐 Security Features

- Expression sanitization in scientific calculator
- HTML escaping for user input
- Safe evaluation of mathematical expressions
- No use of `eval()` - custom safe parser used
- Input validation for all conversions

---

## 🌐 Browser Support

- Chrome/Chromium (recommended)
- Firefox
- Safari
- Edge
- Any modern browser supporting:
  - ES5+ JavaScript
  - CSS Backdrop filters & Transforms
  - Canvas API
  - WebGL (optional, for enhanced graphics)

---

## 📝 License

This project is open source and available for personal and educational use.

---

## 🤝 Contributing

Feel free to fork, modify, and improve this calculator. Contributions are welcome!

---

**Last Updated:** 2026
**Version:** 2.0 (Quantum Edition)
**Features:** 7 Calculator Modes + 13 Unit Converters = 20 Tools in One
