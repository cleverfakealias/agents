import { describe, expect, test } from 'claude-code/testing'

import { fromCommand, fromManifestEdit, segments } from '../hooks/rules'

const names = (command: string, local: string[] = []) => fromCommand(command, n => local.includes(n)).map(p => p.name)

describe('segments', () => {
  test('splits on chain operators outside quotes', () => {
    expect(segments(`cd /z/x && npm i left-pad; echo "a && b"`)).toEqual([
      ['cd', '/z/x'],
      ['npm', 'i', 'left-pad'],
      ['echo', 'a && b'],
    ])
  })
})

describe('commands that bring in packages', () => {
  test('npm, pnpm, yarn and bun adds, with versions and scopes stripped', () => {
    expect(names('npm install left-pad@1.3.0 @scope/thing@^2')).toEqual(['left-pad', '@scope/thing'])
    expect(names('pnpm add -D vitest')).toEqual(['vitest'])
    expect(names('cd /z/github_projects/zennlogic.com && pnpm --filter web add zod')).toEqual(['zod'])
    expect(names('yarn add react')).toEqual(['react'])
    expect(names('bun add hono')).toEqual(['hono'])
    expect(names('npm i -g wrangler')).toEqual(['wrangler'])
  })
  test('one-off runners, unless the project already has the binary', () => {
    expect(names('npx cowsay hi')).toEqual(['cowsay'])
    expect(names('npx prettier --check .', ['prettier'])).toEqual([])
    expect(names('npx --no-install prettier --check .')).toEqual([])
    expect(names('pnpm dlx create-astro')).toEqual(['create-astro'])
    expect(names('uvx ruff check')).toEqual(['ruff'])
  })
  test('pip in every spelling, with extras and pins stripped', () => {
    expect(names('pip install requests[socks]==2.32.0')).toEqual(['requests'])
    expect(names('python -m pip install --upgrade httpx')).toEqual(['httpx'])
    expect(names('py -m pip install rich')).toEqual(['rich'])
    expect(names('uv add pydantic')).toEqual(['pydantic'])
    expect(names('uv pip install numpy')).toEqual(['numpy'])
    expect(names('pipx install black')).toEqual(['black'])
  })
  test('system and other ecosystems', () => {
    expect(names('winget install --id Git.Git -e')).toEqual(['Git.Git'])
    expect(names('choco install jq')).toEqual(['jq'])
    expect(names('cargo install ripgrep')).toEqual(['ripgrep'])
    expect(names('go install golang.org/x/tools/gopls@latest')).toEqual(['golang.org/x/tools/gopls'])
    expect(names('Install-Module -Name PSReadLine')).toEqual(['PSReadLine'])
  })
  test('restores of declared dependencies pass', () => {
    expect(names('npm ci')).toEqual([])
    expect(names('npm install')).toEqual([])
    expect(names('pnpm install --frozen-lockfile')).toEqual([])
    expect(names('pip install -r requirements.txt')).toEqual([])
    expect(names('pip install -e .')).toEqual([])
    expect(names('npm install ./packages/local')).toEqual([])
    expect(names('npm run build && pnpm test')).toEqual([])
  })
  test('links point at the registry page', () => {
    const [npm] = fromCommand('npm i left-pad')
    const [pip] = fromCommand('pip install requests')
    expect(npm.link).toBe('https://www.npmjs.com/package/left-pad')
    expect(pip.link).toBe('https://pypi.org/project/requests/')
  })
})

describe('manifest edits', () => {
  const pkgJson = JSON.stringify({ name: 'x', version: '1.0.0', dependencies: { react: '^19.0.0' } }, null, 2)

  test('an Edit that adds a dependency', () => {
    const r = fromManifestEdit('Z:/repo/package.json', {
      old: '"react": "^19.0.0"',
      new: '"react": "^19.0.0",\n    "left-pad": "^1.3.0"',
      before: pkgJson,
      whole: false,
    })
    expect(r.map(p => p.name)).toEqual(['left-pad'])
  })
  test('an Edit that bumps a version or changes a script adds nothing', () => {
    expect(fromManifestEdit('package.json', { old: '"react": "^19.0.0"', new: '"react": "^19.1.0"', before: pkgJson, whole: false })).toEqual([])
    expect(fromManifestEdit('package.json', { old: '"build": "astro build"', new: '"build": "astro build && node x.mjs"', before: pkgJson, whole: false })).toEqual([])
    expect(fromManifestEdit('package.json', { old: '"version": "1.0.0"', new: '"version": "1.1.0"', before: pkgJson, whole: false })).toEqual([])
  })
  test('a Write compares whole dependency lists', () => {
    const next = JSON.stringify({ name: 'x', dependencies: { react: '^19.0.0' }, devDependencies: { vitest: '^4.0.0' } })
    expect(fromManifestEdit('package.json', { new: next, before: pkgJson, whole: true }).map(p => p.name)).toEqual(['vitest'])
  })
  test('requirements files', () => {
    const r = fromManifestEdit('requirements.txt', { new: 'requests==2.32\nrich>=13\n# comment', before: 'requests==2.31\n', whole: true })
    expect(r.map(p => p.name)).toEqual(['rich'])
  })
})
