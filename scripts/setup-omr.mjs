// Açık kaynak nota tanıma motoru homr'u (https://github.com/liebharc/homr)
// proje klasöründeki .venv-omr sanal ortamına kurar ve modelleri indirir.
// Windows, macOS ve Linux'ta çalışır. Gereksinim: Python 3.10+
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const venv = join(root, '.venv-omr')
const isWindows = process.platform === 'win32'
const bin = (name) => join(venv, isWindows ? 'Scripts' : 'bin', isWindows ? `${name}.exe` : name)

function run(cmd, args) {
  console.log(`> ${cmd} ${args.join(' ')}`)
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: root })
  if (r.status !== 0) {
    console.error(`\nKomut başarısız oldu: ${cmd} ${args.join(' ')}`)
    process.exit(1)
  }
}

// Sistemdeki uygun Python'u bul (python3, python veya Windows'taki "py" başlatıcısı)
function findPython() {
  const candidates = isWindows
    ? [['py', ['-3']], ['python', []], ['python3', []]]
    : [['python3', []], ['python', []]]
  for (const [cmd, pre] of candidates) {
    const r = spawnSync(cmd, [...pre, '-c', 'import sys; print("%d.%d" % sys.version_info[:2])'], {
      encoding: 'utf8',
    })
    if (r.status !== 0) continue
    const [major, minor] = r.stdout.trim().split('.').map(Number)
    if (major === 3 && minor >= 10) return { cmd, pre, version: r.stdout.trim() }
    console.warn(`${cmd} bulundu ama sürümü ${r.stdout.trim()}; en az 3.10 gerekiyor.`)
  }
  return null
}

const python = findPython()
if (!python) {
  console.error(`
Python 3.10 veya üstü bulunamadı.
  • https://www.python.org/downloads/ adresinden Python'u kur.
  • Windows'ta kurulumun ilk ekranında "Add Python to PATH" kutusunu işaretle.
  • Kurulumdan sonra terminali kapatıp yeniden aç ve bu komutu tekrar çalıştır.`)
  process.exit(1)
}
console.log(`Python ${python.version} bulundu (${python.cmd}).`)

if (!existsSync(bin('python'))) {
  run(python.cmd, [...python.pre, '-m', 'venv', venv])
}
run(bin('python'), ['-m', 'pip', 'install', '--quiet', '--upgrade', 'pip'])
run(bin('python'), ['-m', 'pip', 'install', '--quiet', 'homr', 'onnxruntime'])
run(bin('homr'), ['--init'])

console.log(`\n✔ homr kuruldu: ${bin('homr')}\nŞimdi "pnpm dev" (ya da telefondan kullanmak için "pnpm dev:telefon") çalıştırabilirsin.`)
