import './App.css'
import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, File, Table, Hash, AlignLeft, Image, Code2, Code,
  Layers, Download, Copy, Check, X, Lock, AlertCircle, CheckCircle,
  Eye, Terminal, HelpCircle, Wand2,
} from 'lucide-react'
import { marked } from 'marked'
import {
  dispatchConversion, formatSize, getExt,
  detectRedundancies, cleanRedundancies,
} from './converters'

// ── DESIGN TOKENS ────────────────────────────────────────────
const FORMATS = [
  { ext: 'PDF',      color: '#ff6b6b', Icon: FileText  },
  { ext: 'DOCX',     color: '#da8a67', Icon: FileText  },
  { ext: 'XLSX',     color: '#4ecb8d', Icon: Table     },
  { ext: 'CSV',      color: '#68d4b5', Icon: Table     },
  { ext: 'PPTX',     color: '#f2c384', Icon: Layers    },
  { ext: 'HTML',     color: '#b87333', Icon: Code      },
  { ext: 'RTF',      color: '#d4956a', Icon: File      },
  { ext: 'MD',       color: '#b87333', Icon: Hash      },
  { ext: 'TXT',      color: '#8a7a6e', Icon: AlignLeft },
  { ext: 'Imágenes', color: '#da8a67', Icon: Image     },
  { ext: 'Código',   color: '#e8b48a', Icon: Code2     },
]

const FILE_META = {
  pdf:  { color: '#ff6b6b', Icon: FileText  },
  docx: { color: '#da8a67', Icon: FileText  },
  doc:  { color: '#da8a67', Icon: FileText  },
  xlsx: { color: '#4ecb8d', Icon: Table     },
  xls:  { color: '#4ecb8d', Icon: Table     },
  csv:  { color: '#68d4b5', Icon: Table     },
  pptx: { color: '#f2c384', Icon: Layers    },
  html: { color: '#b87333', Icon: Code      },
  htm:  { color: '#b87333', Icon: Code      },
  rtf:  { color: '#d4956a', Icon: File      },
  md:   { color: '#b87333', Icon: Hash      },
  mdx:  { color: '#b87333', Icon: Hash      },
  txt:  { color: '#8a7a6e', Icon: AlignLeft },
}

function getFileMeta(ext) {
  return FILE_META[ext] || { color: '#e8b48a', Icon: Code2 }
}

function getStats(text) {
  if (!text) return { lines: 0, words: 0, chars: 0 }
  return {
    lines: text.split('\n').length,
    words: text.trim() ? text.trim().split(/\s+/).length : 0,
    chars: text.length,
  }
}

// ── PARTICLES ────────────────────────────────────────────────
const PARTICLE_DEFS = [
  { size: 3, top: '12%', left: '7%',  dur: 18, del: 0   },
  { size: 2, top: '28%', left: '15%', dur: 22, del: -4  },
  { size: 4, top: '65%', left: '4%',  dur: 16, del: -2  },
  { size: 2, top: '82%', left: '12%', dur: 25, del: -8  },
  { size: 3, top: '8%',  left: '88%', dur: 20, del: -1  },
  { size: 2, top: '35%', left: '93%', dur: 17, del: -6  },
  { size: 4, top: '72%', left: '87%', dur: 23, del: -3  },
  { size: 2, top: '90%', left: '78%', dur: 19, del: -9  },
  { size: 3, top: '45%', left: '2%',  dur: 21, del: -5  },
  { size: 2, top: '55%', left: '96%', dur: 24, del: -7  },
  { size: 3, top: '20%', left: '48%', dur: 28, del: -2  },
  { size: 2, top: '75%', left: '52%', dur: 15, del: -4  },
  { size: 4, top: '40%', left: '22%', dur: 20, del: -11 },
  { size: 2, top: '18%', left: '70%', dur: 26, del: -6  },
  { size: 3, top: '58%', left: '60%', dur: 22, del: -3  },
  { size: 2, top: '88%', left: '35%', dur: 18, del: -8  },
]

