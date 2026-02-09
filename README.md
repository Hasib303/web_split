# Web Split

A split-screen browser that lets you view multiple websites and PDFs side by side in one window. Built with vanilla HTML, CSS, and JavaScript with a Node.js proxy server to bypass iframe restrictions.

## Features

- **Dynamic Panes** - Add or remove as many panes as you need
- **Resizable** - Drag to resize panes
- **Layout Toggle** - Switch between horizontal and vertical layouts
- **PDF Viewer** - Load local PDF files in any pane
- **Proxy Server** - Load any website (bypasses X-Frame-Options)
- **Auto-save** - Layout persists across sessions

## Quick Start

```bash
# Clone the repository
git clone https://github.com/Hasib303/web_split.git
cd web_split

# Install dependencies
npm install

# Start the server
npm start

# Open in browser
http://localhost:3000
```

## Usage

| Action | How |
|--------|-----|
| Add pane | Click `+ Add Pane` or press `Ctrl+N` |
| Remove pane | Click `✕` on the pane |
| Resize | Drag the bar between panes |
| Toggle layout | Click `Toggle Layout` |
| Load URL | Type URL and press Enter or click `Go` |
| Load PDF | Click `PDF` and select a file |

## Tech Stack

- Frontend: HTML, CSS, JavaScript (no frameworks)
- Backend: Node.js, Express
- Proxy: Strips `X-Frame-Options` headers to enable iframe embedding
