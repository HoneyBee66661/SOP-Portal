# Document Portal - Company Documents Distribution System

A **free, zero-cost** web app for sharing company documents with QR codes across your entire organization.

## Features

✅ **QR Codes** - Each document has a scannable QR code  
✅ **Categorized** - Filter documents by category  
✅ **Search** - Full-text search across all documents  
✅ **Mobile-First** - Works on phones, tablets, desktops  
✅ **PDF Viewer** - Built-in Google Drive PDF viewer  
✅ **Free Hosting** - Vercel or GitHub Pages  
✅ **Easy Updates** - Change PDFs in Google Drive (auto-sync)  
✅ **Offline Access** - Download PDFs for offline use  

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Edit document-portal.jsx with your Google Drive File IDs
# (See QUICK-START.md for detailed instructions)

# 3. Test locally
npm run dev

# 4. Build for production
npm run build

# 5. Deploy (Vercel is easiest)
npm i -g vercel
vercel
```

**Total time: ~20 minutes**

## Documentation

- **[QUICK-START.md](QUICK-START.md)** - 5-minute setup guide
- **[SETUP-GUIDE.md](SETUP-GUIDE.md)** - Complete step-by-step instructions
- **[document-portal.jsx](document-portal.jsx)** - Main React component (where you add your documents)

## Architecture

```
Employees (Phone/Desktop)
        ↓
[Portal URL]
        ↓
React App (Free Vercel Hosting)
        ↓
Google Drive PDFs
```

**Zero backend. Zero database. Zero cost.**

## Technology Stack

- **Frontend:** React 18 + Tailwind CSS
- **Build:** Vite
- **QR Codes:** qrcode.react
- **Icons:** lucide-react
- **Hosting:** Vercel or GitHub Pages (free)
- **PDF Storage:** Google Drive (free, always synced)

## File Structure

```
sop-portal-complete/
├── document-portal.jsx              ← Main component (EDIT THIS)
├── package.json                ← Dependencies
├── vite.config.js             ← Build config
├── tailwind.config.js         ← Tailwind CSS config
├── index.html                 ← HTML entry point
├── src/
│   ├── main.jsx              ← React app entry point
│   └── index.css             ← Global styles
├── QUICK-START.md            ← Fast setup (5 min)
├── SETUP-GUIDE.md            ← Complete guide
└── README.md                 ← This file
```

## Steps to Deploy

### 1. Prepare PDFs
- Upload 12 PDFs to Google Drive
- Share folder: "Anyone with link can view"
- Get File ID for each PDF

### 2. Configure
- Open `document-portal.jsx`
- Replace placeholder File IDs in `sopData` array
- Save

### 3. Deploy
```bash
npm run build
vercel
```

Get live URL. Done.

### 4. Share
- Send URL to employees
- Or print QR code poster
- Or individual SOP QR codes

## Customization

### Add/Edit SOPs
Edit the `sopData` array in `document-portal.jsx`:

```javascript
const sopData = [
  {
    id: 1,
    title: 'Receiving Procedure',
    category: 'Receiving',
    gdrivePath: 'YOUR_FILE_ID',
    description: 'Step-by-step guide...',
  },
  // Add more SOPs here
];
```

### Change Colors
Find color classes and replace:
- `bg-indigo-600` → Your brand color
- `text-gray-800` → Text color

### Add Logo
After the title in `document-portal.jsx`:
```javascript
<img src="https://your-logo-url.png" alt="Logo" className="h-16 mx-auto" />
```

## Deployment Options

| Option | Cost | Setup Time | Notes |
|---|---|---|---|
| **Vercel** | Free | 2 min | Easiest, auto-deploys |
| **GitHub Pages** | Free | 5 min | Great if using git |
| **Custom VPS** | $5-10/mo | 10 min | Full control |

## Access Patterns

| User | How They Access |
|---|---|
| Warehouse clerk | Scan QR code on poster → Opens PDF |
| Office staff | Bookmark portal → Search + filter |
| Mobile user | Add to home screen → Works offline |
| New hire | Click link in email → Bookmark → Use |

## Maintenance

### Update an SOP
1. Upload new PDF to Google Drive (replace old file)
2. Portal automatically shows latest version
3. No code changes needed

### Add a New SOP
1. Upload PDF to Google Drive
2. Get File ID
3. Add to `sopData` array in `document-portal.jsx`
4. `npm run build`
5. `vercel` (redeploy)

## Troubleshooting

| Problem | Solution |
|---|---|
| QR codes don't work | Check Google Drive sharing: "Anyone with link can view" |
| PDF won't load | Verify File ID is correct |
| npm install fails | Delete `node_modules`, run `npm install` again |
| Want different SOPs per role | Upgrade to Phase 2 with Supabase auth |

## Future Enhancements

When you outgrow Phase 1:
- User authentication (who accessed what?)
- Role-based access (different SOPs for different staff)
- Usage analytics (which SOPs are most accessed?)
- Full-text search inside PDFs
- Offline sync with Service Workers

Start simple. Upgrade when needed.

## Support

1. Read [QUICK-START.md](QUICK-START.md) (5 min)
2. Read [SETUP-GUIDE.md](SETUP-GUIDE.md) (complete reference)
3. Check Troubleshooting section above
4. Verify Google Drive File IDs are correct

## License

Free to use, modify, deploy. No restrictions.

---

**Ready?** Start with [QUICK-START.md](QUICK-START.md)
