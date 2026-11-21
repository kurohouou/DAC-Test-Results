# DAC & Analog I/O Voltage Test Results

Oscilloscope **0–100 IRE** analog video voltage benchmarks for **HDMI-to-VGA DACs**, **MiSTer FPGA Analog I/O Boards**, **SuperStation One**, **Analogue DAC / Pocket**, and retro gaming video converters.

👉 **[Search & Compare Results on the Interactive Page](https://kurohouou.github.io/DAC-Test-Results/)**

---

## Data Files (Plain CSV)

All benchmark data lives directly in plain CSV files inside [`data/`](./data/)—no build step, database, or spreadsheet needed:

| Signal Category | CSV File | Reference Scale |
| :--- | :--- | :--- |
| **RGB Full Range** | [`data/rgb.csv`](./data/rgb.csv) | `0–700 mV` (`1 IRE = 7 mV`) |
| **Component (YPbPr)** | [`data/component.csv`](./data/component.csv) | `0–700 mV` (`1 IRE = 7 mV`) |
| **S-Video** | [`data/svideo.csv`](./data/svideo.csv) | `0–714 mV` (`1 IRE = 7.14 mV`) |
| **Composite** | [`data/composite.csv`](./data/composite.csv) | `0–714 mV` (`1 IRE = 7.14 mV`) |
| **SNES 240p S-Curve** | [`data/snes-s-curve.csv`](./data/snes-s-curve.csv) | DE10 FPGA SNES vs MisterCast + HCFR |

GitHub renders these `.csv` files as searchable tables in the repository view, and the **GitHub Pages** site loads them directly at runtime (`index.html` + `app.js` + `styles.css`).

---

## How to Add or Edit Test Results (Directly on GitHub)

You never need Google Sheets again. You have two easy ways to add a new DAC test:

### Option 1: Use the "+ CSV Row Helper" on the GitHub Pages Site (Easiest)
1. Click **+ CSV Row Helper** in the top-right corner of the live GitHub Pages site.
2. Fill in the DAC name, IC, test date, rating, `0–100 IRE` mV readings, optional product URL, and notes (it automatically calculates `ΔmV` errors and handles CSV quoting for commas).
3. Click **Copy CSV Row**, open the matching file in GitHub (`data/rgb.csv`, `data/component.csv`, `data/svideo.csv`, or `data/composite.csv`), click the **Edit (pencil)** icon, paste the new line at the bottom, and click **Commit changes**.

### Option 2: Edit `data/*.csv` Directly
Each CSV uses the same 18 columns:

```csv
DAC or IO Board,IC/Resistor Ladder,Test Date,Pattern Generator,Rating,0 IRE,10 IRE,20 IRE,30 IRE,40 IRE,50 IRE,60 IRE,70 IRE,80 IRE,90 IRE,100 IRE,Product URL,Note
```

- **Rating**: Use `*****` (5★ Reference), `****` (4★ Great), `***` (3★ Good), `**` (2★ Useable), `*` (1★ Avoid), or leave blank for unrated/no-output units.
- **Untested IRE cells**: Use `-` if a device had no output or testing stopped early.
- **Commas in Notes**: Wrap the `Note` field in double quotes (`"..."`) if it contains commas.

As soon as you commit an edit to `main`, GitHub Pages serves the updated CSV automatically.

---

## Grading System

- **★★★★★ Reference** — No more than 1 error > 15 mV, little to no separation of R/G/B mV values, no major % difference from reference (e.g. ≤ 5%), and minimal unit-to-unit variability.
- **★★★★ Great** — No more than 1 error > 25 mV and < 10 mV of RGB separation at 100 IRE.
- **★★★ Good** — No errors > 35 mV and < 15 mV of RGB separation at 100 IRE.
- **★★ Useable** — Errors > 35 mV without severe % curve collapse (e.g. runs hot without crushing blacks).
- **★ Avoid** — Major functional faults, severe black crush (< 50 IRE drop typical of `AG6200`/`AG6201`), or extreme over-exposure.

### Footnote Markers
- `*` — Chip used in DAC is assumed based on mV readings of other opened and verified ICs.
- `**` — DAC outputs `RGBHV` only (not `RGBS`); requires an external sync combiner if your monitor doesn't support `RGBHV`.
- `***` — Newer versions of the Tendak DAC switched from `CM6616S` to `ZY6511-EX` and **will not work with MiSTer**.
- `****` — Some ICY BOX DACs have reported sync quirks or slower re-syncing (quick test: *Sonic 2* interlaced 2P mode).
- **SNES Gamma Note** — The SNES 240p Test Suite gamma curve tracks slightly lower (< 50 IRE) and slightly higher (≥ 50 IRE) compared to linear reference.
