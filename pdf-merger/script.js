// Set worker path for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Global State
let uploadedFiles = []; // [{ id, name, size, type, pageCount }]
let pdfPages = [];      // [{ id, fileId, fileName, pageNumber, pageIndex, arrayBuffer, rotation, isImage, imageDataUrl }]
let sortableInstance = null;
let currentPreviewPageId = null;

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
    initEventListeners();
    initSortable();
});

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

    card.innerHTML = `
        <button class="delete-btn" onclick="deletePage('${pageObj.id}', event)" title="Delete page">&times;</button>
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

    document.getElementById('previewTitle').textContent = `Page Inspection`;
    document.getElementById('previewBadge').textContent = `Page ${pdfPages.indexOf(pageObj) + 1}`;
    document.getElementById('previewSource').textContent = pageObj.fileName;
    document.getElementById('previewPageNumber').textContent = pageObj.pageNumber;
    document.getElementById('previewRotationText').textContent = `${pageObj.rotation}°`;

    const canvas = document.getElementById('modalPreviewCanvas');
    const img = document.getElementById('modalPreviewImage');

    if (pageObj.isImage && pageObj.imageDataUrl) {
        canvas.style.display = 'none';
        img.style.display = 'block';
        img.src = pageObj.imageDataUrl;
        img.style.transform = `rotate(${pageObj.rotation}deg)`;
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
        } catch (err) {
            console.error('Modal render error:', err);
        }
        hideLoading();
    }

    previewModal.style.display = 'flex';
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
