// Global variables
let pdfPages = [];
let sortableInstance = null;
let currentPreviewPage = null;
let originalPdfDocuments = []; // Store original PDF documents

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

// Preview modal elements
const previewModal = document.getElementById('previewModal');
const closePreviewBtn = document.getElementById('closePreviewBtn');
const previewTitle = document.getElementById('previewTitle');
const previewImage = document.getElementById('previewImage');
const previewPageNumber = document.getElementById('previewPageNumber');
const previewSource = document.getElementById('previewSource');
const removeFromPreviewBtn = document.getElementById('removeFromPreviewBtn');
const moveToTopBtn = document.getElementById('moveToTopBtn');
const moveToBottomBtn = document.getElementById('moveToBottomBtn');

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
    
    // Preview modal events
    closePreviewBtn.addEventListener('click', closePreviewModal);
    removeFromPreviewBtn.addEventListener('click', removeFromPreview);
    moveToTopBtn.addEventListener('click', movePageToTop);
    moveToBottomBtn.addEventListener('click', movePageToBottom);
    
    // Close modal when clicking outside
    previewModal.addEventListener('click', function(event) {
        if (event.target === previewModal) {
            closePreviewModal();
        }
    });
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
    const supportedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/png',
        'image/jpeg',
        'image/jpg'
    ];
    
    const supportedFiles = files.filter(file => supportedTypes.includes(file.type));
    
    if (supportedFiles.length !== files.length) {
        showToast('Some files are not supported. Only PDF, DOC, XLS, PPT, PNG, JPG files are allowed.', 'warning');
    }
    
    if (supportedFiles.length > 0) {
        processFiles(supportedFiles);
    }
}

async function processFiles(files) {
    showLoading('Processing files...');
    
    try {
        let totalPages = 0;
        let processedPages = 0;
        
        // First pass: count total pages and convert non-PDF files
        const processedFiles = [];
        
        for (const file of files) {
            if (file.type === 'application/pdf') {
                processedFiles.push(file);
                const arrayBuffer = await file.arrayBuffer();
                const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
                totalPages += pdfDoc.getPageCount();
            } else {
                // Convert non-PDF files to PDF
                showLoading(`Converting ${file.name}...`);
                const convertedPdf = await convertToPdf(file);
                if (convertedPdf) {
                    processedFiles.push(convertedPdf);
                    totalPages += 1; // Assume 1 page for converted files
                }
            }
        }
        
        // Second pass: extract pages
        for (const file of processedFiles) {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const pageCount = pdfDoc.getPageCount();
            
            // Store the original PDF document
            const docIndex = originalPdfDocuments.length;
            originalPdfDocuments.push({
                pdfDoc: pdfDoc,
                fileName: file.name,
                pageCount: pageCount
            });
            
            for (let i = 0; i < pageCount; i++) {
                const page = pdfDoc.getPage(i);
                const pageNumber = i + 1;
                
                // Generate thumbnail
                const thumbnail = await generateThumbnail(page);
                
                // Create a separate PDF document for this page to avoid reference issues
                const singlePageDoc = await PDFLib.PDFDocument.create();
                const [copiedPage] = await singlePageDoc.copyPages(pdfDoc, [i]);
                singlePageDoc.addPage(copiedPage);
                
                // Add page to our collection with both reference and separate document
                pdfPages.push({
                    id: Date.now() + Math.random() + i, // Unique ID with page index
                    sourceFile: file.name,
                    pageNumber: pageNumber,
                    docIndex: docIndex, // Reference to original document
                    pageIndex: i, // Page index within the document
                    pdfDoc: singlePageDoc, // Separate document for this page
                    thumbnail: thumbnail,
                    originalPage: page
                });
                
                processedPages++;
                updateProgress((processedPages / totalPages) * 100);
            }
        }
        
        displayPages();
        hideLoading();
        showToast(`Successfully processed ${totalPages} pages from ${processedFiles.length} file(s)`, 'success');
        
    } catch (error) {
        hideLoading();
        showToast('Error processing files: ' + error.message, 'error');
        console.error('Error processing files:', error);
    }
}

// Convert non-PDF files to PDF (simplified version - for images only)
async function convertToPdf(file) {
    try {
        if (file.type.startsWith('image/')) {
            // For images, create a simple PDF with the image
            const pdfDoc = await PDFLib.PDFDocument.create();
            const arrayBuffer = await file.arrayBuffer();
            
            let image;
            if (file.type === 'image/png') {
                image = await pdfDoc.embedPng(arrayBuffer);
            } else if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
                image = await pdfDoc.embedJpg(arrayBuffer);
            } else {
                throw new Error('Unsupported image format');
            }
            
            const page = pdfDoc.addPage();
            const { width, height } = page.getSize();
            const imageSize = image.scale(0.8);
            
            page.drawImage(image, {
                x: (width - imageSize.width) / 2,
                y: (height - imageSize.height) / 2,
                width: imageSize.width,
                height: imageSize.height,
            });
            
            const pdfBytes = await pdfDoc.save();
            return new File([pdfBytes], file.name.replace(/\.[^/.]+$/, '.pdf'), { type: 'application/pdf' });
        } else {
            // For other file types, show a message that conversion is not supported
            showToast(`File type ${file.type} conversion is not supported yet. Please convert to PDF first.`, 'warning');
            return null;
        }
    } catch (error) {
        console.error('Error converting file to PDF:', error);
        showToast(`Error converting ${file.name} to PDF`, 'error');
        return null;
    }
}

