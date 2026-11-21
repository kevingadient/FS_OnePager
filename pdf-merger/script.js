// Set worker path for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Global State
let uploadedFiles = []; // [{ id, name, size, type, pageCount }]
let pdfPages = [];      // [{ id, fileId, fileName, pageNumber, pageIndex, arrayBuffer, rotation, isImage, imageDataUrl }]
let sortableInstance = null;
let currentPreviewPageId = null;

// Annotations & Signature State
// pageAnnotations[pageId] = [ { id, type: 'sig'|'text'|'date', content, x, y, width, height, fontSize, color, fontFamily } ]
let pageAnnotations = {};
let savedSignatures = [];
let activeSignatureData = null;
let desktopPeer = null;
let desktopPeerId = null;
let activePeerConn = null;
let currentSigTab = 'mobile';
let selectedDrawColor = '#0f172a';
let selectedTypeFont = "'Dancing Script', cursive";

// Modal inspection preview dimensions for coordinate mapping
let modalPageDimensions = { width: 1, height: 1 }; // rendered width and height in px
let currentActiveAnnotationId = null;

// DOM Elements
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const uploadHero = document.getElementById('uploadHero');
const pagesSection = document.getElementById('pagesSection');
const pagesList = document.getElementById('pagesList');
const filesListContainer = document.getElementById('filesListContainer');

const progressBarContainer = document.getElementById('progressBarContainer');
const progressFill = document.getElementById('progressFill');
const progressStatusText = document.getElementById('progressStatusText');
const progressPercentText = document.getElementById('progressPercentText');

const loadingOverlay = document.getElementById('loadingOverlay');
const loadingText = document.getElementById('loadingText');
const toastContainer = document.getElementById('toastContainer');

const previewModal = document.getElementById('previewModal');
const outputFilenameInput = document.getElementById('outputFilenameInput');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadSavedSignaturesFromStorage();
    initEventListeners();
    initSortable();
    initDesktopDrawCanvas();
});

function loadSavedSignaturesFromStorage() {
    try {
        const stored = localStorage.getItem('pdf_merger_saved_signatures');
        if (stored) {
            savedSignatures = JSON.parse(stored);
            if (!Array.isArray(savedSignatures)) savedSignatures = [];
        }
    } catch (e) {
        console.warn('Could not load signatures from localStorage:', e);
    }
}

function initEventListeners() {
    // File input change
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and Drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFiles(Array.from(e.dataTransfer.files));
        }
    });

    // Close preview modal on backdrop click
    previewModal.addEventListener('click', (e) => {
        if (e.target === previewModal) {
            closePreviewModal();
        }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && previewModal.style.display !== 'none') {
            closePreviewModal();
        }
    });
}

// File Processing Pipeline
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        processFiles(files);
        // Reset file input value so same file can be re-uploaded if desired
        fileInput.value = '';
    }
}

async function processFiles(files) {
    showLoading('Reading uploaded files...');
    showProgress(0, 'Preparing files...');

    const validFiles = files.filter(f => 
        f.type === 'application/pdf' || 
        f.type.startsWith('image/')
    );

    if (validFiles.length < files.length) {
        showToast('Some unsupported files were skipped. Only PDF, PNG, JPG, WEBP allowed.', 'warning');
    }

    if (validFiles.length === 0) {
        hideLoading();
        hideProgress();
        return;
    }

    let totalSteps = validFiles.length;
    let currentStep = 0;

    for (const file of validFiles) {
        currentStep++;
        showProgress((currentStep / totalSteps) * 50, `Loading ${file.name}...`);

        const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const arrayBuffer = await file.arrayBuffer();

        if (file.type === 'application/pdf') {
            await processPdfFile(file, fileId, arrayBuffer);
        } else if (file.type.startsWith('image/')) {
            await processImageFile(file, fileId, arrayBuffer);
        }
    }

    renderUI();
    hideLoading();
    hideProgress();
    showToast(`Successfully processed ${validFiles.length} file(s)`, 'success');
}

// PDF Extractor via PDF.js & pdf-lib
async function processPdfFile(file, fileId, arrayBuffer) {
    try {
        // Load with PDF.js to get page count and page info
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
        const pdfJsDoc = await loadingTask.promise;
        const pageCount = pdfJsDoc.numPages;

        uploadedFiles.push({
            id: fileId,
            name: file.name,
            size: formatBytes(file.size),
            type: 'PDF',
            pageCount: pageCount,
            arrayBuffer: arrayBuffer
        });

        for (let i = 0; i < pageCount; i++) {
            pdfPages.push({
                id: 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                fileId: fileId,
                fileName: file.name,
                pageNumber: i + 1,
                pageIndex: i,
                arrayBuffer: arrayBuffer,
                rotation: 0,
                isImage: false
            });
        }
    } catch (err) {
        console.error('Error loading PDF:', err);
        showToast(`Could not load ${file.name}: ${err.message}`, 'error');
    }
}

// Convert Image into PDF page object
async function processImageFile(file, fileId, arrayBuffer) {
    try {
        // Embed image into a single-page PDF document using pdf-lib
        const pdfDoc = await PDFLib.PDFDocument.create();
        let image;
        
        if (file.type === 'image/png') {
            image = await pdfDoc.embedPng(arrayBuffer);
        } else {
            // JPEG / JPG / WEBP fallback conversion
            const blob = new Blob([arrayBuffer], { type: file.type });
            const dataUrl = await blobToDataURL(blob);
            const jpgBytes = await dataURLToJpgArrayBuffer(dataUrl);
            image = await pdfDoc.embedJpg(jpgBytes);
        }

        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height
        });

        const imagePdfBytes = await pdfDoc.save();
        const imageDataUrl = URL.createObjectURL(file);

        uploadedFiles.push({
            id: fileId,
            name: file.name,
            size: formatBytes(file.size),
            type: 'IMAGE',
            pageCount: 1,
            arrayBuffer: imagePdfBytes.buffer
        });

        pdfPages.push({
            id: 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            fileId: fileId,
            fileName: file.name,
            pageNumber: 1,
            pageIndex: 0,
            arrayBuffer: imagePdfBytes.buffer,
            rotation: 0,
            isImage: true,
            imageDataUrl: imageDataUrl
        });

    } catch (err) {
        console.error('Error converting image:', err);
        showToast(`Could not process image ${file.name}`, 'error');
    }
}

