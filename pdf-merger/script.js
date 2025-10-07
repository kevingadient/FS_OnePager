// Global variables
let pdfPages = [];
let sortableInstance = null;

// DOM elements
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const pagesSection = document.getElementById('pagesSection');
const pagesList = document.getElementById('pagesList');
const progressFill = document.getElementById('progressFill');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const clearAllBtn = document.getElementById('clearAllBtn');
const downloadBtn = document.getElementById('downloadBtn');
const toastContainer = document.getElementById('toastContainer');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
});

function initializeEventListeners() {
    // File input change
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop events
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // Button events
    clearAllBtn.addEventListener('click', clearAllPages);
    downloadBtn.addEventListener('click', downloadMergedPDF);
    
    // Upload area click
    uploadArea.addEventListener('click', () => fileInput.click());
}

// File handling functions
function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    processFiles(files);
}

function handleDragOver(event) {
    event.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = Array.from(event.dataTransfer.files);
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length !== files.length) {
        showToast('Only PDF files are supported', 'warning');
    }
    
    if (pdfFiles.length > 0) {
        processFiles(pdfFiles);
    }
}

async function processFiles(files) {
    showLoading('Processing PDF files...');
    
    try {
        let totalPages = 0;
        let processedPages = 0;
        
        // First pass: count total pages
        for (const file of files) {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            totalPages += pdfDoc.getPageCount();
        }
        
        // Second pass: extract pages
        for (const file of files) {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const pageCount = pdfDoc.getPageCount();
            
            for (let i = 0; i < pageCount; i++) {
                const page = pdfDoc.getPage(i);
                const pageNumber = i + 1;
                
                // Create a new PDF document with just this page
                const singlePageDoc = await PDFLib.PDFDocument.create();
                const [copiedPage] = await singlePageDoc.copyPages(pdfDoc, [i]);
                singlePageDoc.addPage(copiedPage);
                
                // Generate thumbnail
                const thumbnail = await generateThumbnail(page);
                
                // Add page to our collection
                pdfPages.push({
                    id: Date.now() + Math.random(), // Unique ID
                    sourceFile: file.name,
                    pageNumber: pageNumber,
                    pdfDoc: singlePageDoc,
                    thumbnail: thumbnail,
                    originalPage: page
                });
                
                processedPages++;
                updateProgress((processedPages / totalPages) * 100);
            }
        }
        
        displayPages();
        hideLoading();
        showToast(`Successfully processed ${totalPages} pages from ${files.length} file(s)`, 'success');
        
    } catch (error) {
        hideLoading();
        showToast('Error processing PDF files: ' + error.message, 'error');
        console.error('Error processing files:', error);
    }
}

async function generateThumbnail(page) {
    try {
        // Create a canvas to render the page
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Set canvas size for thumbnail
        const scale = 0.3; // Scale down for thumbnail
        const viewport = page.getViewport({ scale });
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Render the page to canvas
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        return canvas.toDataURL('image/png');
    } catch (error) {
        console.error('Error generating thumbnail:', error);
        return null;
    }
}

function displayPages() {
    if (pdfPages.length === 0) {
        pagesSection.style.display = 'none';
        return;
    }
    
    pagesSection.style.display = 'block';
    
    pagesList.innerHTML = '';
    
    pdfPages.forEach((page, index) => {
        const pageElement = createPageElement(page, index);
        pagesList.appendChild(pageElement);
    });
    
    // Initialize sortable functionality
    initializeSortable();
}

function createPageElement(page, index) {
    const pageDiv = document.createElement('div');
    pageDiv.className = 'page-item';
    pageDiv.setAttribute('data-page-id', page.id);
    
    const thumbnail = page.thumbnail ? 
        `<img src="${page.thumbnail}" alt="Page ${page.pageNumber}">` :
        `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666;">📄 Page ${page.pageNumber}</div>`;
    
    pageDiv.innerHTML = `
        <div class="page-preview">
            ${thumbnail}
        </div>
        <div class="page-info">
            <div class="page-number">Page ${page.pageNumber}</div>
            <div class="page-source">${page.sourceFile}</div>
        </div>
        <button class="remove-btn" onclick="removePage('${page.id}')" title="Remove page">×</button>
    `;
    
    return pageDiv;
}

function initializeSortable() {
    if (sortableInstance) {
        sortableInstance.destroy();
    }
    
    sortableInstance = new Sortable(pagesList, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        onEnd: function(evt) {
            // Update the pdfPages array based on new order
            const newOrder = Array.from(pagesList.children).map(el => 
                pdfPages.find(page => page.id === el.getAttribute('data-page-id'))
            );
            pdfPages = newOrder;
        }
    });
}

function removePage(pageId) {
    pdfPages = pdfPages.filter(page => page.id !== pageId);
    displayPages();
    
    if (pdfPages.length === 0) {
        pagesSection.style.display = 'none';
    }
    
    showToast('Page removed', 'success');
}

function clearAllPages() {
    if (pdfPages.length === 0) return;
    
    if (confirm('Are you sure you want to clear all pages?')) {
        pdfPages = [];
        displayPages();
        pagesSection.style.display = 'none';
        showToast('All pages cleared', 'success');
    }
}

async function downloadMergedPDF() {
    if (pdfPages.length === 0) {
        showToast('No pages to merge', 'warning');
        return;
    }
    
    showLoading('Creating merged PDF...');
    
    try {
        // Create a new PDF document
        const mergedPdf = await PDFLib.PDFDocument.create();
        
        // Add all pages in the current order
        for (const page of pdfPages) {
            const [copiedPage] = await mergedPdf.copyPages(page.pdfDoc, [0]);
            mergedPdf.addPage(copiedPage);
        }
        
        // Generate the PDF bytes
        const pdfBytes = await mergedPdf.save();
        
        // Create download link
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `merged-pdf-${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up
        URL.revokeObjectURL(url);
        
        hideLoading();
        showToast(`Successfully downloaded merged PDF with ${pdfPages.length} pages`, 'success');
        
    } catch (error) {
        hideLoading();
        showToast('Error creating merged PDF: ' + error.message, 'error');
        console.error('Error creating merged PDF:', error);
    }
}

// Utility functions
function updateProgress(percentage) {
    progressFill.style.width = `${percentage}%`;
}

function showLoading(text = 'Loading...') {
    loadingText.textContent = text;
    loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    loadingOverlay.style.display = 'none';
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 3000);
    
    // Click to dismiss
    toast.addEventListener('click', () => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    });
}

// Handle page visibility change to pause/resume processing
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Page is hidden, pause any ongoing operations
        console.log('Page hidden, pausing operations');
    } else {
        // Page is visible, resume operations
        console.log('Page visible, resuming operations');
    }
});

// Handle window resize for responsive design
window.addEventListener('resize', function() {
    // Reinitialize sortable if needed
    if (sortableInstance && pdfPages.length > 0) {
        initializeSortable();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Ctrl/Cmd + S to download
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (pdfPages.length > 0) {
            downloadMergedPDF();
        }
    }
    
    // Escape to clear all
    if (event.key === 'Escape') {
        if (pdfPages.length > 0) {
            clearAllPages();
        }
    }
});

// Error handling for unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    showToast('An unexpected error occurred', 'error');
});

// Initialize tooltips and accessibility
document.addEventListener('DOMContentLoaded', function() {
    // Add keyboard navigation support
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                button.click();
            }
        });
    });
});
