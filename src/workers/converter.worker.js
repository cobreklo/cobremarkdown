/**
 * converter.worker.js — Web Worker for heavy file conversions.
 *
 * Runs PDF, DOCX, XLSX, and PPTX conversions off the main thread so the UI
 * stays responsive while large files are being processed.
 *
 * Protocol (postMessage):
 *   IN:  { format: string, buffer: ArrayBuffer, fileName: string }
 *   OUT: { type: 'progress', pct: number, msg: string }
 *       | { type: 'done',     result: string }
 *       | { type: 'error',    message: string }
 */
import { convertPDF, convertDOCX, convertXLSX, convertPPTX } from '../converters.js'

self.onmessage = async ({ data }) => {
  const { format, buffer, fileName } = data

  const onProgress = (pct, msg) => {
    self.postMessage({ type: 'progress', pct, msg })
  }

  try {
    let result

    switch (format) {
      case 'pdf':
        result = await convertPDF(buffer, onProgress)
        break
      case 'docx':
      case 'doc':
        result = await convertDOCX(buffer, onProgress)
        break
      case 'xlsx':
      case 'xls':
        result = await convertXLSX(buffer, onProgress)
        break
      case 'pptx':
        result = await convertPPTX(buffer, onProgress)
        break
      default:
        throw new Error(`Formato no soportado en worker: ${format}`)
    }

    self.postMessage({ type: 'done', result })
  } catch (err) {
    self.postMessage({ type: 'error', message: err.message ?? String(err) })
  }
}