function Particles() {
  return (
    <div className="particles" aria-hidden="true">
      {PARTICLE_DEFS.map((p, i) => (
        <span
          key={i}
          className="particle"
          style={{
            width: p.size,
            height: p.size,
            top: p.top,
            left: p.left,
            '--dur': `${p.dur}s`,
            '--del': `${p.del}s`,
            opacity: 0.38,
          }}
        />
      ))}
    </div>
  )
}

// ── PUMPKIN LOGO ─────────────────────────────────────────────
function PumpkinLogo() {
  const [laughing, setLaughing] = useState(false)
  return (
    <span
      className={`logo-pumpkin${laughing ? ' laughing' : ''}`}
      onMouseEnter={() => setLaughing(true)}
      onMouseLeave={() => setLaughing(false)}
      aria-label="Calabaza siniestra"
      role="img"
    >
      <svg
        className="pumpkin-svg"
        viewBox="0 0 52 58"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Stem */}
        <path
          d="M26 9 C25 9 22 4 29 2"
          stroke="#3d6b42"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Pumpkin body — overlapping ellipses create ribbed look */}
        <ellipse cx="10" cy="36" rx="10" ry="17" fill="#8c2d08"/>
        <ellipse cx="19" cy="36" rx="13" ry="19" fill="#b83a10"/>
        <ellipse cx="26" cy="36" rx="12" ry="20" fill="#cc4d18"/>
        <ellipse cx="33" cy="36" rx="13" ry="19" fill="#b83a10"/>
        <ellipse cx="42" cy="36" rx="10" ry="17" fill="#8c2d08"/>
        {/* Highlight */}
        <ellipse cx="20" cy="28" rx="5" ry="4" fill="rgba(255,180,120,0.12)"/>
        {/* Outer glow ring */}
        <ellipse
          cx="26" cy="36" rx="24" ry="21"
          fill="none"
          stroke="rgba(255,90,0,0.18)"
          strokeWidth="1"
        />

        {/* Eyes — normal (sinister inverted triangles) */}
        <g className="pumpkin-eyes-normal">
          <polygon points="18,28 13,36 23,36" fill="#1a0800"/>
          <polygon points="34,28 29,36 39,36" fill="#1a0800"/>
        </g>

        {/* Eyes — laughing (X marks) */}
        <g className="pumpkin-eyes-laugh">
          <line x1="13" y1="28" x2="23" y2="36" stroke="#1a0800" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="23" y1="28" x2="13" y2="36" stroke="#1a0800" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="29" y1="28" x2="39" y2="36" stroke="#1a0800" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="39" y1="28" x2="29" y2="36" stroke="#1a0800" strokeWidth="2.5" strokeLinecap="round"/>
        </g>

        {/* Mouth — normal (jagged sinister grin) */}
        <g className="pumpkin-mouth-normal">
          <path
            d="M15 43 L19 39 L22 43 L26 38 L30 43 L33 39 L37 43"
            stroke="#1a0800"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Mouth — laughing (wide open with teeth) */}
        <g className="pumpkin-mouth-laugh">
          <path d="M14 41 Q26 55 38 41 Z" fill="#1a0800"/>
          <line x1="19" y1="42" x2="19" y2="48" stroke="#d4b090" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="26" y1="41" x2="26" y2="49" stroke="#d4b090" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="33" y1="42" x2="33" y2="48" stroke="#d4b090" strokeWidth="2.5" strokeLinecap="round"/>
        </g>
      </svg>
    </span>
  )
}

// ── ANIMATED NUMBER ──────────────────────────────────────────
function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0)
  const rafRef  = useRef(null)
  const fromRef = useRef(0)

  useEffect(() => {
    const origin = fromRef.current
    const target = value
    const duration = 550
    let startTime = null

    cancelAnimationFrame(rafRef.current)

    function tick(now) {
      if (!startTime) startTime = now
      const t     = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(origin + (target - origin) * eased))
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value])

  return <>{display.toLocaleString()}</>
}

// ── FORMAT BADGE ─────────────────────────────────────────────
function FormatBadge({ ext, color, Icon }) {
  return (
    <span className="fmt-badge" style={{ color }}>
      <Icon size={10} strokeWidth={2.5} />
      {ext}
    </span>
  )
}

