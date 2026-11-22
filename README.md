# DAC & Analog I/O Voltage Test Results

## Background & Purpose

I started this project back in 2022 when I got into the MiSTer FPGA gaming ecosystem. Back then, many of the Analog I/O boards and inexpensive DACs sold online did a poor job of converting digital signals into proper analog video output for CRT TVs. Images could be overly dark or blown out, causing crushed shadow detail or clipped highlights. If you want to learn more about what I was looking for and my testing methodology, [read my full write-up here](https://docs.google.com/document/d/1Fz3OfWZgftiTfqG-_JCBJku4a0qzDZeWzmEk4S3Iyjk).

Since this project began, the hardware landscape has improved significantly. Most new MiSTer I/O boards are now properly tested and engineered for accurate video output, and even budget-friendly DACs sold online largely meet proper video standards. While there are still occasional outliers, the overall trend toward better hardware quality has been great to see and I am glad the work I started helped contribute to this trend!

## Acknowledgements & Disclaimer

Thank you to everyone who has helped along the way or sent review units for testing—though the vast majority of this was self-funded for the benefit of the retro gaming community. 

*Note: I am not a professional video processing engineer; I have learned through hands-on testing along the way. If an error is ever found in the data, I will verify and correct it as soon as possible.*

---

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
