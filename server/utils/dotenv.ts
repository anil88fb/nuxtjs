import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const ROOT = process.cwd()
export const ENV_FILE = resolve(ROOT, '.env')

export function readEnvFile(): Record<string, string> {
  if (!existsSync(ENV_FILE)) {
    const example = resolve(ROOT, '.env.example')
    if (existsSync(example)) copyFileSync(example, ENV_FILE)
    else return {}
  }
  const out: Record<string, string> = {}
  for (const line of readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (m && !line.trimStart().startsWith('#')) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2')
  }
  return out
}

// Update keys in place, keep comments and other lines.
export function writeEnvFile(updates: Record<string, string>) {
  readEnvFile() // creates the file from .env.example if needed
  const lines = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf8').split(/\r?\n/) : []
  const done = new Set<string>()
  const next = lines.map((line) => {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/)
    if (m && m[1] in updates && !line.trimStart().startsWith('#')) {
      done.add(m[1])
      return `${m[1]}=${updates[m[1]]}`
    }
    return line
  })
  for (const [k, v] of Object.entries(updates)) if (!done.has(k)) next.push(`${k}=${v}`)
  writeFileSync(ENV_FILE, next.join('\n').replace(/\n*$/, '\n'), { mode: 0o600 })
}
