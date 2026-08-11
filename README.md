# 📊 Crypto Portfolio Manager

## 📋 About the Project

A local web application that compares a crypto portfolio against a target allocation the user defines, and calculates exactly what to buy or sell to close the gap.

Built with **Node.js**, **React** and **Vite**, it reads prices from the **CoinGecko** API and includes an assistant powered by **Google Gemini** that answers questions about the portfolio.

Every asset and every target is added by the user — the app ships with nothing pre-configured.

## 🚀 Features

- Target allocation defined per asset, validated to sum to 100%
- Any asset available on CoinGecko, or a manual one with a price you set yourself
- Prices fetched on demand, keeping the free API tier well within its limits
- Two-ring donut comparing the target allocation against the current one
- Deviation bars that show the distance to target as physical distance, not just a number
- Contribution planner — enter an amount and see what to buy, projected live onto the bars
- Full rebalance — the sells that fund the buys to bring every asset back to target
- Portfolio value history, recorded on each price refresh
- Assistant with access to the current portfolio state
- Dark and light themes

## 🧮 How the numbers work

All calculation lives in `core/`, a set of pure functions with no I/O. The same module is imported by the server and by the browser, so the contribution projection recalculates instantly in the interface using the exact code the server trusts.

- **Contribution** distributes new money across the assets below target, in proportion to how much each one is short. Nothing is ever sold.
- **Rebalance** sells what is above target to fund what is below, and only runs when explicitly requested.
- The assistant never computes figures. It receives them already calculated and explains them.

## 🎨 Design notes

Asset colours are not picked by eye. The four-colour categorical palette was selected by running every candidate through a colourblind-separation validator across all pairs, in both themes — four is the largest set that clears the thresholds. Beyond four assets the donut folds the remainder into a neutral "Other" slice, while the deviation bar list, where colour carries no information, shows every asset.

## 🔑 Running it

Copy `.env.example` to `.env` and add a [Google AI Studio](https://aistudio.google.com/apikey) key. The key is read only by the server and never reaches the browser. The dashboard works without it — only the assistant needs it.

On Windows, `portfolio.bat` installs dependencies on first run, builds the interface and opens the browser. Otherwise:

```bash
npm install
npm run build
npm start       # http://localhost:4173

npm test        # 112 tests
```

Your positions live in `portfolio.json` next to the app. It is git-ignored — backing it up means copying that one file.

> **Note:** the app interface is in Portuguese.
