# 🖨️ MyPrinter — Smart Print Studio

**MyPrinter** is an intelligent document processing and print optimization application designed for **Canon PIXMA G3770** (and standard network printers over Wi-Fi / CUPS / IPP). It minimizes ink consumption, guarantees perfect A4 page fit, and provides seamless manual duplex (two-sided) printing workflows.

---

## 🌟 Features & Systems

### 📸 1. System A — ImgToDoc (Image to Document)
- Search, download, and arrange images on A4 pages.
- Smart auto-fit grid layouts with subtle framing and captions.
- Ink-optimized color and B/W rendering to conserve tank ink.

### 📝 2. System B — TxtToDoc (Text to Document)
- Text cleanup, structure analysis, and typographic enhancement.
- Formats text for optimal A4 reading with minimal page waste.
- **Both-Side (Duplex) Printing Support**:
  - Automatically splits into Odd (front) and Even (back) page batches.
  - 2-phase guided printing flow with paper reload confirmation.
  - Supports Long-Edge (Book) and Short-Edge (Notepad/Calendar) flipping.

### 📄 3. System C — DuplexPrint (Two-Sided Printing Studio)
- Manual two-sided printing engine specifically calibrated for the Canon PIXMA G3770 rear-tray feed.
- Automatic 180° rotation on even pages for long-edge/short-edge alignment.
- Calibrated 2-page and 4-page test documents to verify waste-free duplex alignment.

### 🖨️ 4. System D — DocPrinter (Document Optimization & Print)
- Upload any PDF document for instant structural analysis.
- **Guaranteed A4 Auto-Fit**: Rescales and centers non-A4 pages (Letter, Legal, A3, square) to fit A4 paper with safe margins.
- Ink coverage estimation and draft/normal/high quality optimization.
- Hardware-level `PageSize=A4` and `fit-to-page` CUPS integration.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- macOS with CUPS (`lp` command) configured for your network printer

### Installation
```bash
# Clone the repository
git clone https://github.com/santanu2402/MyPrinter.git
cd MyPrinter

# Install dependencies
npm install

# Start the server
npm start
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## ⚙️ Configuration

Printer settings can be configured in `config/printer.js` or via environment variables:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Web server port | `3000` |
| `PRINTER_IP` | Canon printer Wi-Fi IP | `192.168.0.111` |
| `PRINTER_LP_NAME` | CUPS printer name | `Canon_G3770` |

---

## 🛠️ Tech Stack
- **Backend**: Node.js, Express, Multer, CUPS / IPP, child_process
- **PDF Engine**: pdf-lib, pdfkit, pdf-parse
- **Image Processing**: sharp, cheerio, axios
- **Frontend**: Vanilla JavaScript (ES6+), Modern Responsive CSS, HTML5

---

## 📄 License
MIT License.