// ── TOAST ────────────────────────────────────────────────────
function Toast({ toast }) {
  const isSuccess = toast?.type === 'success'
  return (
    <AnimatePresence>
      {toast && (
        <div className="toast-wrap">
          <motion.div
            className={`toast${isSuccess ? ' success' : ''}`}
            initial={{ opacity: 0, y: 20, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="toast-icon">
              {isSuccess
                ? <CheckCircle size={16} />
                : <AlertCircle size={16} />}
            </span>
            {toast.msg}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ── REDUNDANCY MODAL ─────────────────────────────────────────
function RedundancyModal({ redundancies, selected, onToggle, onSelectAll, onClean, onDismiss }) {
  const removedLines = redundancies
    .filter(r => selected.has(r.text))
    .reduce((sum, r) => sum + r.count, 0)
  const allSelected = selected.size === redundancies.length

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onDismiss}
    >
      <motion.div
        className="modal-card"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-broom" aria-hidden="true">🧹</span>
            <div>
              <h2 className="modal-title">Redundancias detectadas</h2>
              <p className="modal-subtitle">
                {redundancies.length} patrón{redundancies.length !== 1 ? 'es' : ''} repetido{redundancies.length !== 1 ? 's' : ''} en el documento
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onDismiss} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        <div className="modal-select-all-row">
          <label className="modal-select-all-label">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onSelectAll}
            />
            Seleccionar todo
          </label>
          <span className="modal-count-hint">
            {selected.size} seleccionado{selected.size !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="redundancy-list">
          {redundancies.map(r => (
            <label
              key={r.text}
              className={`redundancy-item${selected.has(r.text) ? ' checked' : ''}`}
            >
              <input
                type="checkbox"
                checked={selected.has(r.text)}
                onChange={() => onToggle(r.text)}
              />
              <span className="redundancy-text">
                {r.text.length > 72 ? r.text.slice(0, 72) + '…' : r.text}
              </span>
              <span className="redundancy-badge">×{r.count.toLocaleString()}</span>
            </label>
          ))}
        </div>

        <div className="modal-footer">
          <span className="modal-summary">
            {selected.size > 0
              ? `Eliminar ~${removedLines.toLocaleString()} líneas`
              : 'Selecciona patrones para eliminar'}
          </span>
          <div className="modal-actions">
            <button className="btn-modal-dismiss" onClick={onDismiss}>
              Mantener original
            </button>
            <button
              className="btn-modal-clean"
              onClick={onClean}
              disabled={selected.size === 0}
            >
              <Wand2 size={13} />
              Limpiar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── DOCUMENT ILLUSTRATION ────────────────────────────────────
function DocumentIllustration({ dragging }) {
  return (
    <motion.svg
      className="dz-illustration"
      width="80"
      height="96"
      viewBox="0 0 80 96"
      fill="none"
      aria-hidden="true"
      animate={dragging ? { y: -6, scale: 1.05 } : { y: [0, -7, 0] }}
      transition={dragging
        ? { duration: 0.25, ease: 'easeOut' }
        : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }
      }
    >
      <rect x="8" y="4" width="56" height="72" rx="6"
        fill="rgba(184,115,51,0.07)" stroke="rgba(184,115,51,0.22)" strokeWidth="1.5"/>
      <path d="M49 4 L64 19" stroke="rgba(184,115,51,0.22)" strokeWidth="1.5"/>
      <path d="M49 4 L49 19 L64 19"
        fill="rgba(184,115,51,0.05)" stroke="rgba(184,115,51,0.22)" strokeWidth="1.5"/>
      <line x1="18" y1="33" x2="54" y2="33" stroke="rgba(184,115,51,0.22)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="18" y1="43" x2="54" y2="43" stroke="rgba(184,115,51,0.15)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="18" y1="53" x2="42" y2="53" stroke="rgba(184,115,51,0.10)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="18" y1="63" x2="36" y2="63" stroke="rgba(184,115,51,0.07)" strokeWidth="1.5" strokeLinecap="round"/>
      {dragging && (
        <motion.g
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <path
            d="M40 88 L40 74 M33 80 L40 73 L47 80"
            stroke="rgba(242,195,132,0.85)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.g>
      )}
    </motion.svg>
  )
}

// ── RAW VIEW ─────────────────────────────────────────────────
function RawView({ text }) {
  const lines = text.split('\n')
  return (
    <div className="raw-view">
      <div className="line-nums" aria-hidden="true">
        {lines.map((_, i) => (
          <div key={i} className="line-num">{i + 1}</div>
        ))}
      </div>
      <div className="raw-scroll">
        <pre className="raw-pre">{text}</pre>
      </div>
    </div>
  )
}

// ── MARKDOWN PREVIEW ──────────────────────────────────────────
function MarkdownPreview({ text }) {
  const html = marked.parse(text, { breaks: true, gfm: true })
  return (
    <div
      className="preview-view"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

// ── EMPTY STATE ───────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon-wrap">
        <FileText />
      </div>
      <p className="empty-label">Sin resultado aún</p>
      <p className="empty-hint">Sube un archivo para ver tu Markdown</p>
    </div>
  )
}

// ── FILE DROPZONE ─────────────────────────────────────────────
function FileDropzone({ file, status, progress, progressMsg, onFile, onRemove }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const isConverting = status === 'converting'

  const handleChange = useCallback(e => {
    const f = e.target.files[0]
    if (f) { onFile(f); e.target.value = '' }
  }, [onFile])

  const handleDrop = useCallback(e => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }, [onFile])

  const handleDragOver  = useCallback(e => { e.preventDefault(); setDragging(true) }, [])
  const handleDragLeave = useCallback(e => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false)
  }, [])

  const handleKeyDown = useCallback(e => {
    if ((e.key === 'Enter' || e.key === ' ') && !isConverting) {
      e.preventDefault()
      inputRef.current?.click()
    }
  }, [isConverting])

  const ext  = file ? getExt(file) : null
  const meta = ext  ? getFileMeta(ext) : null

  const wrapCls = [
    'dropzone-wrap',
    dragging     ? 'dragging'   : '',
    isConverting ? 'converting' : '',
  ].filter(Boolean).join(' ')

  const zoneCls = ['dropzone', dragging ? 'dragging' : ''].filter(Boolean).join(' ')

  return (
    <>
      <div className={wrapCls}>
        <div
          className={zoneCls}
          role="button"
          tabIndex={isConverting ? -1 : 0}
          aria-label="Zona de carga — haz clic o presiona Enter para explorar archivos"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !isConverting && inputRef.current?.click()}
          onKeyDown={handleKeyDown}
        >
          <input
            ref={inputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={handleChange}
            accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.pptx,.html,.htm,.rtf,.md,.mdx,.txt,.js,.mjs,.ts,.tsx,.jsx,.py,.java,.kt,.cpp,.c,.h,.go,.rs,.rb,.php,.swift,.cs,.css,.scss,.json,.yaml,.yml,.xml,.sh"
          />

          {isConverting ? (
            <div className="progress-wrap">
              <div className="spinner" />
              <p className="progress-label">{progressMsg}</p>
              <div className="progress-bar-outer">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <>
              <DocumentIllustration dragging={dragging} />
              <p className="dz-title">
                {dragging ? 'Suelta para convertir' : 'Arrastra tu archivo aquí'}
              </p>
              <p className="dz-sub">
                o <span className="dz-browse">haz clic para explorar</span>
              </p>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {file && !isConverting && (
          <motion.div
            className="glass-card file-card"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className="file-card-icon"
              style={{ background: meta ? `${meta.color}1a` : 'rgba(138,122,110,0.1)' }}
            >
              {meta
                ? <meta.Icon size={18} style={{ color: meta.color }} />
                : <HelpCircle size={18} style={{ color: '#8a7a6e' }} />
              }
            </div>
            <div className="file-info">
              <div className="file-name" title={file.name}>{file.name}</div>
              <div className="file-meta">{formatSize(file.size)} · {file.type || `${ext} file`}</div>
            </div>
            <span
              className="file-ext-badge"
              style={{
                background: meta ? `${meta.color}1a` : 'rgba(138,122,110,0.1)',
                color: meta?.color ?? '#8a7a6e',
              }}
            >
              {ext?.toUpperCase()}
            </span>
            <button className="btn-remove" onClick={onRemove} aria-label="Eliminar archivo">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ── OUTPUT PANEL ──────────────────────────────────────────────
function OutputPanel({ output, file, onDownload, onCopy, copied }) {
  const [tab, setTab] = useState('raw')
  const stats   = getStats(output)
  const hasOut  = Boolean(output)
  const outName = file ? file.name.replace(/\.[^.]+$/, '') + '_markdown.md' : null

  return (
    <div className="glass-card output-panel">
      <div className="out-header">
        <div className="out-header-top">
          <div>
            <p className="panel-label">Resultado</p>
            {outName && <p className="out-filename">{outName}</p>}
          </div>
          {hasOut && (
            <div className="out-stats">
              <div className="stat">
                <span className="stat-val"><AnimatedNumber value={stats.lines} /></span>
                <span className="stat-key">Líneas</span>
              </div>
              <div className="stat">
                <span className="stat-val"><AnimatedNumber value={stats.words} /></span>
                <span className="stat-key">Palabras</span>
              </div>
              <div className="stat">
                <span className="stat-val"><AnimatedNumber value={stats.chars} /></span>
                <span className="stat-key">Caracteres</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="tab-bar">
        <button
          className={`tab-btn${tab === 'raw' ? ' active' : ''}`}
          onClick={() => setTab('raw')}
        >
          <Terminal size={13} />
          Markdown Raw
          {tab === 'raw' && (
            <motion.span
              className="tab-indicator"
              layoutId="tab-indicator"
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            />
          )}
        </button>
        <button
          className={`tab-btn${tab === 'preview' ? ' active' : ''}`}
          onClick={() => setTab('preview')}
        >
          <Eye size={13} />
          Vista previa
          {tab === 'preview' && (
            <motion.span
              className="tab-indicator"
              layoutId="tab-indicator"
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            />
          )}
        </button>
      </div>

      {hasOut ? (
        <>
          <AnimatePresence mode="wait">
            {tab === 'raw' ? (
              <motion.div
                key="raw"
                className="output-content-area"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}
              >
                <RawView text={output} />
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                className="output-content-area"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}
              >
                <MarkdownPreview text={output} />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="action-bar">
            <motion.button
              className="btn-download"
              onClick={onDownload}
              whileHover={{ y: -2 }}
              whileTap={{ y: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
            >
              <Download size={15} />
              Descargar .md
            </motion.button>
            <button
              className={`btn-copy${copied ? ' copied' : ''}`}
              onClick={onCopy}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? '¡Copiado!' : 'Copiar'}
            </button>
          </div>
        </>
      ) : (
        <EmptyState />
      )}
    </div>
  )
}

// ── APP ───────────────────────────────────────────────────────
export default function App() {
  const [file,             setFile]             = useState(null)
  const [output,           setOutput]           = useState('')
  const [status,           setStatus]           = useState('idle')
  const [progress,         setProgress]         = useState(0)
  const [progressMsg,      setProgressMsg]      = useState('')
  const [toast,            setToast]            = useState(null)
  const [copied,           setCopied]           = useState(false)
  const [redundancies,     setRedundancies]     = useState([])
  const [showRedModal,     setShowRedModal]     = useState(false)
  const [selectedPatterns, setSelectedPatterns] = useState(new Set())

  const toastTimer  = useRef(null)
  const copiedTimer = useRef(null)

  const showToast = useCallback((msg, type = 'error') => {
    clearTimeout(toastTimer.current)
    setToast({ msg, type })
    toastTimer.current = setTimeout(() => setToast(null), 4200)
  }, [])

  const handleFile = useCallback(async f => {
    setFile(f)
    setOutput('')
    setStatus('converting')
    setProgress(0)
    setProgressMsg('Iniciando…')
    setShowRedModal(false)
    setRedundancies([])

    try {
      const result = await dispatchConversion(f, (pct, msg) => {
        setProgress(pct)
        setProgressMsg(msg)
      })
      setOutput(result)
      setStatus('done')
      setProgress(100)
      showToast('¡Conversión completada!', 'success')

      // Check for repeated content
      const found = detectRedundancies(result)
      if (found.length > 0) {
        setRedundancies(found)
        setSelectedPatterns(new Set(found.map(r => r.text)))
        setShowRedModal(true)
      }
    } catch (err) {
      setStatus('idle')
      showToast(err.message || 'La conversión falló. Por favor intenta con otro archivo.')
    }
  }, [showToast])

  const handleRemove = useCallback(() => {
    setFile(null)
    setOutput('')
    setStatus('idle')
    setProgress(0)
    setShowRedModal(false)
    setRedundancies([])
  }, [])

  const handleDownload = useCallback(() => {
    if (!output || !file) return
    const name = file.name.replace(/\.[^.]+$/, '') + '_markdown.md'
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), { href: url, download: name })
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [output, file])

  const handleCopy = useCallback(async () => {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      clearTimeout(copiedTimer.current)
      setCopied(true)
      copiedTimer.current = setTimeout(() => setCopied(false), 2200)
    } catch {
      showToast('Acceso al portapapeles denegado. Copia manualmente.')
    }
  }, [output, showToast])

  const handleTogglePattern = useCallback(text => {
    setSelectedPatterns(prev => {
      const next = new Set(prev)
      if (next.has(text)) next.delete(text)
      else next.add(text)
      return next
    })
  }, [])

  const handleSelectAllPatterns = useCallback(() => {
    setSelectedPatterns(prev =>
      prev.size === redundancies.length
        ? new Set()
        : new Set(redundancies.map(r => r.text))
    )
  }, [redundancies])

  const handleCleanRedundancies = useCallback(() => {
    const cleaned = cleanRedundancies(output, Array.from(selectedPatterns))
    setOutput(cleaned)
    setShowRedModal(false)
    setRedundancies([])
    showToast('¡Redundancias eliminadas!', 'success')
  }, [output, selectedPatterns, showToast])

  const fadeUp = {
    hidden:  { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  }

  return (
    <>
      <Particles />

      <div className="app-shell">
        <motion.header
          className="header"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.09 } } }}
        >
          <motion.div className="logo" variants={fadeUp}>
            <PumpkinLogo />
            <span>
              <span className="logo-cobre">Cobre</span>
              <span className="logo-sep"> · </span>
              <span className="logo-markdown">Markdown</span>
            </span>
          </motion.div>

          <motion.p className="tagline" variants={fadeUp}>
            Transforma cualquier documento en{' '}
            <strong>Markdown limpio y estructurado</strong>
          </motion.p>

          <motion.div className="format-strip" variants={fadeUp}>
            {FORMATS.map(f => <FormatBadge key={f.ext} {...f} />)}
          </motion.div>
        </motion.header>

        <main className="main">
          <motion.div
            className="upload-panel"
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.52, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="panel-label">Archivo</p>
            <FileDropzone
              file={file}
              status={status}
              progress={progress}
              progressMsg={progressMsg}
              onFile={handleFile}
              onRemove={handleRemove}
            />
            <div className="glass-card">
              <div className="format-grid">
                {FORMATS.map(f => <FormatBadge key={f.ext} {...f} />)}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.52, delay: 0.36, ease: [0.22, 1, 0.36, 1] }}
          >
            <OutputPanel
              output={output}
              file={file}
              onDownload={handleDownload}
              onCopy={handleCopy}
              copied={copied}
            />
          </motion.div>
        </main>

        <motion.footer
          className="footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.55 }}
        >
          <div className="footer-privacy">
            <Lock size={12} />
            Todo el procesamiento ocurre en tu navegador. Ningún archivo sale de tu equipo.
          </div>
          <div className="footer-right">
            Hecho con <span>◆</span> precisión
          </div>
        </motion.footer>
      </div>

      <Toast toast={toast} />

      <AnimatePresence>
        {showRedModal && (
          <RedundancyModal
            redundancies={redundancies}
            selected={selectedPatterns}
            onToggle={handleTogglePattern}
            onSelectAll={handleSelectAllPatterns}
            onClean={handleCleanRedundancies}
            onDismiss={() => setShowRedModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
