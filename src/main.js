import express from "express"
import { body, validationResult } from "express-validator"
import { chromium } from "playwright-chromium"

const PRINT_TRIGGERS = ["commit", "domcontentloaded", "load", "networkidle"]
const DEFAULT_PRINT_TRIGGER = "load"
const PAPER_FORMATS = ["Letter", "Legal", "Tabloid", "Ledger", "A0", "A1", "A2", "A3", "A4", "A5", "A6"]
const DEFAULT_PAPER_FORMAT = "A4"
const PAPER_ORIENTATIONS = ["landscape", "portrait"]
const DEFAULT_PAPER_ORIENTATION = "portrait"

const BROWSER_OPTIONS = {
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    headless: true,
}
const LISTENING_PORT = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 8080

async function main() {
    const app = express()
    app.use(express.json({ limit: "20mb" }))

    let browser = await chromium.launch(BROWSER_OPTIONS)
    async function getBrowser() {
        // Check if browser is still running. If not, start a new browser
        if (!browser.isConnected) {
            // Free previous browser
            browser.close().catch(() => { })

            // Start new one
            browser = await chromium.launch(BROWSER_OPTIONS)
        }

        return browser
    }

    async function generatePdf(htmlContent, options) {
        // Get a running browser
        const browser = await getBrowser()

        // Create a new browser context
        const context = await browser.newContext({
            javaScriptEnabled: false,
        })

        try {
            // Open a new page and load html
            const page = await context.newPage()
            await page.setContent(htmlContent, {
                waitUntil: options.pageWaitUntil,
            })

            // Generates PDF document
            return await page.pdf({
                format: options.format,
                landscape: options.orientation === "landscape",
            })
        }
        finally {
            // Clean browser context
            context.close().catch(() => { })
        }
    }

    app.post(
        "/",
        body("content").isString(),
        body("pageWaitUntil").optional().isIn(PRINT_TRIGGERS),
        body("format").optional().isIn(PAPER_FORMATS),
        body("orientation").optional().isIn(PAPER_ORIENTATIONS),
        async (request, response) => {
            const errors = validationResult(request)
            if (!errors.isEmpty()) {
                response.status(400).json({ errors: errors.array() })
                return
            }

            const pdfContent = await generatePdf(request.body.content, {
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
        response.json({ ok: true })
    })

    app.use((request, response) => {
        response.status(404).json({
            ok: false,
            error: "Not found",
        })
    })

    app.use((error, request, response, next) => {
        response.status(error.status ?? 500).json({
            ok: false,
            error: error.message ?? "Unknown error.",
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
        })
    })

    app.listen(LISTENING_PORT, "0.0.0.0", () => {
        console.log(`PDF generator service up`)
    })
}

main()
