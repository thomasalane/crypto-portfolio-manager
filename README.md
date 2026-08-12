# 📊 Crypto Portfolio Manager

## 📋 About the Project

A local web app that compares a crypto portfolio against a target allocation and calculates what to buy or sell to close the gap.

Built with **Node.js**, **React** and **Vite**, it reads prices from the **CoinGecko** API and includes an assistant powered by **Google Gemini** that answers questions about the portfolio.

Every asset and every target is added by the user — nothing comes pre-configured.

## 🚀 Features

- Target allocation defined per asset, validated to sum to 100%
- Two-ring donut comparing the target allocation against the current one
- Deviation bars showing the distance to target as distance, not just a number
- Contribution planner — enter an amount and see what to buy
- Full rebalance — the sells that fund the buys to bring every asset back to target
- USD and BRL

> **Note:** the app interface is in Portuguese.
