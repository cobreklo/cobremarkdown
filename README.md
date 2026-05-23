# Cobre Markdown

**Convierte cualquier archivo a Markdown limpio y estructurado — directamente en tu navegador.**

![Cobre Markdown](https://img.shields.io/badge/version-2.0.0-b87333?style=flat-square) ![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react) ![Vite](https://img.shields.io/badge/Vite-5-646cff?style=flat-square&logo=vite) ![License](https://img.shields.io/badge/licencia-MIT-4ecb8d?style=flat-square)

---

## ¿Qué es?

Cobre Markdown es una herramienta web que transforma documentos de múltiples formatos en Markdown limpio con un solo clic. Todo el procesamiento ocurre en tu navegador — ningún archivo sale de tu equipo.

## Formatos soportados

| Formato | Extensiones | Método |
|---------|-------------|--------|
| PDF | `.pdf` | PDF.js — extracción página a página |
| Word | `.docx`, `.doc` | mammoth → HTML → Markdown |
| Excel | `.xlsx`, `.xls` | SheetJS → tablas Markdown |
| CSV | `.csv` | Parser propio con soporte de comillas |
| PowerPoint | `.pptx` | JSZip → extracción de slides XML |
| HTML | `.html`, `.htm` | Turndown |
| RTF | `.rtf` | Limpieza de control words |
| Markdown | `.md`, `.mdx` | Passthrough |
| Texto plano | `.txt` | Passthrough |
| Imágenes | `.png`, `.jpg`, `.webp`, `.gif`… | Referencia `![nombre](archivo)` |
| Código fuente | `.js`, `.ts`, `.py`, `.go`, `.rs`… | Bloque de código con lenguaje |

## Stack

- **React 18** + **Vite 5** — SPA sin backend
- **framer-motion** — animaciones de entrada y transiciones
- **lucide-react** — iconografía SVG
- **mammoth** — conversión DOCX (build de navegador)
- **pdfjs-dist** — extracción de texto PDF (vía CDN)
- **SheetJS (xlsx)** — lectura de hojas de cálculo
- **Turndown** — HTML → Markdown
- **JSZip** — descompresión PPTX
- **marked** — render de preview Markdown

## Instalación y uso local

```bash
# Requiere Node.js 18+
npm install
npm run dev
```

Abre `http://localhost:5173` en tu navegador.

## Build de producción

```bash
npm run build
# Resultado en /dist — sirve con cualquier servidor estático
```

## Privacidad

Todo el procesamiento es 100% client-side. No hay servidor, no hay base de datos, no se envía ningún archivo a ningún destino externo. Los archivos nunca salen del navegador del usuario.

---

Hecho con ◆ precisión
