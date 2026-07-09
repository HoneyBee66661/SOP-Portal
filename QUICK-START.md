# SOP Portal - Quick Start (5 Minutes)

## TL;DR

```bash
# 1. Install
npm install

# 2. Edit sop-portal.jsx with your Google Drive File IDs

# 3. Test locally
npm run dev

# 4. Build
npm run build

# 5. Deploy (Vercel)
npm i -g vercel
vercel

# 6. Share URL with employees
```

---

## Getting Google Drive File IDs (5 min)

1. Open PDF in Google Drive
2. Click "Open in new window"
3. Copy File ID from URL:
   ```
   https://drive.google.com/file/d/1ABC123DEF456/view
                                      ↑ This part
   ```
4. Paste into `sop-portal.jsx` line in `sopData` array

---

## Edit sop-portal.jsx

Find `const sopData = [` and replace File IDs:

```javascript
const sopData = [
  {
    id: 1,
    title: 'Your SOP Title',
    category: 'Category',
    gdrivePath: 'PASTE_FILE_ID_HERE',
    description: 'Description of this SOP',
  },
  // ... add all 12 SOPs
];
```

---

## Run Locally

```bash
npm run dev
```

Opens `http://localhost:5173` in browser. Test:
- Search box works?
- Categories filter work?
- QR codes visible?
- PDF viewer opens?

---

## Deploy to Vercel (Easiest)

```bash
npm i -g vercel
vercel
```

Follow prompts. Get live URL in ~30 seconds.

---

## Share with Team

Send link:
```
https://your-portal-url.vercel.app
```

Or scan QR code. Or print SOP-specific QR codes.

---

## Commands Reference

| Command | What it does |
|---|---|
| `npm install` | Install dependencies |
| `npm run dev` | Start local dev server |
| `npm run build` | Create production build |
| `npm run preview` | Preview production build locally |
| `vercel` | Deploy to Vercel |

---

## File Locations

- **Edit this:** `sop-portal.jsx` (lines ~15-45, the `sopData` array)
- **Deploy this:** Entire folder (Vercel will handle)
- **Don't touch:** Everything else (package.json, vite.config.js, etc.)

---

## Troubleshooting

- **QR codes don't scan?**
  - Check Google Drive PDF sharing: "Anyone with link can view"
  
- **PDF won't load in modal?**
  - Verify File ID is correct
  - Make sure PDF is shared

- **npm install fails?**
  - Delete `node_modules` folder
  - Run `npm install` again

---

## Done?

You're live. Share the URL. Update PDFs in Google Drive anytime (automatic).
