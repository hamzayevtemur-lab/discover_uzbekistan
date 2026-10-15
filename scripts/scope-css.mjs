// Usage: node scripts/scope-css.mjs <source.html|.css> <scopeClass> <out.css>
// Extracts the inline <style> blocks of a legacy page and scopes every selector under
// .<scopeClass> so per-page styles (header, footer, :root vars, body) can't leak between React pages.
import fs from 'node:fs'
import postcss from 'postcss'
import prefixer from 'postcss-prefix-selector'

const [, , src, scope, out] = process.argv
const raw = fs.readFileSync(src, 'utf8')
const css = src.endsWith('.css')
  ? raw
  : [...raw.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n')

const prefix = `.${scope}`
const result = await postcss([
  prefixer({
    prefix,
    transform(p, selector, prefixed) {
      const s = selector.trim()
      if (s === ':root' || s === 'html' || s === 'body') return prefix
      if (/^(html|body)\b/.test(s)) return s.replace(/^(html|body)\s*/, `${prefix} `)
      if (s === '*' || s.startsWith('*,') ) return prefixed
      return prefixed
    },
  }),
]).process(css, { from: undefined })

fs.writeFileSync(out, result.css)
console.log(`${out}: ${result.css.length} bytes`)
