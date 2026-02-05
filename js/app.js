// ============================================
// DYNAMIC SPLIT BROWSER - Main Application
// ============================================

class SplitBrowser {
    constructor() {
        this.panes = [];
        this.paneIdCounter = 0;
        this.isHorizontal = true;
        this.isResizing = false;
        this.activeResizeHandle = null;
        this.startPos = 0;
        this.startSizes = [];

        this.container = document.getElementById('panes-container');
        this.init();
    }

    init() {
        // Add initial panes
        this.addPane('https://en.wikipedia.org');
        this.addPane('https://www.openstreetmap.org/export/embed');

        // Setup event listeners
        this.setupGlobalEvents();

        // Load saved state
        this.loadState();

        // Update UI
        this.updateToolbarInfo();
    }

    // ========== PANE MANAGEMENT ==========

    addPane(defaultUrl = '') {
        const paneId = ++this.paneIdCounter;

        const pane = {
            id: paneId,
            url: defaultUrl,
            size: 1 // flex ratio
        };

        this.panes.push(pane);
        this.render();
        this.saveState();
        this.updateToolbarInfo();

        return paneId;
    }

    removePane(paneId) {
        if (this.panes.length <= 1) {
            alert('Cannot remove the last pane!');
            return;
        }

        const index = this.panes.findIndex(p => p.id === paneId);
        if (index !== -1) {
            this.panes.splice(index, 1);
            this.render();
            this.saveState();
            this.updateToolbarInfo();
        }
    }

    // ========== RENDERING ==========

    render() {
        this.container.innerHTML = '';

        this.panes.forEach((pane, index) => {
            // Add pane
            const paneEl = this.createPaneElement(pane);
            this.container.appendChild(paneEl);

            // Add resize handle between panes (not after the last one)
            if (index < this.panes.length - 1) {
                const handle = this.createResizeHandle(index);
                this.container.appendChild(handle);
            }
        });

        this.updatePaneSizes();
    }

    createPaneElement(pane) {
        const div = document.createElement('div');
        div.className = 'pane';
        div.dataset.paneId = pane.id;

        div.innerHTML = `
            <div class="address-bar">
                <input type="text"
                       class="url-input"
                       value="${pane.url}"
                       placeholder="Enter URL..."
                       onkeypress="if(event.key==='Enter') app.loadURL(${pane.id})">
                <button class="btn-go" onclick="app.loadURL(${pane.id})">Go</button>
                <label class="file-input-wrapper">
                    <span class="file-btn">PDF</span>
                    <input type="file"
                           accept="application/pdf"
                           onchange="app.loadPDF(${pane.id}, this)">
                </label>
                <button class="btn-close" onclick="event.stopPropagation(); app.removePane(${pane.id})">✕</button>
            </div>
            <iframe src="${pane.url}"></iframe>
        `;

        return div;
    }

    createResizeHandle(index) {
        const handle = document.createElement('div');
        handle.className = 'resize-handle';
        handle.dataset.index = index;

        handle.addEventListener('mousedown', (e) => this.startResize(e, index));
        handle.addEventListener('touchstart', (e) => this.startResize(e, index), { passive: false });

        return handle;
    }

    updatePaneSizes() {
        const paneElements = this.container.querySelectorAll('.pane');
        const totalSize = this.panes.reduce((sum, p) => sum + p.size, 0);

        paneElements.forEach((el, index) => {
            const pane = this.panes[index];
            if (pane) {
                const percentage = (pane.size / totalSize) * 100;
                if (this.isHorizontal) {
                    el.style.width = `${percentage}%`;
                    el.style.height = '100%';
                } else {
                    el.style.height = `${percentage}%`;
                    el.style.width = '100%';
                }
            }
        });
    }

    // ========== URL & PDF LOADING ==========

    loadURL(paneId) {
        const paneEl = this.container.querySelector(`[data-pane-id="${paneId}"]`);
        if (!paneEl) return;

        const input = paneEl.querySelector('.url-input');
        const iframe = paneEl.querySelector('iframe');

        let url = input.value.trim();
        if (!url) return;

        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        iframe.src = url;

        // Update pane data
        const pane = this.panes.find(p => p.id === paneId);
        if (pane) pane.url = url;

        this.saveState();
    }