// Render UI Components
function renderUI() {
    renderFilesList();
    renderPagesGrid();
    updateSummary();

    if (pdfPages.length > 0) {
        pagesSection.style.display = 'flex';
        uploadHero.style.display = 'none';
    } else {
        pagesSection.style.display = 'none';
        uploadHero.style.display = 'flex';
    }
}

// Render Right Side "Selected Files" List
function renderFilesList() {
    if (uploadedFiles.length === 0) {
        filesListContainer.innerHTML = `
            <div class="empty-files-placeholder">
                <div class="placeholder-icon">📂</div>
                <p>No files uploaded yet</p>
                <span>Uploaded files will appear here</span>
            </div>
        `;
        document.getElementById('fileCountBadge').textContent = '0 Files';
        return;
    }

    document.getElementById('fileCountBadge').textContent = `${uploadedFiles.length} File(s)`;
    filesListContainer.innerHTML = '';

    uploadedFiles.forEach(file => {
        const item = document.createElement('div');
        item.className = 'file-item-card';
        item.innerHTML = `
            <div class="file-item-info">
                <div class="file-icon-box">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div class="file-name-meta">
                    <strong title="${file.name}">${file.name}</strong>
                    <span>${file.pageCount} page(s) • ${file.size}</span>
                </div>
            </div>
            <button class="file-remove-btn" onclick="removeFile('${file.id}')" title="Remove file">&times;</button>
        `;
        filesListContainer.appendChild(item);
    });
}

// Render Left Side Page Cards Grid with dynamic PDF.js thumbnails
function renderPagesGrid() {
    pagesList.innerHTML = '';
    document.getElementById('pageCountBadge').textContent = `${pdfPages.length} Pages`;

    pdfPages.forEach((pageObj, index) => {
        const card = createPageCardElement(pageObj, index);
        pagesList.appendChild(card);
        
        // Render crisp thumbnail canvas asynchronously
        const canvas = card.querySelector('canvas');
        if (canvas) {
            renderPageThumbnail(pageObj, canvas);
        }
    });

    initSortable();
}

function createPageCardElement(pageObj, index) {
    const card = document.createElement('div');
    card.className = 'page-card';
    card.setAttribute('data-page-id', pageObj.id);

    const annotationsCount = (pageAnnotations[pageObj.id] || []).length;
    const annotationBadge = annotationsCount > 0 ? `<span class="annotation-page-badge" title="${annotationsCount} signature/annotation(s)">✍️ ${annotationsCount}</span>` : '';

    card.innerHTML = `
        <button class="delete-btn" onclick="deletePage('${pageObj.id}', event)" title="Delete page">&times;</button>
        ${annotationBadge}
        <div class="preview-box">
            <canvas id="canvas_${pageObj.id}"></canvas>
            <div class="page-card-overlay">
                <button class="quick-act-btn" onclick="openPageInspection('${pageObj.id}', event)" title="Zoom Preview">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                </button>
                <button class="quick-act-btn" onclick="rotatePage('${pageObj.id}', 90, event)" title="Rotate 90°">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                </button>
            </div>
        </div>
        <div class="page-card-footer">
            <div class="page-number-tag">
                <span>Page ${index + 1}</span>
                ${pageObj.rotation ? `<span style="font-size:0.7rem; color:var(--color-sunset-gold);">${pageObj.rotation}°</span>` : ''}
            </div>
            <div class="page-source-tag" title="${pageObj.fileName}">${pageObj.fileName}</div>
        </div>
    `;

    // Click card to inspect
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.delete-btn') && !e.target.closest('.quick-act-btn')) {
            openPageInspection(pageObj.id);
        }
    });

    return card;
}

// Render dynamic canvas thumbnail using PDF.js
async function renderPageThumbnail(pageObj, canvasElement) {
    try {
        if (pageObj.isImage && pageObj.imageDataUrl) {
            const ctx = canvasElement.getContext('2d');
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(160 / img.width, 200 / img.height);
                canvasElement.width = img.width * scale;
                canvasElement.height = img.height * scale;
                ctx.drawImage(img, 0, 0, canvasElement.width, canvasElement.height);
            };
            img.src = pageObj.imageDataUrl;
            return;
        }

        const loadingTask = pdfjsLib.getDocument({ data: pageObj.arrayBuffer.slice(0) });
        const pdfJsDoc = await loadingTask.promise;
        const page = await pdfJsDoc.getPage(pageObj.pageIndex + 1);

        const viewport = page.getViewport({ scale: 0.35, rotation: pageObj.rotation });
        canvasElement.width = viewport.width;
        canvasElement.height = viewport.height;

        const context = canvasElement.getContext('2d');
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

    } catch (err) {
        console.error('Thumbnail render error:', err);
    }
}

// SortableJS initialization
function initSortable() {
    if (sortableInstance) {
        sortableInstance.destroy();
    }

    sortableInstance = new Sortable(pagesList, {
        animation: 180,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        draggable: '.page-card',
        onEnd: function() {
            // Synchronize internal pdfPages order with new DOM order
            const newOrder = [];
            const cards = Array.from(pagesList.children);
            
            cards.forEach(card => {
                const pageId = card.getAttribute('data-page-id');
                const p = pdfPages.find(item => item.id === pageId);
                if (p) newOrder.push(p);
            });

            pdfPages = newOrder;
            renderPagesGrid();
            showToast('Page order updated', 'success');
        }
    });
}

// Page Actions (Rotate, Delete, Reorder, Clear)
function rotatePage(pageId, angle = 90, e = null) {
    if (e) e.stopPropagation();
    const page = pdfPages.find(p => p.id === pageId);
    if (page) {
        page.rotation = (page.rotation + angle) % 360;
        renderPagesGrid();
    }
}

function rotateAllPages(angle = 90) {
    pdfPages.forEach(p => {
        p.rotation = (p.rotation + angle) % 360;
    });
    renderPagesGrid();
    showToast(`Rotated all pages by ${angle}°`, 'success');
}

