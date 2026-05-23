/**
 * converters.js — all file-to-markdown conversion logic.
 *
 * PDF.js is loaded via <script> in index.html (window.pdfjsLib).
 * mammoth is aliased to its browser build in vite.config.js.
 * All other libs are standard npm ESM imports.
 */
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import TurndownService from 'turndown'
import JSZip from 'jszip'

/* ── Constants ──────────────────────────────────────────── */

export const CODE_LANG_MAP = {
  js: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript', tsx: 'tsx', jsx: 'jsx',
  py: 'python', pyw: 'python',
  java: 'java', kt: 'kotlin', kts: 'kotlin',
  cpp: 'cpp', cxx: 'cpp', cc: 'cpp', c: 'c', h: 'c', hpp: 'cpp',
  go: 'go', rs: 'rust', rb: 'ruby', php: 'php',
  swift: 'swift', cs: 'csharp', fs: 'fsharp',
  html: 'html', htm: 'html',
  css: 'css', scss: 'scss', sass: 'sass', less: 'less',
  json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'toml', ini: 'ini',
  xml: 'xml', sh: 'bash', bash: 'bash', zsh: 'bash', fish: 'bash',
  sql: 'sql', r: 'r', lua: 'lua', dart: 'dart', scala: 'scala',
  vue: 'vue', svelte: 'svelte', astro: 'astro',
  dockerfile: 'dockerfile', makefile: 'makefile',
}

export const IMAGE_EXTS = [
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif', 'tiff',
]

/* ── PDF.js (via window global) ─────────────────────────── */

function getPdfjs() {
  const lib = window.pdfjsLib
  if (!lib) {
    throw new Error(
      'PDF.js failed to load. Make sure you have an internet connection and reload the page.'
    )
  }
  // Set worker URL once (same version as the CDN script in index.html)
  if (!lib.GlobalWorkerOptions.workerSrc) {
    lib.GlobalWorkerOptions.workerSrc =
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
  }
  return lib
}

/* ── Turndown factory ───────────────────────────────────── */

function makeTurndown() {
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '_',
    strongDelimiter: '**',
  })

  // Table support
  td.addRule('tableCell', {
    filter: ['th', 'td'],
    replacement: (content) => ` ${content.replace(/\|/g, '\\|').trim()} |`,
  })
  td.addRule('tableRow', {
    filter: 'tr',
    replacement: (content, node) => {
      const isHeader = node.parentNode.nodeName === 'THEAD'
      const sep = isHeader
        ? '|' + Array.from(node.cells).map(() => ' --- |').join('') + '\n'
        : ''
      return '|' + content + '\n' + sep
    },
  })
  td.addRule('table', {
    filter: 'table',
    replacement: (content) => '\n\n' + content + '\n\n',
  })

  return td
}

/* ── Converters ─────────────────────────────────────────── */

export async function convertPDF(arrayBuffer, onProgress) {
  const pdfjsLib = getPdfjs()
  const data = new Uint8Array(arrayBuffer)
  const pdf = await pdfjsLib.getDocument({ data }).promise
  const totalPages = pdf.numPages
  let output = '# Document\n\n'

  for (let i = 1; i <= totalPages; i++) {
    onProgress(Math.round((i / totalPages) * 95), `Processing page ${i} of ${totalPages}…`)

    const page = await pdf.getPage(i)
    const content = await page.getTextContent()

    output += `## Page ${i}\n\n`

    // Reconstruct text with line breaks based on Y position changes
    let pageText = ''
    let lastY = null
    for (const item of content.items) {
      const y = item.transform?.[5] ?? null
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 8) {
        pageText += '\n'
      }
      pageText += item.str
      if (item.hasEOL) pageText += '\n'
      lastY = y
    }

    // Post-process: detect ALL-CAPS short lines as headings, dedupe blank lines
    const lines = pageText.split('\n').map(l => l.trim())
    const processed = []
    let prevWasEmpty = false

    for (const line of lines) {
      if (!line) {
        if (!prevWasEmpty) processed.push('')
        prevWasEmpty = true
        continue
      }
      prevWasEmpty = false

      const isHeading =
        line.length > 1 &&
        line.length < 80 &&
        line === line.toUpperCase() &&
        /[A-Z]/.test(line)

      processed.push(
        isHeading
          ? `### ${line.charAt(0) + line.slice(1).toLowerCase()}`
          : line
      )
    }

    output += processed.join('\n').trim() + '\n\n'
  }

  return output
}

export async function convertDOCX(arrayBuffer, onProgress) {
  onProgress(10, 'Reading Word document…')

  if (typeof mammoth?.convertToHtml !== 'function') {
    throw new Error('mammoth failed to load. Try reloading the page.')
  }

  const result = await mammoth.convertToHtml({ arrayBuffer })
  onProgress(55, 'Converting HTML → Markdown…')

  const markdown = makeTurndown().turndown(result.value)
  onProgress(95, 'Finalizing…')

  return markdown
}

export async function convertXLSX(arrayBuffer, onProgress) {
  onProgress(15, 'Reading spreadsheet…')

  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const sheetNames = workbook.SheetNames
  let output = ''

  sheetNames.forEach((name, idx) => {
    onProgress(
      15 + Math.round(((idx + 1) / sheetNames.length) * 80),
      `Processing sheet: ${name}…`
    )

    if (idx > 0) output += '\n\n---\n\n'
    output += `## Sheet: ${name}\n\n`

    const sheet = workbook.Sheets[name]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

    if (!rows.length) {
      output += '_Empty sheet_\n'
      return
    }

    const colCount = Math.max(...rows.map(r => r.length))
    const pad = row => {
      const r = [...row]
      while (r.length < colCount) r.push('')
      return r
    }

    const headers = pad(rows[0]).map(String)
    output += `| ${headers.join(' | ')} |\n`
    output += `| ${headers.map(() => '---').join(' | ')} |\n`

    for (let i = 1; i < rows.length; i++) {
      const cells = pad(rows[i]).map(c => String(c).replace(/\|/g, '\\|'))
      output += `| ${cells.join(' | ')} |\n`
    }
  })

  return output
}