    loadPDF(paneId, fileInput) {
        if (!fileInput.files || !fileInput.files[0]) return;

        const paneEl = this.container.querySelector(`[data-pane-id="${paneId}"]`);
        if (!paneEl) return;

        const file = fileInput.files[0];
        const iframe = paneEl.querySelector('iframe');
        const input = paneEl.querySelector('.url-input');

        const objUrl = URL.createObjectURL(file);
        iframe.src = objUrl;
        input.value = `[PDF] ${file.name}`;

        // Update pane data
        const pane = this.panes.find(p => p.id === paneId);
        if (pane) pane.url = '';
    }

    // ========== RESIZE FUNCTIONALITY ==========

    startResize(e, index) {
        e.preventDefault();
        this.isResizing = true;
        this.activeResizeIndex = index;

        const clientPos = e.type.includes('touch') ? e.touches[0] : e;
        this.startPos = this.isHorizontal ? clientPos.clientX : clientPos.clientY;

        // Store current sizes
        this.startSizes = this.panes.map(p => p.size);

        // Add active class to handle
        const handles = this.container.querySelectorAll('.resize-handle');
        if (handles[index]) handles[index].classList.add('active');

        document.body.classList.add('resizing');
    }

    doResize(e) {
        if (!this.isResizing) return;

        const clientPos = e.type.includes('touch') ? e.touches[0] : e;
        const currentPos = this.isHorizontal ? clientPos.clientX : clientPos.clientY;
        const delta = currentPos - this.startPos;

        const containerSize = this.isHorizontal
            ? this.container.offsetWidth
            : this.container.offsetHeight;

        // Calculate delta as a ratio
        const deltaRatio = (delta / containerSize) * this.panes.length;

        const index = this.activeResizeIndex;
        const leftPane = this.panes[index];
        const rightPane = this.panes[index + 1];

        if (leftPane && rightPane) {
            const newLeftSize = Math.max(0.1, this.startSizes[index] + deltaRatio);
            const newRightSize = Math.max(0.1, this.startSizes[index + 1] - deltaRatio);

            leftPane.size = newLeftSize;
            rightPane.size = newRightSize;

            this.updatePaneSizes();
        }
    }

    endResize() {
        if (!this.isResizing) return;

        this.isResizing = false;
        document.body.classList.remove('resizing');

        // Remove active class from handles
        this.container.querySelectorAll('.resize-handle').forEach(h => {
            h.classList.remove('active');
        });

        this.saveState();
    }

    // ========== LAYOUT TOGGLE ==========

    toggleLayout() {
        this.isHorizontal = !this.isHorizontal;

        this.container.classList.remove('horizontal', 'vertical');
        this.container.classList.add(this.isHorizontal ? 'horizontal' : 'vertical');

        this.updatePaneSizes();
        this.updateToolbarInfo();
        this.saveState();
    }

    // ========== GLOBAL EVENTS ==========

    setupGlobalEvents() {
        // Mouse events for resize
        document.addEventListener('mousemove', (e) => this.doResize(e));
        document.addEventListener('mouseup', () => this.endResize());

        // Touch events for resize
        document.addEventListener('touchmove', (e) => this.doResize(e), { passive: false });
        document.addEventListener('touchend', () => this.endResize());

        // Keyboard shortcut: Ctrl/Cmd + N for new pane
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.addPane();
            }
        });
    }

    // ========== STATE PERSISTENCE ==========

    saveState() {
        const state = {
            panes: this.panes.map(p => ({
                id: p.id,
                url: p.url,
                size: p.size
            })),
            isHorizontal: this.isHorizontal,
            paneIdCounter: this.paneIdCounter
        };

        localStorage.setItem('splitBrowserState', JSON.stringify(state));
    }

    loadState() {
        try {
            const saved = localStorage.getItem('splitBrowserState');
            if (saved) {
                const state = JSON.parse(saved);

                // Only load if we have valid panes
                if (state.panes && state.panes.length > 0) {
                    this.panes = state.panes;
                    this.isHorizontal = state.isHorizontal !== false;
                    this.paneIdCounter = state.paneIdCounter || this.panes.length;

                    this.container.classList.remove('horizontal', 'vertical');
                    this.container.classList.add(this.isHorizontal ? 'horizontal' : 'vertical');

                    this.render();
                }
            }
        } catch (e) {
            console.warn('Failed to load saved state:', e);
        }
    }

    // ========== UI HELPERS ==========

    updateToolbarInfo() {
        const info = document.getElementById('toolbar-info');
        if (info) {
            const layout = this.isHorizontal ? 'Horizontal' : 'Vertical';
            info.textContent = `${this.panes.length} pane(s) | ${layout} layout`;
        }
    }
}

// ============================================
// INITIALIZATION
// ============================================

let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new SplitBrowser();
});
