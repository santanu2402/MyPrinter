// Canon G3770 Printer Configuration
// The printer is connected via WiFi (192.168.0.111) to the same network as this laptop

const printerConfig = {
  name: 'Canon G3770',
  ip: process.env.PRINTER_IP || '192.168.0.111',
  port: 631,
  protocol: 'ipp',
  
  // IPP URI format for Canon printers
  getUri(ip) {
    return `ipp://${ip || this.ip}:${this.port}/ipp/print`;
  },

  // macOS lp command printer name (configured in CUPS)
  lpName: process.env.PRINTER_LP_NAME || 'Canon_G3770',

  // Default print settings
  defaults: {
    mediaSize: 'A4',
    quality: 'normal', // draft, normal, high
    colorMode: 'color', // color, grayscale
    copies: 1,
    orientation: 'portrait',
  },

  // Ink optimization levels
  inkOptimization: {
    low: { saturationReduce: 0.12, contrastBoost: 0.05, brightnessBoost: 0.05 },
    medium: { saturationReduce: 0.28, contrastBoost: 0.10, brightnessBoost: 0.10 },
    high: { saturationReduce: 0.45, contrastBoost: 0.15, brightnessBoost: 0.15 },
  },
};

module.exports = printerConfig;
