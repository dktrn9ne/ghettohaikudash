# Ghetto Haiku Dash

A web-based arcade delivery game inspired by the classic lane-dodging paper delivery format, remixed as a Chinese takeout bicycle dash.

## Controls

- `W` — speed up
- `S` — slow down
- `A` — move up
- `D` — move down
- `SPACE` — throw a takeout box
- `R` — restart after game over

## Local development

```bash
npm install
npm run dev
```

Open the local URL Vite prints in your terminal.

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or push this repo to GitHub and import it in Vercel.

## Build command

```bash
npm run build
```

## Output directory

```bash
dist
```


## Fix note
The game entry is `index.html` -> `./src/main.js`. A root `main.js` shim is also included for hosts/templates that expect `/main.js`.
