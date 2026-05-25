const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const mobile = path.join(root, 'mobile')
const reportPath = path.join(mobile, 'docs', 'phase-2-report.md')

const checks = [
  { name: 'mobile folder', ok: fs.existsSync(mobile) },
  { name: 'app/index.tsx', ok: fs.existsSync(path.join(mobile, 'app', 'index.tsx')) },
  { name: 'StartupCoordinator', ok: fs.existsSync(path.join(mobile, 'app', 'StartupCoordinator.tsx')) },
  { name: 'providers', ok: fs.existsSync(path.join(mobile, 'providers')) },
  { name: 'navigation/RootNavigator', ok: fs.existsSync(path.join(mobile, 'navigation', 'RootNavigator.tsx')) },
  { name: 'theme/registry', ok: fs.existsSync(path.join(mobile, 'theme', 'registry.ts')) },
  { name: 'storage/adapter', ok: fs.existsSync(path.join(mobile, 'storage', 'adapter.ts')) },
  { name: 'state/stores', ok: fs.existsSync(path.join(mobile, 'state', 'stores.ts')) },
  { name: 'services/network', ok: fs.existsSync(path.join(mobile, 'services', 'network.ts')) },
  { name: 'docs folder', ok: fs.existsSync(path.join(mobile, 'docs')) },
]

const missing = checks.filter(c => !c.ok)
const warnings = []

const status = missing.length === 0 ? 'PASS' : 'FAIL'

const lines = []
lines.push('# Phase 2 Verification Report')
lines.push(`Status: ${status}`)
lines.push('')
lines.push('## Checks')
checks.forEach(c => lines.push(`- [${c.ok ? 'x' : ' '}] ${c.name}`))
if(warnings.length){
  lines.push('')
  lines.push('## Warnings')
  warnings.forEach(w => lines.push(`- ${w}`))
}

if(missing.length){
  lines.push('')
  lines.push('## Missing')
  missing.forEach(m => lines.push(`- ${m.name}`))
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true })
fs.writeFileSync(reportPath, lines.join('\n'))

console.log('Phase 2 verification complete:', status)
console.log('Report written to', reportPath)
process.exit(missing.length === 0 ? 0 : 2)
