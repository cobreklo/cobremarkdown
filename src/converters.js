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

/* ── Redundancy detection ───────────────────────────────── */

/**
 * Finds text lines that repeat suspiciously often (watermarks, boilerplate).
 * Returns [{text, count}] sorted by frequency descending.
 */
export function detectRedundancies(text) {
  if (!text) return []
  const lines = text.split('\n')
  const counts = new Map()

  for (const raw of lines) {
    const norm = raw.trim()
    if (norm.length < 8) continue            // too short to be meaningful
    if (/^#{1,6}\s/.test(norm)) continue     // heading
    if (/^[-*_]{3,}$/.test(norm)) continue  // horizontal rule
    if (/^\|[-:\s|]+\|$/.test(norm)) continue // table separator
    counts.set(norm, (counts.get(norm) || 0) + 1)
  }

  return Array.from(counts.entries())
    .filter(([, c]) => c > 2)
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
}

/**
 * Removes the given patterns from text and collapses leftover blank lines.
 */
export function cleanRedundancies(text, patterns) {
  if (!text || !patterns.length) return text
  const removeSet = new Set(patterns)
  const lines = text.split('\n')
  const filtered = lines.filter(l => !removeSet.has(l.trim()))

  const out = []
  let prevBlank = false
  for (const l of filtered) {
    const blank = !l.trim()
    if (blank && prevBlank) continue
    out.push(l)
    prevBlank = blank
  }
  return out.join('\n')
}

/* ── PDF.js (via window global) ─────────────────────────── */

function getPdfjs() {
  const lib = window.pdfjsLib
  if (!lib) {
    throw new Error(
      'PDF.js no cargó. Verifica tu conexión y recarga la página.'
    )
  }
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
  // Only add a title header for multi-page documents
  let output = totalPages > 1 ? '# Documento\n\n' : ''

  for (let i = 1; i <= totalPages; i++) {
    onProgress(Math.round((i / totalPages) * 95), `Procesando página ${i} de ${totalPages}…`)

    const page = await pdf.getPage(i)
    const content = await page.getTextContent()

    // Compact page divider instead of a heading per page
    if (i > 1) output += '\n---\n\n'

    let pageText = ''
    let lastY = null
    for (const item of content.items) {
      const y = item.transform?.[5] ?? null
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 8) pageText += '\n'
      pageText += item.str
      if (item.hasEOL) pageText += '\n'
      lastY = y
    }

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

      // Heading: ALL-CAPS standalone line, reasonable length, no numbers/symbols only
      const isHeading =
        line.length > 3 &&
        line.length < 60 &&
        line === line.toUpperCase() &&
        /[A-Z]/.test(line)

      processed.push(isHeading
        ? `### ${line.charAt(0) + line.slice(1).toLowerCase()}`
        : line
      )
    }

    output += processed.join('\n').trim() + '\n\n'
  }

  return output.trim()
}

export async function convertDOCX(arrayBuffer, onProgress) {
  onProgress(10, 'Leyendo documento Word…')

  if (typeof mammoth?.convertToHtml !== 'function') {
    throw new Error('mammoth no cargó. Intenta recargar la página.')
  }

  const result = await mammoth.convertToHtml({ arrayBuffer })
  onProgress(55, 'Convirtiendo HTML → Markdown…')

  const markdown = makeTurndown().turndown(result.value)
  onProgress(95, 'Finalizando…')

  return markdown
}

