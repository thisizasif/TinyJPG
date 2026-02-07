<div align="center">

# TinyJPG

**Fast, private image compression in your browser**

Reduce JPG/PNG/WebP file size with target size control, batch processing, and instant downloads — all locally.


[Live Demo](https://thisizasif.github.io/TinyJPG/) · [Report Issue](https://github.com/thisizasif/TinyJPG/issues) · [Request Feature](https://github.com/thisizasif/TinyJPG/issues)

</div>
<p align="center"> <img src="https://raw.githubusercontent.com/thisizasif/TinyJPG/main/src/Banner.png" alt="TinyJPG Banner" width="100%"> </p>

---

## ✨ Highlights
- Target size compression with **KB / MB / KiB / MiB**
- Batch compress + **ZIP download**
- Output format selection (JPG / PNG / WebP)
- Optional max width/height resizing
- 100% local processing (privacy‑friendly)
- Responsive, clean UI

---

## ⚙️ Quick Start
1. Open `index.html` in a browser (or serve the folder locally).
2. Drop images or click to browse.
3. Set target size + unit and optional max dimensions.
4. Click **Compress all** or compress individual images.
5. Download results (single files or ZIP).

> Note: Some browsers block third‑party scripts on `file://`. Use a local server for full functionality (ZIP + ad scripts).

---

## 🧪 Local Server (Recommended)
```bash
python -m http.server 8000
```
Then open `http://localhost:8000/`.

---

## 🧠 How It Works
- Images are loaded into the browser and rendered to a canvas.
- Compression automatically adjusts quality + optional resizing to meet the target size.
- No uploads. Everything stays on your device.

---

## 📦 Project Structure
```
.
├── index.html
├── styles.css
├── app.js
├── manifest.webmanifest
├── robots.txt
├── sitemap.xml
├── favicon.svg
├── og-image.svg
└── src/
   └── Banner.png
```

---

## 📊 SEO Ready
- Open Graph + Twitter cards
- JSON‑LD (WebApplication + FAQ)
- `robots.txt` and `sitemap.xml`
- PWA manifest

---

## 🚀 Deploy (GitHub Pages)
1. Push the repo to GitHub: `thisizasif/TinyJPG`.
2. GitHub → Settings → Pages → select the `main` branch and `/root`.
3. Your site will be live at:
   `https://thisizasif.github.io/TinyJPG/`

---

## 🤝 Credits
Built by **thisizasif**.

