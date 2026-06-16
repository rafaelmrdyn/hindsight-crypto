# ⏳ Hindsight

**The clarity of looking back.** A what-if time machine for crypto: pick a coin, a
date, and an amount, and Hindsight replays the *real* market — every daily close
since the coin existed — to tell you, to the dollar, what that bet would be worth
today.

🔗 **Live:** https://hindsight-crypto.web.app

---

## What it does

Two strategies, one engine, real historical prices from the [CoinStats Open API](https://coinstats.app/api/):

- **One-time buy** — _"A single $1,000 of BTC on Mar 13 2020 would be worth $8,990 today — 8.99×."_
- **Recurring (DCA)** — _"$50 into BTC every week since…"_, with a **vs. lump-sum**
  comparison so you can see whether dollar-cost-averaging actually beat buying all at once.

Every result comes with:

- An animated payoff readout (ROI, multiple).
- An interactive value chart — cost-basis line, a dot for every buy, and a hover scrubber.
- Stats: total invested, units held, average cost, max drawdown.
- Flavor: peak value, deepest drawdown, and the best / worst single days along the way.
- Coin autocomplete (search any of ~20k coins), a live top-coins ticker, and quick
  date presets (COVID low, 2021 top, bear bottom, 1 year ago).

## How it works

It's a **pure frontend** — no backend, no server. The browser calls the CoinStats
Open API directly (their CORS is open), pulls a coin's full daily history
(`/coins/{id}/charts?period=all`), and the backtest engine
([`src/lib/backtest.ts`](src/lib/backtest.ts)) replays it locally:

1. Schedule the buy dates (one, or every day/week/month from the start date).
2. For each buy, look up the price on that day (binary search over the history) and
   accumulate coin units.
3. Walk the timeline to build the value-over-time series, drawdown, and a lump-sum baseline.

No live trading and no fees are modeled — just the honest math of the daily closes.
Long-range history is daily resolution, which faithfully models HODL/DCA strategies
(but not intraday fills).

## Tech

- **React + TypeScript + Vite** — static build, no framework backend.
- Hand-rolled **SVG** chart (no chart library).
- Design: warm filmic palette, [Fraunces](https://fonts.google.com/specimen/Fraunces)
  serif display + monospaced tabular numerals, an engraved grid, a single brass accent.

## Getting started

```bash
# 1. install
npm install

# 2. add your CoinStats key
cp .env.example .env
#   then edit .env and set VITE_COINSTATS_API_KEY (get a key at https://openapi.coinstats.app/)

# 3. run
npm run dev        # http://localhost:5173

# build static site
npm run build      # outputs to dist/
npm run preview    # preview the production build
```

## Deploy (Firebase Hosting)

The repo is wired to Firebase Hosting (site `hindsight-crypto`):

```bash
npm run build
firebase deploy --only hosting:hindsight-crypto
```

## Project layout

```
src/
  api.ts                  CoinStats Open API client (called directly from the browser)
  lib/
    backtest.ts           the simulation engine (one-time + recurring DCA)
    format.ts             USD / %, date and span formatting
  hooks/
    useCountUp.ts         eased number animation for the payoff readout
  components/
    CoinSearch.tsx        debounced autocomplete over the coin universe
    ValueChart.tsx        SVG value chart with buy markers + hover scrubber
    TickerStrip.tsx       live top-coins ticker
  App.tsx                 the console + result composition
  styles.css              the design system
```

## License

MIT — do whatever you like.

---

*Past performance is not a promise — it's a lesson.* · Market data by the CoinStats Open API.