async function generateThumbnail(page, isPreview = false) {
    try {
        // Create a canvas to render the page
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        // Set canvas size - higher quality for preview
        const scale = isPreview ? 1.5 : 0.4; // Higher resolution for thumbnails
        const viewport = page.getViewport({ scale });
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Render the page to canvas
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        // Convert to blob for better quality
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                resolve(url);
            }, 'image/png', 0.9);
        });
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
        `<img src="${page.thumbnail}" alt="Page ${page.pageNumber}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 4px;">` :
        `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666; font-size: 14px;">📄 Page ${page.pageNumber}</div>`;
    
    pageDiv.innerHTML = `
        <div class="page-preview" onclick="showPagePreview('${page.id}')">
            ${thumbnail}
        </div>
        <div class="page-info">
            <div class="page-number">Page ${page.pageNumber}</div>
            <div class="page-source">${page.sourceFile}</div>
        </div>
        <button class="remove-btn" onclick="removePage('${page.id}')" title="Remove page">×</button>
    `;
    
    // Add click event to the entire page item (except remove button)
    pageDiv.addEventListener('click', function(event) {
        if (!event.target.classList.contains('remove-btn')) {
            showPagePreview(page.id);
        }
    });
    
    // Prevent drag when clicking remove button
    const removeBtn = pageDiv.querySelector('.remove-btn');
    removeBtn.addEventListener('mousedown', function(event) {
        event.stopPropagation();
    });
    
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
        draggable: '.page-item',
        onEnd: function(evt) {
            // Update the pdfPages array based on new order
            const newOrder = [];
            const pageElements = Array.from(pagesList.children);
            
            for (const el of pageElements) {
                const pageId = el.getAttribute('data-page-id');
                const page = pdfPages.find(p => p.id == pageId);
                if (page) {
                    newOrder.push(page);
                }
            }
            
            pdfPages = newOrder;
            console.log('Pages reordered:', pdfPages.length, 'pages');
        }
    });
}

function removePage(pageId) {
    const pageToRemove = pdfPages.find(page => page.id === pageId);
    if (pageToRemove && pageToRemove.thumbnail && pageToRemove.thumbnail.startsWith('blob:')) {
        URL.revokeObjectURL(pageToRemove.thumbnail);
    }
    
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
        // Clean up thumbnail URLs
        pdfPages.forEach(page => {
            if (page.thumbnail && page.thumbnail.startsWith('blob:')) {
                URL.revokeObjectURL(page.thumbnail);
            }
        });
        
        pdfPages = [];
        originalPdfDocuments = []; // Clear original documents too
        displayPages();
        pagesSection.style.display = 'none';
        showToast('All pages cleared', 'success');
    }
}

function removeCorruptedPages() {
    const validPages = getValidPages();
    const corruptedCount = pdfPages.length - validPages.length;
    
    if (corruptedCount === 0) {
        showToast('No corrupted pages found', 'success');
        return;
    }
    
    if (confirm(`Found ${corruptedCount} corrupted page(s). Remove them from the list?`)) {
        pdfPages = validPages;
        displayPages();
        
        if (pdfPages.length === 0) {
            pagesSection.style.display = 'none';
        }
        
        showToast(`${corruptedCount} corrupted page(s) removed`, 'success');
    }
}

