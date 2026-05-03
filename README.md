<p align="center">
  <img
    src="https://github.com/user-attachments/assets/c9e54a37-818e-492e-8255-c3c1a91e9b1b"
    width="600"
  />
  <br />
  <em>A before and after example using Planck's famous book, The Theory of Heat Radiation</em>
</p>

# Ashue — PDF to Black & White Converter

Convert yellowed or color-tinted PDFs into crisp black & white, optimized for e-ink devices.

**[Try it live →](https://thdaquin.github.io/ashue/)**

<p align="center">
  <img
    src="https://github.com/user-attachments/assets/1e7e3cb6-2ba1-4c50-a8ad-9fdd5cced7b2"
    width="600"
  />
  <br />
  <em>The conversion process in action</em>
</p>

## The Story

When I was in high school, my father introduced me to public domain books (specifically, the very book shown above, Planck's *The Theory of Heat Radiation*). That introduction sparked a love of open knowledge that has stayed with me ever since: the idea that the great works of genius are common goods and that anyone with curiosity should have access to them them.

Years later, reading those same books on an e-ink device, I kept running into a small but frustrating problem. Scanned public domain PDFs often come with yellowed, tinted, or uneven pages that look poor on e-ink screens and are hard on the eyes. Ashue is my answer to that problem. It's a small tool built out of gratitude for the open knowledge my father first pointed me toward.

## Features

- No data stored on servers: runs entirely in the browser, no server, no account required.
- Preview before converting: compare DPI and threshold settings on a sample page before committing to a full conversion.
- Adjustable settings: tune DPI and threshold bias to handle anything from lightly tinted to heavily yellowed scans.

## Usage

1. Click "Select PDF" and choose your file
2. Click "Generate preview" to compare how different settings look on a sample page — click the result you prefer to apply those settings
3. Click "Convert full PDF" and watch the progress bar 
4. Click "Download PDF" to get the resulting file

## FAQ

### Why the name?

Ashue is a blend of "ash" and "hue," evoking its monochrome purpose. It also sounds like "eschew," which is fitting since this tool exists so you don't have to avoid (eschew) reading PDFs on e-ink.

### Why is the output larger than the original?

The original PDF stores pages as compact vector data. Ashue rasterizes each page to pixels before converting it, which produces larger files. Lowering the DPI setting (try 150–200 for e-ink) is the easiest way to reduce output size while keeping text readable on your device.

## Tech

Built with React, TypeScript, Vite, and Tailwind CSS. PDF rendering via [pdf.js](https://mozilla.github.io/pdf.js/), output via [jsPDF](https://github.com/parallax/jsPDF). Deployed on GitHub Pages.