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

## Some Tech & Various Design Hurdles Along the Way

Built with React, TypeScript, Vite, and Tailwind CSS. PDF rendering via pdf.js, output via pdf-lib. Deployed on GitHub Pages.

### Why fully client-side?
The files this tool is intended to handle (which, for me, includes old books, personal documents, scanned manuscripts) felt like things people shouldn't have to upload to a stranger's server. Keeping everything in the browser was a privacy decision as much as a practical one. It also means there's no backend to maintain and no cost to scale. The downside is that the client is slow. For me and my purposes, that tradeoff was a fine one.

### What's on the main thread
The pixel processing (Otsu thresholding, black and white conversion, speckle cleanup) currently runs on the main JavaScript thread. This is why the UI feels sluggish during conversion. The browser's single thread is busy crunching pixels and has less time for anything else. The right fix was a Web Worker, a second JS thread the browser can spin up to handle the computation in parallel, leaving the main thread free for the UI. pdf.js already does this for PDF parsing, which is why it needs its worker file loaded separately. Moving the image processing into a worker is a planned improvement.

### Image processing method
Rather than using a fixed brightness threshold to decide what's black and what's white, the app uses Otsu's method, which is an algorithm that analyses the histogram of each page and finds the threshold that best separates foreground from background. This means it adapts automatically to pages with different levels of yellowing or tinting without any manual tuning. A soft transition zone and a speckle cleanup pass are applied on top to reduce noise.

### Switching from jsPDF to pdf-lib
The original output library was jsPDF, which works by accumulating all page image data in a single in-memory buffer before writing the file. On long PDFs at high DPI this caused an allocation overflow crash as the buffer simply exceeded what the browser could hold.
pdf-lib was swapped in as a replacement. It builds the PDF structure incrementally, embedding each page image directly as it goes rather than staging everything at once. This eliminated the memory ceiling entirely, allowing any DPI on any length document.

### PNG for output (not JPEG)
The output pages are pure black and white: two colors. JPEG compression is designed for photographic images with continuous gradients, and introduces visible artefacts (blurring, ringing) around sharp edges like text. PNG uses lossless compression that exploits large uniform regions, which is exactly what a B&W page of text is. The result is both smaller and sharper than JPEG for this specific use case.

### Page clipping bug
Early versions of the converter cropped the bottom of every output page. Turns out, the cause was that jsPDF initialised with a fixed default page height, and pages were being scaled to fit the width without adjusting the height. So, any content below the default cutoff was silently lost. The fix was to set each PDF page's dimensions to exactly match the rendered image dimensions, so nothing can be clipped regardless of the source document's aspect ratio.

### Cancelling conversion on back
If a user clicked the back button mid-conversion, the async processing loop kept running in the background even though the UI had already reset. The fix uses an AbortController, a standard browser API for cancelling async work. When back is clicked, the controller is signalled, and the loop checks that signal at the start of each page and exits cleanly at the next safe checkpoint rather than mid-operation.

### 1-bit PNG output
The browser's canvas API can only export images as 8-bit PNG or JPEG, meaning each pixel is stored across 4 bytes (RGBA) even when the image is pure black and white. A custom PNG encoder was written to pack the processed pixel data down to 1 bit per pixel before embedding it in the PDF. This required manually constructing the PNG binary: packing pixels into bit-packed rows, compressing them using the browser's native CompressionStream API, and wrapping the result in valid PNG chunks. The output is identical visually but typically 4-8x smaller than the 8-bit equivalent.