export async function convertCSV(file, onProgress) {
  onProgress(20, 'Parsing CSV…')
  const text = await file.text()

  const parseRow = (row) => {
    const cells = []
    let inQuotes = false
    let current = ''
    for (const ch of row) {
      if (ch === '"') { inQuotes = !inQuotes }
      else if (ch === ',' && !inQuotes) { cells.push(current.trim()); current = '' }
      else { current += ch }
    }
    cells.push(current.trim())
    return cells
  }

  const rows = text.split('\n').filter(r => r.trim())
  if (!rows.length) return '_Empty CSV_'

  onProgress(60, 'Building Markdown table…')

  const headers = parseRow(rows[0])
  let output = `| ${headers.join(' | ')} |\n`
  output += `| ${headers.map(() => '---').join(' | ')} |\n`

  for (let i = 1; i < rows.length; i++) {
    const cells = parseRow(rows[i]).map(c => c.replace(/\|/g, '\\|'))
    output += `| ${cells.join(' | ')} |\n`
  }

  return output
}

export async function convertPPTX(arrayBuffer, onProgress) {
  onProgress(10, 'Opening PPTX archive…')

  const zip = await JSZip.loadAsync(arrayBuffer)

  const slideKeys = Object.keys(zip.files)
    .filter(k => /^ppt\/slides\/slide\d+\.xml$/i.test(k))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)[0], 10)
      const nb = parseInt(b.match(/\d+/)[0], 10)
      return na - nb
    })

  if (!slideKeys.length) {
    throw new Error('No slides found in this PPTX file.')
  }

  let output = '# Presentation\n\n'

  for (let i = 0; i < slideKeys.length; i++) {
    onProgress(
      10 + Math.round(((i + 1) / slideKeys.length) * 85),
      `Processing slide ${i + 1} of ${slideKeys.length}…`
    )

    const xml = await zip.files[slideKeys[i]].async('text')
    const textMatches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || []
    const texts = textMatches
      .map(m => m.replace(/<[^>]*>/g, '').trim())
      .filter(Boolean)

    if (!texts.length) continue

    const title = texts[0]
    output += `## Slide ${i + 1}: ${title}\n\n`

    for (let j = 1; j < texts.length; j++) {
      if (texts[j] !== title) output += `- ${texts[j]}\n`
    }
    output += '\n'
  }

  return output
}

export async function convertHTML(file, onProgress) {
  onProgress(20, 'Reading HTML…')
  const text = await file.text()
  onProgress(55, 'Converting to Markdown…')
  return makeTurndown().turndown(text)
}

export async function convertRTF(file, onProgress) {
  onProgress(20, 'Parsing RTF…')
  const text = await file.text()

  const clean = text
    .replace(/\{\\rtf[^}]*\}/g, '')
    .replace(/\\[a-z]+\-?\d*[ ]?/gi, ' ')
    .replace(/\{|\}/g, '')
    .replace(/\\\*/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return `# Document\n\n${clean}`
}

export async function convertCode(file, ext, onProgress) {
  onProgress(30, 'Reading source file…')
  const text = await file.text()
  const lang = CODE_LANG_MAP[ext] || ext
  return `# ${file.name}\n\n\`\`\`${lang}\n${text}\n\`\`\``
}

export function convertImage(file) {
  const name = file.name.replace(/\.[^.]+$/, '')
  const ext = file.name.split('.').pop().toLowerCase()
  return [
    `# ${file.name}`,
    '',
    `![${name}](${file.name})`,
    '',
    '> **Note:** Image files cannot have text extracted without OCR.',
    '',
    `**File:** \`${file.name}\`  `,
    `**Type:** ${(file.type || ext).toUpperCase()}  `,
    `**Size:** ${formatSize(file.size)}`,
  ].join('\n')
}

/* ── Utilities ──────────────────────────────────────────── */

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export function getExt(file) {
  return file.name.split('.').pop().toLowerCase()
}

/* ── Main dispatcher ────────────────────────────────────── */

export async function dispatchConversion(file, onProgress) {
  const ext = getExt(file)

  const getArrayBuffer = () => file.arrayBuffer()

  switch (ext) {
    case 'pdf':
      return convertPDF(await getArrayBuffer(), onProgress)

    case 'docx':
    case 'doc':
      return convertDOCX(await getArrayBuffer(), onProgress)

    case 'xlsx':
    case 'xls':
      return convertXLSX(await getArrayBuffer(), onProgress)

    case 'csv':
      return convertCSV(file, onProgress)

    case 'pptx':
      return convertPPTX(await getArrayBuffer(), onProgress)

    case 'html':
    case 'htm':
      return convertHTML(file, onProgress)

    case 'rtf':
      return convertRTF(file, onProgress)

    case 'md':
    case 'mdx':
    case 'txt': {
      onProgress(50, 'Reading file…')
      return file.text()
    }

    default:
      if (IMAGE_EXTS.includes(ext)) {
        onProgress(100, 'Done')
        return convertImage(file)
      }
      if (CODE_LANG_MAP[ext]) {
        return convertCode(file, ext, onProgress)
      }
      throw new Error(
        `Unsupported format: .${ext}\n\nSupported: PDF, DOCX, XLSX, CSV, PPTX, HTML, TXT, MD, RTF, images, and source code files.`
      )
  }
}
