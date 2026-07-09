# SOP Portal - Complete Setup Guide

## Overview

This is a **zero-cost, zero-backend** SOP distribution system:

- **Frontend:** React + Tailwind CSS + Vite
- **Hosting:** Free (Vercel, GitHub Pages, or own server)
- **PDFs:** Google Drive (free, always up-to-date)
- **QR Codes:** Generated automatically for each SOP
- **Deployment:** ~20 minutes total

---

## File Structure

```
sop-portal-complete/
├── index.html              # HTML entry point
├── package.json            # Dependencies
├── vite.config.js         # Build tool config
├── tailwind.config.js     # Tailwind CSS config
├── postcss.config.js      # CSS processing config
├── .gitignore             # Git ignore patterns
├── src/
│   ├── main.jsx           # React app entry point
│   └── index.css          # Global styles
├── sop-portal.jsx         # Main component (EDIT THIS)
└── SETUP-GUIDE.md         # This file
```

---

## Step 1: Prepare Your PDFs on Google Drive

### 1.1 Create Folder Structure
1. Go to **Google Drive**
2. Create folder: **`SOP Documents`**
3. Upload all 12 PDF files inside

### 1.2 Share for Public Access
1. Right-click folder → **Share**
2. Change permission to: **"Anyone with the link can view"**
3. Copy the link (you'll use this to test)

### 1.3 Get File IDs for Each PDF
For each SOP PDF:
1. Open the PDF in Google Drive
2. Click **Open in new window** (or right-click → Open in new tab)
3. Look at the URL in address bar:
   ```
   https://drive.google.com/file/d/1ABC123DEF456/view?usp=sharing
                                    ↑ This is your File ID
   ```
4. Copy just the File ID portion (e.g., `1ABC123DEF456`)
5. Save it in a spreadsheet or text file

**Example mapping:**
```
SOP Title              | File ID
Receiving Procedure    | 1ABC123DEF456
Storage & Binning      | 2GHI789JKL012
Picking & Packing      | 3MNO345PQR678
...
```

---

## Step 2: Configure Your SOPs

### 2.1 Open `sop-portal.jsx`
Find the `sopData` array (around line 15):

```javascript
const sopData = [
  {
    id: 1,
    title: 'Receiving Procedure',
    category: 'Receiving',
    gdrivePath: '1ABC123DEF456',  // ← REPLACE THIS
    description: 'Step-by-step guide for incoming goods inspection',
  },
  // ... more SOPs
];
```

### 2.2 Add All Your SOPs
Replace each `gdrivePath` with your actual Google Drive File IDs:

```javascript
const sopData = [
  {
    id: 1,
    title: 'Receiving SOP',
    category: 'Receiving',
    gdrivePath: 'YOUR_ACTUAL_FILE_ID_1',
    description: 'Goods inspection checklist',
  },
  {
    id: 2,
    title: 'Storage SOP',
    category: 'Warehouse',
    gdrivePath: 'YOUR_ACTUAL_FILE_ID_2',
    description: 'Bin organization standards',
  },
  {
    id: 3,
    title: 'Picking SOP',
    category: 'Warehouse',
    gdrivePath: 'YOUR_ACTUAL_FILE_ID_3',
    description: 'Order picking procedures',
  },
  // ... repeat for all 12 SOPs
];
```

### 2.3 Suggested Categories
Use these or create your own:
- Receiving
- Warehouse
- Shipping
- Inventory
- Safety
- Maintenance
- Administration
- Quality Control

---

## Step 3: Install & Run Locally

### 3.1 Install Dependencies
```bash
npm install
```

### 3.2 Start Development Server
```bash
npm run dev
```

This will:
- Start server on `http://localhost:5173`
- Auto-reload on file changes
- Show console errors if any

### 3.3 Test Locally
1. Open browser to `http://localhost:5173`
2. Try searching (should filter SOPs)
3. Try filtering by category
4. Click "View PDF" (should open Google Drive preview)
5. Try scanning QR code with phone camera
6. QR should open PDF directly in Google Drive

---

## Step 4: Build for Production

### 4.1 Create Optimized Build
```bash
npm run build
```

This creates `/dist` folder with:
- Minified React code
- Optimized CSS
- Ready for deployment

### 4.2 Preview Build Locally
```bash
npm run preview
```

Opens production build locally for testing.

---

## Step 5: Deploy (Choose One)

### Option A: Vercel (Easiest)

**1. Create free Vercel account**
```
https://vercel.com/signup
```

**2. Connect GitHub (or upload directly)**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

**3. Get your URL**
```
✓ https://sop-portal-abc123.vercel.app
```

**Done!** Updates automatically on every git push.

---

### Option B: GitHub Pages (Free)

**1. Create GitHub account** (if needed)

**2. Create new repository**
- Name: `sop-portal`
- Public
- Add `.gitignore` (included)

**3. Push code**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/sop-portal.git
git branch -M main
git push -u origin main
```

**4. Enable GitHub Pages**
- Go to Settings → Pages
- Source: `main` branch, `/dist` folder
- Custom domain (optional)

**5. Get your URL**
```
https://your-username.github.io/sop-portal
```

---

### Option C: Traditional Server (VPS, etc.)

**1. Build**
```bash
npm run build
```

**2. Copy `/dist` folder** to web server

**3. Configure web server** to serve `index.html` for all routes

**4. Access at your domain**

---

## Step 6: Share with Employees

### Method 1: Portal URL
Send employees the deployment URL:
```
Email: "You can now access all SOPs here: https://sop-portal-abc123.vercel.app"
```

**Mobile:** Add to home screen
- iPhone: Safari → Share → Add to Home Screen
- Android: Chrome → Menu → Install app

**Desktop:** Bookmark it

### Method 2: QR Code Poster
1. Generate QR code for your portal URL:
   - Use: https://qr-server.com/api/qrcode?size=300x300&data=YOUR_URL
2. Print poster with QR code
3. Post in warehouse/break room
4. Employees scan to access portal

### Method 3: Direct PDF QR Codes
1. In portal, each SOP card has its own QR code
2. Screenshot QR codes
3. Print poster with:
   ```
   SOP Title | [QR Code]
   Receiving | [QR Code]
   Storage   | [QR Code]
   ...
   ```
4. Post at relevant workstations
5. Scan QR = Opens PDF directly

---

## Maintenance

### Update an SOP
1. Replace PDF in Google Drive (keep same file ID)
2. Portal automatically shows latest version
3. No code changes needed

### Add New SOP
1. Upload new PDF to Google Drive
2. Get File ID
3. Add entry to `sopData` array:
   ```javascript
   {
     id: 7,
     title: 'New SOP Title',
     category: 'Category',
     gdrivePath: 'NEW_FILE_ID',
     description: 'Description...',
   }
   ```
4. Run `npm run build`
5. Deploy (redeploy to Vercel/GitHub Pages)

### Customize Appearance
- Change colors: Edit color classes in `sop-portal.jsx`
  - `bg-indigo-600` → Your brand color
  - `text-gray-800` → Text color
- Add logo: Add `<img>` tag after the title
- Change categories: Modify category list in `sopData`

---

## Troubleshooting

| Problem | Solution |
|---|---|
| QR codes don't work | Check Google Drive sharing is "Anyone with link" |
| PDF won't display in modal | Ensure File ID is correct and PDF is shared |
| Page looks broken on mobile | Check browser zoom is 100% |
| Build fails | Run `npm install` again, delete `node_modules` |
| Vercel deployment fails | Check `package.json` has all dependencies listed |
| Employee can't access portal | Check internet connection, try different browser |

---

## Performance Tips

- Portal loads fast (< 2 seconds)
- QR codes are lightweight (pure SVG)
- Google Drive handles PDF caching
- Mobile app mode works offline
- Responsive design works on all devices

---

## Security Notes

- No user login needed (open access)
- PDFs stored on Google Drive (secure)
- Portal code is public (no secrets)
- To restrict access: Upgrade Phase 2 (Supabase auth)

---

## Next Steps

1. ✅ Gather File IDs (10 min)
2. ✅ Edit `sop-portal.jsx` (5 min)
3. ✅ Test locally with `npm run dev` (2 min)
4. ✅ Build with `npm run build` (1 min)
5. ✅ Deploy to Vercel (5 min)
6. ✅ Share URL with team (1 min)

**Total:** ~24 minutes

---

## Support

If you get stuck:
1. Check this guide's troubleshooting section
2. Verify Google Drive File IDs are correct
3. Test in browser console (F12 → Console)
4. Try incognito mode (clears browser cache)
5. Rebuild: `npm run build`

---

## Future Enhancements

When you need more:
- User authentication (Supabase)
- Usage analytics (Vercel Analytics)
- Full-text search in PDFs (Python backend)
- Role-based access control (Supabase + RLS)
- Offline sync (Service Worker + IndexedDB)
- Multi-language support (i18n library)

Start with Phase 1 (this), upgrade as needed.
