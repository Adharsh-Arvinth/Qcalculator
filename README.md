#  Quantum Scientific Calculator

> The world's first browser-based calculator combining **256-bit programming**, **quantum computing simulation**, and **13 unit converters** — all in pure vanilla JavaScript. Zero dependencies.

🔗 **[Live Demo →](https://adharsh-arvinth.github.io/Qcalculator/#scientific)**

---


## 🎯 Features

### Calculator Modes

#### 1. 🔬 Scientific Calculator
- Trigonometry: sin, cos, tan + inverses + hyperbolic (sinh, cosh, tanh)
- Logarithms: log₁₀, ln, log₂
- Powers & Roots: x², x³, xʸ, √, ∛, ʸ√x
- Advanced: factorial (x!), |x|, eˣ, 10ˣ, 2ˣ, percentage
- Constants: π, e, ANS (last answer)
- Memory: M+, MR, MC
- DEG/RAD toggle, 2nd function mode
- Live preview as you type
- Calculation history with back button

#### 2. 📈 Graphing Calculator
- Plot up to **4 simultaneous functions** with color coding
- Pan (drag) and zoom (scroll wheel / pinch)
- Trace mode — hover to see (x, y) coordinates
- Auto-scaling grid with labeled axes
- Supports: polynomials, trig, log, sqrt, abs, exp, floor, ceil
- Implicit multiplication: `2x`, `2sin(x)`, `2(x+1)`
- Singularity detection (handles tan(x) discontinuities)

#### 3. 💻 Programmer Calculator — *Up to 256-bit*
- **Word sizes**: BYTE (8), WORD (16), DWORD (32), QWORD (64), **128-bit**, **256-bit**
- Powered by **JavaScript BigInt** for arbitrary precision
- Simultaneous display in BIN / OCT / DEC / HEX
- Interactive **bit toggle grid** — click individual bits to flip
- Bitwise operations: NOT, Left Shift (≪), Right Shift (≫)
- Live "bits used" indicator
- Click any base row to switch input mode

#### 4. 📅 Date Calculator
- **Difference tab**: Select two dates → years, months, days, total days, weeks
- **Add/Subtract tab**: Start date ± years/months/days → result date
- Shows day-of-week for all dates

#### 5. ⚛️ Quantum Computing Calculator — *Novel*
Four sub-tabs:

| Tab | What It Does |
|---|---|
| **Qubit State** | Interactive Bloch sphere (Canvas 3D), θ/φ sliders, state vector α\|0⟩ + β\|1⟩, probability bars |
| **Gate Calculator** | Apply I, X, Y, Z, H, S, T, Rx(θ), Ry(θ), Rz(θ) gates, see matrix + output state, gate chaining |
| **Circuit Simulator** | 2–3 qubit wires, click to place gates (H, X, Y, Z, CNOT, SWAP), run simulation, probability bars |
| **Entanglement Lab** | Bell states (\|Φ+⟩, \|Φ-⟩, \|Ψ+⟩, \|Ψ-⟩), measurement collapse, Von Neumann entropy |

#### 6. 🔄 Unit Converters (13 types)

| Converter | Units | Notes |
|---|---|---|
| **Currency** | 25 currencies (USD, EUR, GBP, INR, JPY...) | **Live API rates** with offline fallback |
| **Volume** | mL, L, fl oz, cup, pint, quart, gallon, m³, cm³ | US + Imperial |
| **Length** | nm, µm, mm, cm, m, km, in, ft, yd, mi, nmi | |
| **Weight & Mass** | mg, g, kg, tonne, oz, lb, stone, short/long ton | |
| **Temperature** | °C, °F, K | Formula-based conversion |
| **Energy** | J, kJ, cal, kcal, Wh, kWh, eV, BTU, ft·lbf | |
| **Area** | mm²–km², in²–mi², acre, hectare | |
| **Speed** | m/s, km/h, mph, knots, ft/s, Mach | |
| **Time** | ns, µs, ms, s, min, hr, day, week, month, year | |
| **Power** | W, kW, MW, hp, BTU/h, ft·lbf/s | |
| **Data** | bit, byte, KB–PB, KiB–TiB | SI + binary prefixes |
| **Pressure** | Pa, kPa, MPa, bar, atm, psi, mmHg, torr | |
| **Angle** | °, rad, grad, arcmin, arcsec, turn | |

---

## 📂 Project Structure

```
Qcalculator/
├── index.html           # App shell — sidebar navigation + mode container
├── style.css            # Global dark glassmorphism theme (1100+ lines)
├── js/
│   ├── app.js           # Navigation controller, mode lifecycle, shared utils
│   ├── scientific.js    # Scientific calculator with history
│   ├── graphing.js      # Canvas-based function plotter
│   ├── programmer.js    # 256-bit BigInt programmer calculator
│   ├── date.js          # Date difference & arithmetic
│   ├── converter.js     # Factory-generated 13 unit converters
│   └── quantum.js       # Quantum computing — Complex math, gates, circuits
└── README.md
```

**Total**: ~180KB, 9 files, **zero dependencies**.

---

## 🔧 Technical Details

### Module Architecture

Every calculator mode registers with the same interface:

```javascript
window.CalcModules['mode-name'] = {
  name: 'Display Name',
  render: function(container) { /* inject HTML */ },
  init: function() { /* set up event listeners */ },
  destroy: function() { /* clean up listeners, timers */ }
};
```

The `app.js` controller handles mode switching: `destroy()` old → `render()` new → `init()` new.

### Key Implementation Details

| Module | Implementation |
|---|---|
| **Scientific** | Custom safe expression parser (no `eval()`), Lanczos gamma approximation for non-integer factorials |
| **Graphing** | HTML5 Canvas with `requestAnimationFrame`, retina/HiDPI support, adaptive grid spacing |
| **Programmer** | `BigInt` for 128/256-bit support, proper signed↔unsigned conversion, interactive bit grid |
| **Converters** | Factory pattern — one function generates all 13 modules from data tables |
| **Currency** | Fetches from `api.exchangerate-api.com/v4/latest/USD` (free, no API key), caches rates, static fallback |
| **Temperature** | Formula-based (C↔F↔K), not factor multiplication |
| **Quantum** | Custom `Complex` number class, matrix-vector multiplication, Kronecker products, Bloch sphere via Canvas 3D projection |

---

## ⌨️ Keyboard Shortcuts

### Scientific Mode
| Key | Action |
|---|---|
| `0`–`9` | Number input |
| `+` `-` `*` `/` | Operators |
| `(` `)` | Parentheses |
| `Enter` or `=` | Evaluate |
| `Backspace` | Delete last |
| `Delete` | Clear all |
| `!` | Factorial |
| `^` | Power |
| `Escape` | Close history |

### Programmer Mode
| Key | Action |
|---|---|
| `0`–`9`, `A`–`F` | Digit input (base-dependent) |
| `Backspace` | Delete last |
| `Delete` | Clear |

### General
| Key | Action |
|---|---|
| `Escape` | Close sidebar |

---

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/Adharsh-Arvinth/Qcalculator.git

# Open in browser — no build step needed
open Qcalculator/index.html
```

Or just visit the **[Live Demo](https://adharsh-arvinth.github.io/Qcalculator/)**.

---

## 🌐 Browser Support

- ✅ Chrome / Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Any browser supporting ES2020+ (BigInt, CSS backdrop-filter, Canvas API)

---

## 🎨 Design

- **Deep space glassmorphism** theme with animated gradient orbs
- **Color-coded buttons**: numbers, operators, scientific, utility — each with distinct palette
- **Ripple effects** and micro-animations on every interaction
- **Responsive**: works from 320px mobile to desktop
- **Fonts**: Inter (UI) + JetBrains Mono (numbers/code)

---

## 📝 License

MIT License — free for personal, educational, and commercial use.

---

## 🤝 Contributing

Contributions welcome! Fork, improve, and submit a pull request.

---

**Version**: 2.0 — Quantum Edition  
**Last Updated**: July 2026  
**Total Modes**: 5 Calculators + 13 Converters = **18 tools in one**
