# OddsPilot — Sports Odds Calculator & Hedge Analyzer

A premium, production-quality sports odds analysis platform built with React, TypeScript, Vite, and Tailwind CSS. OddsPilot is a calculator tool — it does not place bets, connect to betting accounts, or require deposits.

![OddsPilot](https://img.shields.io/badge/OddsPilot-v1.0.0-blue) ![Tests](https://img.shields.io/badge/tests-45%20passed-green) ![License](https://img.shields.io/badge/license-MIT-gray)

## Features

### 🛡️ Multi-Bet Hedge Calculator (Main Feature)
- Add unlimited existing bets on the same selection
- Each bet has stake, decimal odds, optional bookmaker and date
- Calculates equal-outcome hedge stake using the formula: `H = R / [1 + (O-1)(1-c)]`
- Shows net results for both outcomes with green/red indicators
- Correctly classifies: guaranteed profit, break-even, or guaranteed loss
- Supports custom hedge stakes with comparison
- Stake rounding with configurable increments
- Three-way market support (Home/Draw/Away)
- Commission handling on opposite selection winnings

### 📊 Dashboard
- Quick access to all tools
- Summary statistics from saved data
- Recent calculations list
- No fake data — all stats come from user's saved calculations

### 🔄 Odds Converter
- Decimal ↔ Fractional ↔ American odds
- Implied probability with margin explanation
- Input validation for all formats

### 📐 Probability Calculator
- Implied probability from odds
- Expected value (EV) with user probability estimates
- Clear labeling of estimates vs verified predictions

### 📈 Arbitrage Analyzer
- Multi-outcome support (2-way, 3-way, custom)
- Implied probability sum analysis
- Optimal stake allocation
- Commission-adjusted profit calculation
- Clear warnings about market compatibility

### 📝 Multi-Bet Tracker
- Save, search, filter, and manage calculations
- Export to JSON/CSV
- Import from JSON
- Summary statistics

### ⚙️ Settings
- Currency selection (USD, EUR, GBP, INR, AUD, CAD, JPY)
- Default odds format, sport, market type
- Stake increment preferences
- All preferences persisted to localStorage

## Supported Sports
- 🏏 Cricket
- ⚽ Football / Soccer
- 🎾 Tennis
- 🏀 Basketball
- 🏈 American Football
- 🎮 Esports
- 🏆 Other / Custom

## Tech Stack
- **React 18** with TypeScript
- **Vite 5** for dev/build
- **Tailwind CSS 3** for styling
- **React Router 6** for navigation
- **Recharts** for charting (available)
- **Lucide React** for icons
- **Vitest** for unit testing
- **localStorage** for persistence

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm 8+

### Install
```bash
npm install
```

### Development
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173)

### Run Tests
```bash
npm test
```

### Build for Production
```bash
npm run build
```

## Testing

45 unit tests covering:
1. Single bet hedge calculation
2. Multiple bets with different odds
3. Low opposite-side odds
4. High opposite-side odds (guaranteed profit)
5. Zero commission
6. Nonzero commission (5%)
7. Invalid odds (< 1.01)
8. Zero stake handling
9. Empty bet rows
10. Custom hedge stake
11. Decimal rounding ($0.01, $0.10, $1.00)
12. Two-way vs three-way market handling
13. Break-even classification
14. Voided/unsupported settlement cases
15. Odds conversion (all formats, round-trips)
16. Arbitrage detection (2-way and 3-way)
17. Probability calculator with expected value

### Verified Example
- $15 at 2.80, $4 at 3.45, opposite odds 1.35, 0% commission
- Total stake: $19.00
- Total gross return: $55.80
- Suggested hedge stake: ≈$41.33
- Equalized result: ≈-$4.53 (guaranteed modeled loss)

## ⚠️ Disclaimer

This application is a **calculator tool**, not a betting recommendation engine.

- Does not guarantee profit or no-loss results
- Does not claim any team is certain to win
- Actual results may differ due to odds changes, stake limits, commission, fees, settlement rules, and execution differences
- Does not place bets, connect to betting accounts, or require deposits
- Local browser storage may be lost if browser data is cleared

## License

MIT