export async function convertXLSX(arrayBuffer, onProgress) {
  onProgress(15, 'Leyendo hoja de cálculo…')

  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const sheetNames = workbook.SheetNames
  let output = ''

  sheetNames.forEach((name, idx) => {
    onProgress(
      15 + Math.round(((idx + 1) / sheetNames.length) * 80),
      `Procesando hoja: ${name}…`
    )

    if (idx > 0) output += '\n\n---\n\n'
    output += `## Hoja: ${name}\n\n`

    const sheet = workbook.Sheets[name]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

    if (!rows.length) {
      output += '_Hoja vacía_\n'
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
  onProgress(20, 'Analizando CSV…')
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
  if (!rows.length) return '_CSV vacío_'

  onProgress(60, 'Construyendo tabla Markdown…')

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
  onProgress(10, 'Abriendo archivo PPTX…')

  const zip = await JSZip.loadAsync(arrayBuffer)

  const slideKeys = Object.keys(zip.files)
    .filter(k => /^ppt\/slides\/slide\d+\.xml$/i.test(k))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)[0], 10)
      const nb = parseInt(b.match(/\d+/)[0], 10)
      return na - nb
    })

  if (!slideKeys.length) throw new Error('No se encontraron diapositivas en este archivo PPTX.')

  // Placeholder types to skip (footers, slide numbers, dates)
  const SKIP_PH = /type="(sldNum|dt|ftr|hf|sldImg)"/
  // Title placeholder types
  const TITLE_PH = /type="(title|ctrTitle)"/
  // PowerPoint template boilerplate text to discard
  const TEMPLATE_TEXT = /^(click\s+to|tap\s+to|haga\s+clic|añade?\s|add\s+(title|text|subtitle|content)|title\s*\d*|text\s*\d*|content\s*\d*)$/i

  let output = '# Presentación\n\n'

  for (let i = 0; i < slideKeys.length; i++) {
    onProgress(
      10 + Math.round(((i + 1) / slideKeys.length) * 85),
      `Procesando diapositiva ${i + 1} de ${slideKeys.length}…`
    )

    const xml = await zip.files[slideKeys[i]].async('text')
    // Extract each shape block
    const spBlocks = xml.match(/<p:sp[\s\S]*?<\/p:sp>/g) || []

    const titleTexts = []
    const bodyTexts = []

    for (const block of spBlocks) {
      if (SKIP_PH.test(block)) continue

      const isTitle = TITLE_PH.test(block)

      const texts = (block.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [])
        .map(m => m.replace(/<[^>]*>/g, '').trim())
        .filter(s => s.length > 0 && !TEMPLATE_TEXT.test(s))

      if (!texts.length) continue

      if (isTitle) titleTexts.push(...texts)
      else bodyTexts.push(...texts)
    }

    if (!titleTexts.length && !bodyTexts.length) continue

    const titleStr = titleTexts.join(' ').trim() || `Diapositiva ${i + 1}`
    output += `## ${titleStr}\n\n`

    // Deduplicate body against title and against itself
    const titleSet = new Set(titleTexts.map(t => t.toLowerCase()))
    const seen = new Set()
    for (const text of bodyTexts) {
      const lower = text.toLowerCase()
      if (titleSet.has(lower) || seen.has(lower)) continue
      seen.add(lower)
      output += `- ${text}\n`
    }
    output += '\n'
  }

  return output.trim()
}

export async function convertHTML(file, onProgress) {
  onProgress(20, 'Leyendo HTML…')
  const text = await file.text()
  onProgress(55, 'Convirtiendo a Markdown…')
  return makeTurndown().turndown(text)
}

export async function convertRTF(file, onProgress) {
  onProgress(20, 'Analizando RTF…')
  const text = await file.text()

  const clean = text
    .replace(/\{\\rtf[^}]*\}/g, '')
    .replace(/\\par\b/g, '\n')
    .replace(/\\pard\b/g, '\n')
    .replace(/\\sect\b/g, '\n\n---\n\n')
    .replace(/\\[a-z]+\-?\d*[ ]?/gi, ' ')
    .replace(/\{|\}/g, '')
    .replace(/\\\*/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return `# Documento\n\n${clean}`
}

export async function convertCode(file, ext, onProgress) {
  onProgress(30, 'Leyendo archivo fuente…')
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
    '> **Nota:** Las imágenes no pueden tener texto extraído sin OCR.',
    '',
    `**Archivo:** \`${file.name}\`  `,
    `**Tipo:** ${(file.type || ext).toUpperCase()}  `,
    `**Tamaño:** ${formatSize(file.size)}`,
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
      onProgress(50, 'Leyendo archivo…')
      return file.text()
    }

    default:
      if (IMAGE_EXTS.includes(ext)) {
        onProgress(100, 'Listo')
        return convertImage(file)
      }
      if (CODE_LANG_MAP[ext]) {
        return convertCode(file, ext, onProgress)
      }
      throw new Error(
        `Formato no soportado: .${ext}\n\nFormatos compatibles: PDF, DOCX, XLSX, CSV, PPTX, HTML, TXT, MD, RTF, imágenes y archivos de código fuente.`
      )
  }
}
