const express = require("express")
const { body, validationResult } = require("express-validator")
const { chromium } = require("playwright-chromium")

async function main() {
    let app = express()
    app.use(express.json({ limit: "20mb" }))

    let browser = await chromium.launch()
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
            format: "A4",
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
        body("pageWaitUntil").optional().isIn(["domcontentloaded", "load", "networkidle"]),
        async (request, response) => {
            let errors = validationResult(request)
            if (!errors.isEmpty()) {
                response.status(400).json({ errors: errors.array() })
                return
            }

            let pdfContent = await generatePdf(request.body.content, {
                pageWaitUntil: request.body.pageWaitUntil,
            })

            response.setHeader("Content-Type", "application/pdf")
            response.setHeader("Content-Disposition", "attachment; filename=file.pdf")
            response.setHeader("Content-Length", pdfContent.length)
            response.send(pdfContent)
        },
    )

    app.listen(80, "0.0.0.0", () => {
        console.log(`PDF generator service up`)
    })
}

main()
