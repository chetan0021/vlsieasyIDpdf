const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    const { html } = req.body;

    if (!html) {
        return res.status(400).send('Missing HTML content');
    }

    let browser = null;

    try {
        // Launch Puppeteer with Vercel-optimized Chromium
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();

        // High DPI viewport for crisp rendering
        await page.setViewport({
            width: 1200,
            height: 1200,
            deviceScaleFactor: 2
        });

        // Wrapper to ensure styles load correctly in the headless environment
        const fullContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                <style>
                    body { 
                        margin: 0; padding: 0; background: transparent;
                        display: flex; justify-content: center; align-items: center;
                        height: 100vh; width: 100vw; overflow: hidden;
                    }
                    /* Ensure font rendering is consistent */
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                </style>
            </head>
            <body>
                ${html}
            </body>
            </html>
        `;

        await page.setContent(fullContent, {
            waitUntil: 'networkidle0', // Critical: Waits for external fonts/Tailwind to load
            timeout: 10000 
        });

        // PDF Generation Settings
        const pdfBuffer = await page.pdf({
            width: '54mm',
            height: '85.6mm',
            printBackground: true,
            pageRanges: '1',
            margin: { top: '0', right: '0', bottom: '0', left: '0' },
            scale: 0.58 // Scaling factor to fit 350px width into 54mm physical width
        });

        await browser.close();

        // Send PDF back to client
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="VLSI_ID_Card.pdf"');
        res.status(200).send(pdfBuffer);

    } catch (error) {
        console.error('Generation Error:', error);
        if (browser) await browser.close();
        res.status(500).json({ error: 'Failed to generate ID card', details: error.message });
    }
};