# 📊 Crypto Portfolio Manager

## 📋 About the Project

A local web app that compares a crypto portfolio against a target allocation and calculates what to buy or sell to close the gap.

Built with **Node.js**, **React** and **Vite**, it reads prices from the **CoinGecko** API and includes an assistant powered by **Google Gemini** that answers questions about the portfolio.

Every asset and every target is added by the user — nothing comes pre-configured.

## 🚀 Features

- Target allocation per asset, validated to sum to 100%
- Any asset on CoinGecko, or a manual one with a price you set yourself
- Prices fetched on demand, keeping the free API tier within its limits
- Two-ring donut comparing the target allocation against the current one
- Deviation bars showing the distance to target as distance, not just a number
- Contribution planner — enter an amount and see what to buy, projected onto the bars
- Full rebalance — the sells that fund the buys to bring every asset back to target
- Portfolio value history, recorded on each price refresh
- Dark and light themes

## 🔑 Running

Copy `.env.example` to `.env` and add a [Google AI Studio](https://aistudio.google.com/apikey) key — only the assistant needs it. On Windows, run `portfolio.bat`. Otherwise `npm install && npm run build && npm start`.

> **Note:** the app interface is in Portuguese.