function deletePage(pageId, e = null) {
    if (e) e.stopPropagation();
    pdfPages = pdfPages.filter(p => p.id !== pageId);
    renderUI();
    showToast('Page removed', 'success');
}

function removeFile(fileId) {
    uploadedFiles = uploadedFiles.filter(f => f.id !== fileId);
    pdfPages = pdfPages.filter(p => p.fileId !== fileId);
    renderUI();
    showToast('File removed', 'success');
}

function clearAllPages() {
    if (pdfPages.length === 0) return;
    if (confirm('Are you sure you want to remove all pages?')) {
        pdfPages = [];
        uploadedFiles = [];
        renderUI();
        showToast('All pages cleared', 'success');
    }
}

function sortPagesByName() {
    pdfPages.sort((a, b) => a.fileName.localeCompare(b.fileName) || a.pageNumber - b.pageNumber);
    renderPagesGrid();
    showToast('Pages sorted by document name', 'success');
}

function filterPages() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    const cards = Array.from(pagesList.children);

    cards.forEach(card => {
        const pageId = card.getAttribute('data-page-id');
        const page = pdfPages.find(p => p.id === pageId);
        if (page) {
            const matches = page.fileName.toLowerCase().includes(query) || 
                            `page ${page.pageNumber}`.includes(query);
            card.style.display = matches ? 'flex' : 'none';
        }
    });
}

// USP Feature cards display application capabilities visually

// Full Inspection Preview Modal
async function openPageInspection(pageId, e = null) {
    if (e) e.stopPropagation();
    const pageObj = pdfPages.find(p => p.id === pageId);
    if (!pageObj) return;

    currentPreviewPageId = pageId;

    document.getElementById('previewTitle').textContent = `Page Inspection & Annotations`;
    document.getElementById('previewBadge').textContent = `Page ${pdfPages.indexOf(pageObj) + 1}`;
    document.getElementById('previewSource').textContent = pageObj.fileName;
    document.getElementById('previewPageNumber').textContent = pageObj.pageNumber;
    document.getElementById('previewRotationText').textContent = `${pageObj.rotation}°`;

    const canvas = document.getElementById('modalPreviewCanvas');
    const img = document.getElementById('modalPreviewImage');
    const overlay = document.getElementById('annotationOverlay');
    const container = document.getElementById('modalCanvasContainer');

    if (pageObj.isImage && pageObj.imageDataUrl) {
        canvas.style.display = 'none';
        img.style.display = 'block';
        img.src = pageObj.imageDataUrl;
        img.style.transform = `rotate(${pageObj.rotation}deg)`;
        
        await new Promise(r => {
            if (img.complete) r();
            else img.onload = r;
        });
        modalPageDimensions = {
            width: img.naturalWidth || 600,
            height: img.naturalHeight || 800,
            renderedWidth: img.clientWidth || img.naturalWidth || 600,
            renderedHeight: img.clientHeight || img.naturalHeight || 800
        };
    } else {
        img.style.display = 'none';
        canvas.style.display = 'block';

        showLoading('Rendering high-res preview...');
        try {
            const loadingTask = pdfjsLib.getDocument({ data: pageObj.arrayBuffer.slice(0) });
            const pdfJsDoc = await loadingTask.promise;
            const page = await pdfJsDoc.getPage(pageObj.pageIndex + 1);

            const viewport = page.getViewport({ scale: 1.2, rotation: pageObj.rotation });
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport: viewport }).promise;
            
            // Unscaled original page viewport (scale 1.0) for accurate PDF coordinate mapping
            const originalViewport = page.getViewport({ scale: 1.0, rotation: 0 });
            modalPageDimensions = {
                width: viewport.width,
                height: viewport.height,
                renderedWidth: canvas.clientWidth || viewport.width,
                renderedHeight: canvas.clientHeight || viewport.height,
                originalWidth: originalViewport.width,
                originalHeight: originalViewport.height
            };
        } catch (err) {
            console.error('Modal render error:', err);
        }
        hideLoading();
    }

    // Synchronize overlay to exact displayed element dimensions
    const displayEl = canvas.style.display !== 'none' ? canvas : img;
    const dispRect = displayEl.getBoundingClientRect();
    const actualWidth = dispRect.width || displayEl.clientWidth || modalPageDimensions.width;
    const actualHeight = dispRect.height || displayEl.clientHeight || modalPageDimensions.height;

    modalPageDimensions.renderedWidth = actualWidth;
    modalPageDimensions.renderedHeight = actualHeight;

    if (overlay) {
        overlay.style.width = actualWidth + 'px';
        overlay.style.height = actualHeight + 'px';
    }

    renderOverlayAnnotations();
    updatePreviewAnnotationCount();

    previewModal.style.display = 'flex';
}

function updatePreviewAnnotationCount() {
    const list = pageAnnotations[currentPreviewPageId] || [];
    const countSpan = document.getElementById('previewAnnotationCount');
    if (countSpan) {
        countSpan.textContent = `${list.length} element(s)`;
    }
}

function clearCurrentPageAnnotations() {
    if (!currentPreviewPageId) return;
    if (confirm('Clear all signatures, text, and dates from this page?')) {
        delete pageAnnotations[currentPreviewPageId];
        renderOverlayAnnotations();
        renderPagesGrid();
        updatePreviewAnnotationCount();
        showToast('Page annotations cleared', 'success');
    }
}

function closePreviewModal() {
    previewModal.style.display = 'none';
    currentPreviewPageId = null;
}

function rotateCurrentPreview(angle = 90) {
    if (currentPreviewPageId) {
        rotatePage(currentPreviewPageId, angle);
        openPageInspection(currentPreviewPageId);
    }
}

function removeFromPreview() {
    if (currentPreviewPageId) {
        deletePage(currentPreviewPageId);
        closePreviewModal();
    }
}

function movePageToTop() {
    if (!currentPreviewPageId) return;
    const index = pdfPages.findIndex(p => p.id === currentPreviewPageId);
    if (index > 0) {
        const [moved] = pdfPages.splice(index, 1);
        pdfPages.unshift(moved);
        renderPagesGrid();
        openPageInspection(currentPreviewPageId);
        showToast('Moved to top', 'success');
    }
}