async function downloadMergedPDF() {
    console.log('Starting merge with', pdfPages.length, 'pages');
    if (pdfPages.length === 0) {
        showToast('No pages to merge', 'warning');
        return;
    }
    
    showLoading('Creating merged PDF...');
    
    try {
        // Create a new PDF document
        const mergedPdf = await PDFLib.PDFDocument.create();
        
        // Add all pages in the current order
        let pagesAdded = 0;
        for (let i = 0; i < pdfPages.length; i++) {
            const page = pdfPages[i];
            
            if (!page) {
                console.warn(`Skipping null page at index ${i}`);
                continue;
            }
            
            if (!page.pdfDoc) {
                console.warn(`Skipping page without pdfDoc at index ${i}`);
                continue;
            }
            
            try {
                const [copiedPage] = await mergedPdf.copyPages(page.pdfDoc, [0]);
                mergedPdf.addPage(copiedPage);
                pagesAdded++;
            } catch (pageError) {
                console.error(`Error copying page ${i + 1}:`, pageError);
                continue;
            }
        }
        
        console.log(`Added ${pagesAdded} pages to merged PDF`);
        
        // Check if we have any pages
        if (pagesAdded === 0) {
            hideLoading();
            showToast('No valid pages to merge', 'error');
            return;
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
        showToast(`Successfully downloaded merged PDF with ${pagesAdded} pages`, 'success');
        
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

// Debug function to validate all pages (non-destructive)
function validatePages() {
    console.log('Validating pages...');
    let validPages = 0;
    let invalidPages = 0;
    const invalidPageIndices = [];
    
    pdfPages.forEach((page, index) => {
        if (!page || !page.id || !page.pdfDoc) {
            console.error(`Invalid page at index ${index}:`, page);
            invalidPages++;
            invalidPageIndices.push(index + 1);
        } else {
            validPages++;
        }
    });
    
    console.log(`Validation complete: ${validPages} valid, ${invalidPages} invalid pages`);
    
    if (invalidPages > 0) {
        // Show warning but don't remove pages from display
        showToast(`Warning: ${invalidPages} page(s) have corrupted data and will be skipped during merge`, 'warning');
        console.error('Invalid page indices:', invalidPageIndices);
        return false;
    }
    
    return true;
}

// Get only valid pages for merging (non-destructive filtering)
function getValidPages() {
    return pdfPages.filter(page => page && page.id && page.pdfDoc);
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

// Preview modal functions
async function showPagePreview(pageId) {
    const page = pdfPages.find(p => p.id === pageId);
    if (!page) return;
    
    currentPreviewPage = page;
    
    // Update modal content
    previewTitle.textContent = `Page ${page.pageNumber} Preview`;
    previewPageNumber.textContent = page.pageNumber;
    previewSource.textContent = page.sourceFile;
    
    // Use existing thumbnail or generate high-quality preview
    if (page.thumbnail) {
        previewImage.src = page.thumbnail;
    } else {
        showLoading('Generating preview...');
        const previewImageData = await generateThumbnail(page.originalPage, true);
        hideLoading();
        previewImage.src = previewImageData || '';
    }
    
    // Show modal
    previewModal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closePreviewModal() {
    previewModal.style.display = 'none';
    document.body.style.overflow = ''; // Restore scrolling
    currentPreviewPage = null;
}

function removeFromPreview() {
    if (currentPreviewPage) {
        removePage(currentPreviewPage.id);
        closePreviewModal();
    }
}

function movePageToTop() {
    if (currentPreviewPage) {
        const pageIndex = pdfPages.findIndex(p => p.id === currentPreviewPage.id);
        if (pageIndex > 0) {
            // Validate page object before moving
            const page = pdfPages[pageIndex];
            if (!page || !page.pdfDoc) {
                showToast('Error: Page data is corrupted', 'error');
                return;
            }
            
            // Create a clean copy of the page object to avoid reference issues
            const pageToMove = {
                ...page,
                id: page.id, // Ensure ID is preserved
                pdfDoc: page.pdfDoc, // Ensure PDF document is preserved
                originalPage: page.originalPage, // Ensure original page is preserved
                thumbnail: page.thumbnail,
                sourceFile: page.sourceFile,
                pageNumber: page.pageNumber
            };
            
            pdfPages.splice(pageIndex, 1);
            pdfPages.unshift(pageToMove);
            displayPages();
            showToast('Page moved to top', 'success');
        }
    }
}

function movePageToBottom() {
    if (currentPreviewPage) {
        const pageIndex = pdfPages.findIndex(p => p.id === currentPreviewPage.id);
        if (pageIndex < pdfPages.length - 1) {
            // Validate page object before moving
            const page = pdfPages[pageIndex];
            if (!page || !page.pdfDoc) {
                showToast('Error: Page data is corrupted', 'error');
                return;
            }
            
            // Create a clean copy of the page object to avoid reference issues
            const pageToMove = {
                ...page,
                id: page.id, // Ensure ID is preserved
                pdfDoc: page.pdfDoc, // Ensure PDF document is preserved
                originalPage: page.originalPage, // Ensure original page is preserved
                thumbnail: page.thumbnail,
                sourceFile: page.sourceFile,
                pageNumber: page.pageNumber
            };
            
            pdfPages.splice(pageIndex, 1);
            pdfPages.push(pageToMove);
            displayPages();
            showToast('Page moved to bottom', 'success');
        }
    }
}

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
    
    // Add keyboard support for preview modal
    document.addEventListener('keydown', function(event) {
        if (previewModal.style.display === 'flex') {
            if (event.key === 'Escape') {
                closePreviewModal();
            }
        }
    });
});
