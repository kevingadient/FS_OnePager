# PDF Merger & Page Organizer

A modern web application that allows you to merge PDF documents, rearrange individual pages, and download the reorganized result.

## Features

- 📁 **Multiple PDF Upload**: Upload multiple PDF files at once
- 🔄 **Drag & Drop**: Intuitive drag-and-drop interface for file uploads and page reordering
- 📄 **Page Management**: View all pages as thumbnails with source file information
- 🎯 **Page Reordering**: Drag and drop pages to rearrange them in any order
- ❌ **Page Removal**: Remove individual pages you don't need
- 💾 **Download**: Download the merged PDF with your custom page order
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices
- ⌨️ **Keyboard Shortcuts**: 
  - `Ctrl/Cmd + S`: Download merged PDF
  - `Escape`: Clear all pages

## How to Use

1. **Upload PDFs**: 
   - Click "Choose Files" or drag and drop PDF files into the upload area
   - You can select multiple PDF files at once

2. **Review Pages**: 
   - All pages from uploaded PDFs will be displayed as thumbnails
   - Each page shows its number and source file

3. **Rearrange Pages**: 
   - Drag and drop pages to reorder them
   - Remove unwanted pages by clicking the "×" button

4. **Download**: 
   - Click "Download Merged PDF" to get your reorganized document
   - The PDF will be saved with all pages in your chosen order

## Technical Details

- **Frontend**: Pure HTML, CSS, and JavaScript
- **PDF Processing**: Uses PDF-lib library for client-side PDF manipulation
- **Drag & Drop**: Sortable.js for smooth page reordering
- **Styling**: Modern CSS with gradients, animations, and responsive design
- **Browser Support**: Works in all modern browsers

## File Structure

```
pdf-merger/
├── index.html          # Main HTML file
├── styles.css          # CSS styling
├── script.js           # JavaScript functionality
└── README.md           # This file
```

## Getting Started

1. Open `index.html` in a web browser
2. Upload your PDF files
3. Rearrange pages as needed
4. Download the merged PDF

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Limitations

- All processing happens in the browser (client-side)
- Large PDF files may take longer to process
- Maximum file size depends on available browser memory

## Security

- All processing is done locally in your browser
- No files are uploaded to external servers
- Your PDFs remain private and secure

## Troubleshooting

- **Files not uploading**: Make sure you're selecting PDF files (.pdf extension)
- **Slow processing**: Large files may take time; wait for the progress bar to complete
- **Download not working**: Check if your browser allows downloads from this site
- **Pages not displaying**: Ensure PDF files are not corrupted or password-protected