function movePageToBottom() {
    if (!currentPreviewPageId) return;
    const index = pdfPages.findIndex(p => p.id === currentPreviewPageId);
    if (index < pdfPages.length - 1) {
        const [moved] = pdfPages.splice(index, 1);
        pdfPages.push(moved);
        renderPagesGrid();
        openPageInspection(currentPreviewPageId);
        showToast('Moved to bottom', 'success');
    }
}

// PDF Merging & Download (via pdf-lib)
async function downloadMergedPDF() {
    if (pdfPages.length === 0) {
        showToast('Please upload PDF files first', 'warning');
        return;
    }

    showLoading('Assembling & merging PDF...');

    try {
        const mergedPdf = await PDFLib.PDFDocument.create();

        for (let i = 0; i < pdfPages.length; i++) {
            const pageItem = pdfPages[i];
            
            // Load original PDF document buffer
            const srcDoc = await PDFLib.PDFDocument.load(pageItem.arrayBuffer.slice(0));
            const [copiedPage] = await mergedPdf.copyPages(srcDoc, [pageItem.pageIndex]);

            // Apply rotation angle if modified
            if (pageItem.rotation) {
                const existingRotation = copiedPage.getRotation().angle || 0;
                copiedPage.setRotation(PDFLib.degrees((existingRotation + pageItem.rotation) % 360));
            }

            // Burn/Embed any placed signatures, text, and dates onto this page
            const annotations = pageAnnotations[pageItem.id] || [];
            if (annotations.length > 0) {
                await burnAnnotationsOntoPage(mergedPdf, copiedPage, annotations, pageItem.rotation || 0);
            }

            mergedPdf.addPage(copiedPage);
        }

        const pdfBytes = await mergedPdf.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        let filename = outputFilenameInput.value.trim() || 'Merged_Document';
        if (!filename.endsWith('.pdf')) filename += '.pdf';

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(() => URL.revokeObjectURL(url), 1000);

        hideLoading();
        showToast(`Successfully merged ${pdfPages.length} pages into ${filename}`, 'success');

    } catch (err) {
        console.error('Merge error:', err);
        hideLoading();
        showToast(`Merge failed: ${err.message}`, 'error');
    }
}

// Utilities
function updateSummary() {
    document.getElementById('summaryTotalPages').textContent = pdfPages.length;
    document.getElementById('summaryTotalFiles').textContent = uploadedFiles.length;
}

function showLoading(text) {
    loadingText.textContent = text || 'Loading...';
    loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    loadingOverlay.style.display = 'none';
}

function showProgress(percent, text) {
    progressBarContainer.style.display = 'block';
    progressFill.style.width = `${percent}%`;
    progressStatusText.textContent = text || 'Processing...';
    progressPercentText.textContent = `${Math.round(percent)}%`;
}

function hideProgress() {
    progressBarContainer.style.display = 'none';
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);
    setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3200);
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function dataURLToJpgArrayBuffer(dataUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
                blob.arrayBuffer().then(resolve);
            }, 'image/jpeg', 0.9);
        };
        img.src = dataUrl;
    });
}

function toggleLayoutView() {
    pagesList.classList.toggle('compact-view');
    showToast('Toggled grid layout', 'success');
}

/* ==========================================================================
   ANNOTATIONS ENGINE: Signatures, Text, Dates, Drag/Resize & PDF-Lib Embedding
   ========================================================================== */

// --- Signature Creator Modal Management ---
function openSignatureModal() {
    document.getElementById('signatureModal').style.display = 'flex';
    switchSigTab(currentSigTab || 'mobile');
    renderStoredSignatures();
}

function closeSignatureModal() {
    document.getElementById('signatureModal').style.display = 'none';
}

function switchSigTab(tabName) {
    currentSigTab = tabName;
    document.querySelectorAll('.sig-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.sig-pane').forEach(p => p.classList.remove('active'));

    const tabBtn = document.querySelector(`.sig-tab[data-tab="${tabName}"]`);
    if (tabBtn) tabBtn.classList.add('active');

    const paneMap = {
        'mobile': 'tabMobile',
        'draw': 'tabDraw',
        'type': 'tabType',
        'upload': 'tabUpload'
    };
    const targetPane = document.getElementById(paneMap[tabName]);
    if (targetPane) targetPane.classList.add('active');

    if (tabName === 'mobile') {
        initDesktopWebRTC();
    } else if (tabName === 'draw') {
        setTimeout(resizeDesktopDrawCanvas, 50);
    } else if (tabName === 'type') {
        renderTypedSignatures();
    }
}

