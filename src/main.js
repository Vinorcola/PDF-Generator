const express = require("express")
const { body, validationResult } = require("express-validator")
const { chromium } = require("playwright-chromium")

const PRINT_TRIGGERS = ["commit", "domcontentloaded", "load", "networkidle"]
const DEFAULT_PRINT_TRIGGER = "load"
const PAPER_FORMATS = ["Letter", "Legal", "Tabloid", "Ledger", "A0", "A1", "A2", "A3", "A4", "A5", "A6"]
const DEFAULT_PAPER_FORMAT = "A4"
const PAPER_ORIENTATIONS = ["landscape", "portrait"]
const DEFAULT_PAPER_ORIENTATION = "portrait"

async function main() {
    let app = express()
    app.use(express.json({ limit: "20mb" }))

    let browser = await chromium.launch({
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    })
    async function getBrowser() {
        // Check if browser is still running. If not, start a new browser
        if (!browser.isConnected) {
            browser = await chromium.launch()
        }

        return browser
    }

    async function generatePdf(htmlContent, options) {
        // Get a running browser
        let browser = await getBrowser()

        // Create a new browser context
        let context = await browser.newContext({
            javaScriptEnabled: false,
        })

        // Open a new page and load html
        let page = await context.newPage()
        await page.setContent(htmlContent, {
            waitUntil: options.pageWaitUntil,
        })

        // Generates PDF document
        let pdfContent = await page.pdf({
            format: options.format,
            landscape: options.orientation === "landscape",
        })

        // Clean browser context
        try {
            await context.close()
        } catch(error) {}

        return pdfContent
    }

    app.post(
        "/",
        body("content").isString(),
        body("pageWaitUntil").optional().isIn(PRINT_TRIGGERS),
        body("format").optional().isIn(PAPER_FORMATS),
        body("orientation").optional().isIn(PAPER_ORIENTATIONS),
        async (request, response) => {
            let errors = validationResult(request)
            if (!errors.isEmpty()) {
                response.status(400).json({ errors: errors.array() })
                return
            }

            let pdfContent = await generatePdf(request.body.content, {
                pageWaitUntil: request.body.pageWaitUntil ?? DEFAULT_PRINT_TRIGGER,
                format: request.body.format ?? DEFAULT_PAPER_FORMAT,
                orientation: request.body.orientation ?? DEFAULT_PAPER_ORIENTATION,
            })

            response.setHeader("Content-Type", "application/pdf")
            response.setHeader("Content-Disposition", "attachment; filename=file.pdf")
            response.setHeader("Content-Length", pdfContent.length)
            response.send(pdfContent)
        },
    )

    app.get("/health-check", (request, response) => {
        response.send("OK")
    })

    app.listen(80, "0.0.0.0", () => {
        console.log(`PDF generator service up`)
    })
}

main()
