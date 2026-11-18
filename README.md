# Trix Counting Trainer · تدريب عدّ الورق - تركس

A web app for practising card counting in **Trix (تركس)**, played with partners.

You and a computer partner play real hands against two computer opponents. When a trick is finished it is turned face down, like at a real table. Every few tricks the app stops and asks what you remember, for example "How many ♠ are still with the other 3 players?" or "Has the A♦ been played?". It then shows the right answer and how to work it out.

Works on a phone (add it to your home screen from Safari), in English and Arabic.

## What's in it (phase 1)

- **Partners table.** Your partner sits across from you and play goes counter-clockwise (to the right).
- **Contracts.** King of Hearts (شيخ الكبة), Queens (البنات), Diamonds (الديناري) and Tricks (اللطوش).
- **Doubling.** Anyone holding the K♥ or a queen can double it, you included. Doubles are announced at the start of the hand.
- **Team points.**
  - The team that takes the K♥ loses 75, or 150 if it was doubled. A queen costs 25, or 50 if doubled.
  - The doubling team gets +75 / +25 only when the other team takes the card. If your own team takes it, your team only loses points.
- **Play mode.** You play your own cards: tap a card, then tap it again to play it.
- **Watch mode.** Your cards are played for you, so you can focus on remembering.
- **Questions.** Suit count, has it been played, which cards of a suit are still out, doubles, and a question about the contract being played. A question is not repeated in a hand unless its answer has changed.
- **End-of-hand review.**
  - Team points, with a breakdown.
  - Your score on the questions, and the cards you got wrong.
  - An optional "mark every played card" test.
  - A trick-by-trick replay of the hand.

Computer players play as a team. They try to make the other team take the K♥, queens, diamonds and tricks, and they only see their own cards plus what has been played. The answers to the questions are also worked out only from what you could have seen.

### Rules used

- You must follow suit. The highest card of the suit led wins the trick, and the winner leads next.
- **King of Hearts:** ends when the K♥ is taken. You can lead ♥ at any time, and the K♥ holder chooses when to throw it.
- **Queens:** ends when all 4 queens are taken.
- **Diamonds:** ends when all 13 ♦ are taken.
- **Tricks:** all 13 tricks are played.

## Development

Needs Node 20.9 or newer.

```sh
npm install
npm run dev        # http://localhost:3000
npm test           # rules, scoring, thousands of simulated hands, question checks
npm run typecheck
npm run build      # writes the finished static site to out/
```

Code layout:

- `lib/`: the game. Cards, rules and scoring, hand state, computer players, the tracker (what a player can know) and the questions. It has no UI code.
- `components/`: the screens (home, table, question panel, review).
- `tests/`: Vitest tests for everything in `lib/`.

## Deploying on GitHub Pages

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically builds and publishes the static site to GitHub Pages on every push to `main`.

1. Create a new repository on GitHub (e.g. `trix-counting-trainer`).
2. Push this repository to GitHub.
3. In GitHub, go to **Settings** → **Pages**.
4. Under **Build and deployment** → **Source**, select **GitHub Actions**.
5. Once selected, your site will automatically deploy and be available at:
   `https://<username>.github.io/<repo-name>/`

## Deploying on Render

The app runs entirely in the browser, so it is deployed as a free Render **Static Site**. A static site is always on, with no sleeping or slow first load. `render.yaml` describes it.

**Using the Blueprint**

1. Sign in at [dashboard.render.com](https://dashboard.render.com) with GitHub.
2. Choose **New → Blueprint**, then pick this repository and its default branch.
3. Render reads `render.yaml`. Press **Apply** (or **Deploy Blueprint**).

**Or set it up by hand:** choose **New → Static Site**, pick this repository, and enter:

- **Build Command:** `npm ci --include=dev && npm run build`
- **Publish Directory:** `out`

When the build finishes, open the `….onrender.com` link on your iPhone in Safari. Tap **Share → Add to Home Screen** to open it like an app.

Every push to the deployed branch rebuilds the site automatically.