// --- Desktop WebRTC / PeerJS Sync for Mobile QR ---
function initDesktopWebRTC() {
    if (desktopPeer && !desktopPeer.destroyed) {
        return; // already active
    }

    const qrContainer = document.getElementById('qrCodeContainer');
    const statusText = document.getElementById('qrStatusText');
    const statusBox = document.getElementById('qrStatusBox');
    const directUrlInput = document.getElementById('mobileDirectUrl');

    statusText.textContent = 'Generating connection ID...';
    qrContainer.innerHTML = '<div class="qr-spinner">Generating QR code...</div>';

    // Unique random peer ID for this session
    const randomId = 'pdf-sig-' + Math.random().toString(36).substr(2, 9);
    desktopPeer = new Peer(randomId);

    desktopPeer.on('open', (id) => {
        desktopPeerId = id;
        statusText.textContent = 'Waiting for mobile scan...';
        statusBox.classList.remove('connected');

        // Formulate target URL
        // If on local file/host, construct mobile signing URL
        const currentOrigin = window.location.origin;
        const pathname = window.location.pathname.replace(/\/index\.html$/, '');
        let targetUrl = `${currentOrigin}${pathname}/sign.html?peer=${id}`;

        // If running directly as file:// or localhost, fallback message/URL
        if (window.location.protocol === 'file:') {
            targetUrl = `http://localhost:8000/sign.html?peer=${id}`;
        }
        directUrlInput.value = targetUrl;

        // Render QR Code
        qrContainer.innerHTML = '';
        new QRCode(qrContainer, {
            text: targetUrl,
            width: 170,
            height: 170,
            colorDark: "#0f172a",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M
        });
    });

    desktopPeer.on('connection', (conn) => {
        activePeerConn = conn;
        statusText.textContent = 'Mobile phone connected!';
        statusBox.classList.add('connected');
        showToast('Phone connected via QR code!', 'success');

        conn.on('data', (data) => {
            if (data && data.type === 'SIGNATURE_IMAGE' && data.dataUrl) {
                statusText.textContent = 'Signature received!';
                showToast('Signature received from phone!', 'success');
                activeSignatureData = data.dataUrl;
                saveSignatureToGallery(data.dataUrl);

                // Auto-close modal and add to current inspected page or activate placement
                setTimeout(() => {
                    closeSignatureModal();
                    if (currentPreviewPageId) {
                        addAnnotationToPage(currentPreviewPageId, {
                            type: 'sig',
                            content: data.dataUrl,
                            x: 35,
                            y: 40,
                            width: 160,
                            height: 60
                        });
                    } else if (pdfPages.length > 0) {
                        // Open first page inspection with signature placed
                        openPageInspection(pdfPages[0].id);
                        setTimeout(() => {
                            addAnnotationToPage(pdfPages[0].id, {
                                type: 'sig',
                                content: data.dataUrl,
                                x: 35,
                                y: 40,
                                width: 160,
                                height: 60
                            });
                        }, 250);
                    }
                }, 500);
            }
        });

        conn.on('close', () => {
            statusText.textContent = 'Mobile disconnected';
            statusBox.classList.remove('connected');
        });
    });

    desktopPeer.on('error', (err) => {
        console.error('Desktop peer error:', err);
        statusText.textContent = 'Connection notice: ready for local / manual sign';
    });
}

function copyMobileUrl() {
    const input = document.getElementById('mobileDirectUrl');
    input.select();
    navigator.clipboard.writeText(input.value);
    showToast('Link copied to clipboard!', 'success');
}

// --- Desktop Draw Canvas Engine ---
let desktopDrawCtx = null;
let isDesktopDrawing = false;
let desktopPoints = [];
let desktopHasDrawn = false;

function initDesktopDrawCanvas() {
    const canvas = document.getElementById('desktopDrawCanvas');
    if (!canvas) return;
    desktopDrawCtx = canvas.getContext('2d');

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX || e.touches[0].clientX) - rect.left,
            y: (e.clientY || e.touches[0].clientY) - rect.top
        };
    }

    canvas.addEventListener('pointerdown', (e) => {
        isDesktopDrawing = true;
        const pos = getPos(e);
        desktopPoints = [pos];
        desktopDrawCtx.beginPath();
        desktopDrawCtx.moveTo(pos.x, pos.y);
    });

    canvas.addEventListener('pointermove', (e) => {
        if (!isDesktopDrawing) return;
        const pos = getPos(e);
        desktopPoints.push(pos);
        desktopHasDrawn = true;

        if (desktopPoints.length > 2) {
            const xc = (desktopPoints[desktopPoints.length - 2].x + pos.x) / 2;
            const yc = (desktopPoints[desktopPoints.length - 2].y + pos.y) / 2;
            desktopDrawCtx.quadraticCurveTo(desktopPoints[desktopPoints.length - 2].x, desktopPoints[desktopPoints.length - 2].y, xc, yc);
            desktopDrawCtx.stroke();
        } else {
            desktopDrawCtx.lineTo(pos.x, pos.y);
            desktopDrawCtx.stroke();
        }
    });

    const stop = () => { isDesktopDrawing = false; desktopPoints = []; };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
}

function resizeDesktopDrawCanvas() {
    const container = document.getElementById('desktopDrawContainer');
    const canvas = document.getElementById('desktopDrawCanvas');
    if (!container || !canvas) return;

    const dpr = window.devicePixelRatio || 2;
    canvas.width = container.clientWidth * dpr;
    canvas.height = container.clientHeight * dpr;
    desktopDrawCtx.scale(dpr, dpr);
    desktopDrawCtx.lineCap = 'round';
    desktopDrawCtx.lineJoin = 'round';
    desktopDrawCtx.lineWidth = 3;
    desktopDrawCtx.strokeStyle = selectedDrawColor;
}

function setDrawColor(color) {
    selectedDrawColor = color;
    if (desktopDrawCtx) desktopDrawCtx.strokeStyle = color;
    document.querySelectorAll('.color-dot').forEach(d => {
        d.classList.toggle('active', d.style.background === color || d.getAttribute('data-color') === color);
    });
}

function clearDesktopDraw() {
    resizeDesktopDrawCanvas();
    desktopHasDrawn = false;
}

function getDesktopTrimmedSignature() {
    const canvas = document.getElementById('desktopDrawCanvas');
    const ctx = desktopDrawCtx;
    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let minX = w, minY = h, maxX = 0, maxY = 0;
    let found = false;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (data[(y * w + x) * 4 + 3] > 20) {
                found = true;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    if (!found) return null;

    const pad = 16;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(w, maxX + pad);
    maxY = Math.min(h, maxY + pad);

    const cropW = maxX - minX;
    const cropH = maxY - minY;

    const tCanvas = document.createElement('canvas');
    tCanvas.width = cropW;
    tCanvas.height = cropH;
    const tCtx = tCanvas.getContext('2d');
    tCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
    return tCanvas.toDataURL('image/png');
}

// --- Type Signature Generator ---
function selectTypeFont(el) {
    document.querySelectorAll('.font-choice-card').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    selectedTypeFont = el.getAttribute('data-font');
}

function renderTypedSignatures() {
    const text = document.getElementById('typeSigInput').value.trim() || 'Your Signature';
    document.querySelectorAll('.font-choice-card .font-preview').forEach(p => {
        p.textContent = text;
    });
}

function generateTypedSignatureDataUrl() {
    const text = document.getElementById('typeSigInput').value.trim();
    if (!text) return null;

    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');

    ctx.font = `64px ${selectedTypeFont}`;
    ctx.fillStyle = selectedDrawColor;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, 300, 100);

    // Crop to text bounding box
    const imgData = ctx.getImageData(0, 0, 600, 200);
    const data = imgData.data;
    let minX = 600, minY = 200, maxX = 0, maxY = 0;
    let found = false;

    for (let y = 0; y < 200; y++) {
        for (let x = 0; x < 600; x++) {
            if (data[(y * 600 + x) * 4 + 3] > 20) {
                found = true;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    if (!found) return null;

    const pad = 12;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(600, maxX + pad);
    maxY = Math.min(200, maxY + pad);

    const cropW = maxX - minX;
    const cropH = maxY - minY;

    const tCanvas = document.createElement('canvas');
    tCanvas.width = cropW;
    tCanvas.height = cropH;
    const tCtx = tCanvas.getContext('2d');
    tCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
    return tCanvas.toDataURL('image/png');
}

// --- Upload Image Handler with Automatic Transparency ---
function handleSignatureFileUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // Make white or near-white background transparent
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const d = imgData.data;
            for (let i = 0; i < d.length; i += 4) {
                const r = d[i], g = d[i+1], b = d[i+2];
                if (r > 230 && g > 230 && b > 230) {
                    d[i+3] = 0; // transparent
                }
            }
            ctx.putImageData(imgData, 0, 0);

            const transparentUrl = canvas.toDataURL('image/png');
            activeSignatureData = transparentUrl;
            document.getElementById('uploadedSigImg').src = transparentUrl;
            document.getElementById('uploadPreviewArea').style.display = 'block';
            saveSignatureToGallery(transparentUrl);
            showToast('Signature image uploaded and cleaned!', 'success');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// --- Confirm & Apply Signature ---
function useCurrentSignature() {
    let sigUrl = null;

    if (activeSignatureData) {
        sigUrl = activeSignatureData;
    } else if (currentSigTab === 'draw') {
        sigUrl = getDesktopTrimmedSignature();
    } else if (currentSigTab === 'type') {
        sigUrl = generateTypedSignatureDataUrl();
    } else if (currentSigTab === 'upload') {
        sigUrl = activeSignatureData;
    } else if (currentSigTab === 'mobile') {
        sigUrl = activeSignatureData;
    }

    if (!sigUrl) {
        showToast('Please create or select a signature first', 'warning');
        return;
    }

    activeSignatureData = sigUrl;
    saveSignatureToGallery(sigUrl);
    closeSignatureModal();

    if (currentPreviewPageId) {
        addAnnotationToPage(currentPreviewPageId, {
            type: 'sig',
            content: sigUrl,
            x: 35,
            y: 45,
            width: 160,
            height: 60
        });
        showToast('Signature placed! Drag or resize to adjust.', 'success');
    } else if (pdfPages.length > 0) {
        openPageInspection(pdfPages[0].id);
        setTimeout(() => {
            addAnnotationToPage(pdfPages[0].id, {
                type: 'sig',
                content: sigUrl,
                x: 35,
                y: 45,
                width: 160,
                height: 60
            });
            showToast('Signature placed! Drag or resize to adjust.', 'success');
        }, 200);
    }
}

function saveSignatureToGallery(dataUrl) {
    if (!dataUrl) return;
    const index = savedSignatures.indexOf(dataUrl);
    if (index > -1) {
        savedSignatures.splice(index, 1);
    }
    savedSignatures.unshift(dataUrl);
    if (savedSignatures.length > 8) savedSignatures.pop();
    
    try {
        localStorage.setItem('pdf_merger_saved_signatures', JSON.stringify(savedSignatures));
    } catch (e) {
        console.warn('Could not save to localStorage:', e);
    }
    renderStoredSignatures();
}

function renderStoredSignatures() {
    const container = document.getElementById('storedSigsList');
    const section = document.getElementById('storedSigsSection');
    if (!container || !section) return;

    if (savedSignatures.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    container.innerHTML = '';
    savedSignatures.forEach((url, i) => {
        const card = document.createElement('div');
        card.className = 'stored-sig-card' + (activeSignatureData === url ? ' selected' : '');
        card.title = 'Click to place this signature';

        const img = document.createElement('img');
        img.src = url;
        img.alt = `Signature ${i + 1}`;

        const delBtn = document.createElement('button');
        delBtn.className = 'delete-saved-btn';
        delBtn.innerHTML = '&times;';
        delBtn.title = 'Remove saved signature';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            removeSavedSignature(i);
        };

        card.appendChild(img);
        card.appendChild(delBtn);

        card.onclick = () => {
            activeSignatureData = url;
            useCurrentSignature();
        };

        container.appendChild(card);
    });
}

function removeSavedSignature(index) {
    savedSignatures.splice(index, 1);
    try {
        localStorage.setItem('pdf_merger_saved_signatures', JSON.stringify(savedSignatures));
    } catch (e) {}
    renderStoredSignatures();
    showToast('Removed saved signature', 'success');
}

function clearSavedSignatures(e) {
    if (e) e.stopPropagation();
    if (confirm('Clear all saved signatures?')) {
        savedSignatures = [];
        activeSignatureData = null;
        try {
            localStorage.removeItem('pdf_merger_saved_signatures');
        } catch (e) {}
        renderStoredSignatures();
        showToast('Saved signatures cleared', 'success');
    }
}

// --- Text & Date Annotations Addition ---
function addAnnotationTextToCurrentPage() {
    if (!currentPreviewPageId) return;
    const defaultText = prompt('Enter text to place on page:', 'Full Name / Note');
    if (defaultText === null) return;

    addAnnotationToPage(currentPreviewPageId, {
        type: 'text',
        content: defaultText.trim() || 'Text',
        x: 35,
        y: 45,
        width: 180,
        height: 38,
        fontSize: 14,
        color: '#0f172a'
    });
    showToast('Text box added! Drag or double-click to edit.', 'success');
}

function addAnnotationDateToCurrentPage() {
    if (!currentPreviewPageId) return;
    const today = new Date();
    // Default format YYYY-MM-DD
    const isoDate = today.toISOString().split('T')[0];
    const customDate = prompt('Enter date (or leave as today):', isoDate);
    if (customDate === null) return;

    addAnnotationToPage(currentPreviewPageId, {
        type: 'date',
        content: customDate.trim() || isoDate,
        x: 35,
        y: 55,
        width: 130,
        height: 34,
        fontSize: 14,
        color: '#0f172a'
    });
    showToast('Date stamp added! Drag to position.', 'success');
}

// --- Interactive Annotation Overlay Manager ---
function addAnnotationToPage(pageId, annotObj) {
    if (!pageAnnotations[pageId]) {
        pageAnnotations[pageId] = [];
    }
    const id = 'ann_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    
    // Store coordinates as normalized percentages (0 - 100) so they are resolution and zoom independent
    const overlay = document.getElementById('annotationOverlay');
    const overlayW = (overlay && overlay.clientWidth) || modalPageDimensions.renderedWidth || 600;
    const overlayH = (overlay && overlay.clientHeight) || modalPageDimensions.renderedHeight || 800;

    const xPercent = (annotObj.x / overlayW) * 100;
    const yPercent = (annotObj.y / overlayH) * 100;
    const wPercent = (annotObj.width / overlayW) * 100;
    const hPercent = (annotObj.height / overlayH) * 100;

    pageAnnotations[pageId].push({
        id: id,
        ...annotObj,
        xPercent: xPercent,
        yPercent: yPercent,
        wPercent: wPercent,
        hPercent: hPercent
    });

    renderOverlayAnnotations();
    renderPagesGrid();
    updatePreviewAnnotationCount();
}

function renderOverlayAnnotations() {
    const overlay = document.getElementById('annotationOverlay');
    if (!overlay || !currentPreviewPageId) return;
    overlay.innerHTML = '';

    const list = pageAnnotations[currentPreviewPageId] || [];
    list.forEach(item => {
        const el = createAnnotationElement(item);
        overlay.appendChild(el);
    });
}

function createAnnotationElement(item) {
    const overlay = document.getElementById('annotationOverlay');
    const overlayW = (overlay && overlay.clientWidth) || modalPageDimensions.renderedWidth || 600;
    const overlayH = (overlay && overlay.clientHeight) || modalPageDimensions.renderedHeight || 800;

    // Convert percentages to current overlay pixels
    const currentLeft = (item.xPercent !== undefined) ? (item.xPercent / 100) * overlayW : item.x;
    const currentTop = (item.yPercent !== undefined) ? (item.yPercent / 100) * overlayH : item.y;
    const currentWidth = (item.wPercent !== undefined) ? (item.wPercent / 100) * overlayW : item.width;
    const currentHeight = (item.hPercent !== undefined) ? (item.hPercent / 100) * overlayH : item.height;

    // Keep item.x/y/width/height in sync with current pixels
    item.x = currentLeft;
    item.y = currentTop;
    item.width = currentWidth;
    item.height = currentHeight;

    const el = document.createElement('div');
    el.className = 'annotation-item';
    el.id = item.id;
    el.style.left = currentLeft + 'px';
    el.style.top = currentTop + 'px';
    el.style.width = currentWidth + 'px';
    el.style.height = currentHeight + 'px';

    if (item.type === 'sig') {
        el.innerHTML = `
            <img src="${item.content}" alt="Signature">
            <button class="handle-del" title="Delete signature" onclick="deleteAnnotation('${item.id}', event)">&times;</button>
            <div class="annotation-handle handle-se" title="Resize"></div>
        `;
    } else {
        // Text or Date
        el.innerHTML = `
            <div class="drag-handle-bar" title="Drag to move">
                <div class="drag-dots"></div>
            </div>
            <div class="annotation-action-bar">
                <button class="bar-btn" onclick="changeFontSize('${item.id}', 2, event)">A+</button>
                <button class="bar-btn" onclick="changeFontSize('${item.id}', -2, event)">A-</button>
                <button class="bar-btn" onclick="toggleAnnotationColor('${item.id}', event)">Color</button>
            </div>
            <div class="annotation-text-content" contenteditable="true" style="font-size: ${item.fontSize || 14}px; color: ${item.color || '#0f172a'};">
                ${item.content}
            </div>
            <button class="handle-del" title="Delete" onclick="deleteAnnotation('${item.id}', event)">&times;</button>
            <div class="annotation-handle handle-se" title="Resize"></div>
        `;

        const textDiv = el.querySelector('.annotation-text-content');
        textDiv.addEventListener('input', () => {
            item.content = textDiv.innerText;
        });
        textDiv.addEventListener('blur', () => {
            item.content = textDiv.innerText;
        });
    }

    // Drag and Drop positioning
    attachDragAndResize(el, item);

    el.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.annotation-item').forEach(i => i.classList.remove('active'));
        el.classList.add('active');
        currentActiveAnnotationId = item.id;
    });

    return el;
}

function deleteAnnotation(id, e) {
    if (e) e.stopPropagation();
    if (!currentPreviewPageId || !pageAnnotations[currentPreviewPageId]) return;
    pageAnnotations[currentPreviewPageId] = pageAnnotations[currentPreviewPageId].filter(a => a.id !== id);
    renderOverlayAnnotations();
    renderPagesGrid();
    updatePreviewAnnotationCount();
}

function changeFontSize(id, delta, e) {
    if (e) e.stopPropagation();
    const item = (pageAnnotations[currentPreviewPageId] || []).find(a => a.id === id);
    if (item) {
        item.fontSize = Math.max(10, Math.min(48, (item.fontSize || 14) + delta));
        renderOverlayAnnotations();
    }
}

function toggleAnnotationColor(id, e) {
    if (e) e.stopPropagation();
    const item = (pageAnnotations[currentPreviewPageId] || []).find(a => a.id === id);
    if (item) {
        const colors = ['#0f172a', '#1e40af', '#047857', '#b91c1c'];
        const nextIdx = (colors.indexOf(item.color || '#0f172a') + 1) % colors.length;
        item.color = colors[nextIdx];
        renderOverlayAnnotations();
    }
}

// Drag & Resize Handlers
function attachDragAndResize(element, item) {
    let startX = 0, startY = 0;
    let initialLeft = 0, initialTop = 0;
    let initialWidth = 0, initialHeight = 0;
    let isDragging = false;
    let isResizing = false;

    const overlay = document.getElementById('annotationOverlay');

    element.addEventListener('pointerdown', (e) => {
        // Do not trigger drag if clicking delete button or action bar
        if (e.target.closest('.handle-del') || e.target.closest('.annotation-action-bar')) {
            return;
        }

        // When clicking directly into editable text, allow cursor placement/typing
        if (e.target.isContentEditable) {
            return;
        }

        if (e.target.classList.contains('handle-se')) {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            initialWidth = item.width;
            initialHeight = item.height;
            element.setPointerCapture(e.pointerId);
            e.stopPropagation();
            return;
        }

        // Dragging initiated from element body, border, or dedicated drag-handle-bar
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = item.x;
        initialTop = item.y;
        element.setPointerCapture(e.pointerId);
        e.stopPropagation();
    });

    element.addEventListener('pointermove', (e) => {
        const overlayRect = overlay.getBoundingClientRect();
        if (isDragging) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            let newX = Math.max(0, Math.min(overlayRect.width - item.width, initialLeft + dx));
            let newY = Math.max(0, Math.min(overlayRect.height - item.height, initialTop + dy));

            item.x = newX;
            item.y = newY;
            item.xPercent = (newX / overlayRect.width) * 100;
            item.yPercent = (newY / overlayRect.height) * 100;

            element.style.left = newX + 'px';
            element.style.top = newY + 'px';
        } else if (isResizing) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            let newW = Math.max(40, initialWidth + dx);
            let newH = Math.max(20, initialHeight + dy);

            item.width = newW;
            item.height = newH;
            item.wPercent = (newW / overlayRect.width) * 100;
            item.hPercent = (newH / overlayRect.height) * 100;

            element.style.width = newW + 'px';
            element.style.height = newH + 'px';
        }
    });

    const stop = (e) => {
        if (isDragging || isResizing) {
            isDragging = false;
            isResizing = false;
            try { element.releasePointerCapture(e.pointerId); } catch (_) {}
        }
    };
    element.addEventListener('pointerup', stop);
    element.addEventListener('pointercancel', stop);
}

// --- PDF-Lib Vector/Bitmap Burning of Annotations ---
async function burnAnnotationsOntoPage(pdfDoc, page, annotations, pageRotation = 0) {
    const { width: pdfWidth, height: pdfHeight } = page.getSize();
    const standardFont = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);

    // Normalize rotation angle to 0, 90, 180, or 270 degrees
    const rot = ((pageRotation % 360) + 360) % 360;

    for (const ann of annotations) {
        // Retrieve normalized percentage coordinates (0.0 to 1.0)
        let normX = 0, normY = 0, normW = 0, normH = 0;
        if (ann.xPercent !== undefined) {
            normX = ann.xPercent / 100;
            normY = ann.yPercent / 100;
            normW = ann.wPercent / 100;
            normH = ann.hPercent / 100;
        } else {
            const previewW = modalPageDimensions.renderedWidth || 600;
            const previewH = modalPageDimensions.renderedHeight || 800;
            normX = ann.x / previewW;
            normY = ann.y / previewH;
            normW = ann.width / previewW;
            normH = ann.height / previewH;
        }

        // Map visual top-left coordinates to PDF coordinates
        // When page is rotated, pdf-lib's draw operations are evaluated in the page's original coordinate system
        let mappedX = 0, mappedY = 0, mappedW = 0, mappedH = 0;
        let drawRotation = 0;

        if (rot === 0) {
            // Unrotated: visual matches original coordinate system
            mappedW = normW * pdfWidth;
            mappedH = normH * pdfHeight;
            mappedX = normX * pdfWidth;
            mappedY = pdfHeight - (normY * pdfHeight) - mappedH;
            drawRotation = 0;
        } else if (rot === 90) {
            // Visual width corresponds to PDF height, visual height to PDF width
            mappedW = normW * pdfHeight;
            mappedH = normH * pdfWidth;
            mappedX = normY * pdfWidth;
            mappedY = normX * pdfHeight;
            drawRotation = -90;
        } else if (rot === 180) {
            mappedW = normW * pdfWidth;
            mappedH = normH * pdfHeight;
            mappedX = pdfWidth - (normX * pdfWidth) - mappedW;
            mappedY = normY * pdfHeight;
            drawRotation = 180;
        } else if (rot === 270) {
            mappedW = normW * pdfHeight;
            mappedH = normH * pdfWidth;
            mappedX = pdfWidth - (normY * pdfWidth) - mappedH;
            mappedY = pdfHeight - (normX * pdfHeight) - mappedW;
            drawRotation = 90;
        }

        if (ann.type === 'sig' && ann.content) {
            try {
                const pngBytes = await fetch(ann.content).then(res => res.arrayBuffer());
                const pngImage = await pdfDoc.embedPng(pngBytes);
                page.drawImage(pngImage, {
                    x: mappedX,
                    y: mappedY,
                    width: mappedW,
                    height: mappedH,
                    rotate: PDFLib.degrees(drawRotation)
                });
            } catch (err) {
                console.error('Error embedding signature PNG into PDF:', err);
            }
        } else if (ann.type === 'text' || ann.type === 'date') {
            try {
                const textStr = ann.content || '';
                // Scale font size proportionally to PDF dimensions
                const scale = pdfHeight / 800;
                const fontSize = Math.max(9, (ann.fontSize || 14) * scale);
                
                // Color conversion
                let rgbColor = PDFLib.rgb(0.06, 0.09, 0.16); // default slate
                if (ann.color === '#1e40af') rgbColor = PDFLib.rgb(0.12, 0.25, 0.69);
                else if (ann.color === '#047857') rgbColor = PDFLib.rgb(0.02, 0.47, 0.34);
                else if (ann.color === '#b91c1c') rgbColor = PDFLib.rgb(0.72, 0.11, 0.11);

                page.drawText(textStr, {
                    x: mappedX,
                    y: mappedY + (mappedH * 0.25),
                    size: fontSize,
                    font: standardFont,
                    color: rgbColor,
                    rotate: PDFLib.degrees(drawRotation)
                });
            } catch (err) {
                console.error('Error drawing text onto PDF page:', err);
            }
        }
    }
}

