import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { publish } from '../scripts/publish-apache.mjs'

test('publish substitui completamente a pasta antiga pela nova build', async () => {
  const tmpBase = await mkdtemp(path.join(os.tmpdir(), 'test-publish-'))

  try {
    const fakeDist = path.join(tmpBase, 'dist')
    const targetDir = path.join(tmpBase, 'html', 'app-exemplo')

    await mkdir(path.join(fakeDist, 'assets'), { recursive: true })
    await writeFile(
      path.join(fakeDist, 'index.html'),
      '<!DOCTYPE html><html><head><script src="/app-exemplo/assets/new-bundle-999.js"></script></head><body>New</body></html>',
    )
    await writeFile(path.join(fakeDist, 'assets', 'new-bundle-999.js'), 'console.log("new");')

    await mkdir(path.join(targetDir, 'assets'), { recursive: true })
    await writeFile(path.join(targetDir, 'assets', 'old-obsolete-chunk.js'), 'console.log("old");')
    await writeFile(path.join(targetDir, 'legacy-file.txt'), 'old text')
    await writeFile(path.join(targetDir, 'index.html'), '<html><body>Old</body></html>')

    const publishedDir = await publish({
      sourceDir: fakeDist,
      publishDir: targetDir,
    })

    assert.equal(publishedDir, targetDir)

    const newIndex = await readFile(path.join(targetDir, 'index.html'), 'utf8')
    assert.ok(newIndex.includes('new-bundle-999.js'))
    const newAsset = await readFile(path.join(targetDir, 'assets', 'new-bundle-999.js'), 'utf8')
    assert.equal(newAsset, 'console.log("new");')

    await assert.rejects(
      async () => readFile(path.join(targetDir, 'legacy-file.txt')),
      { code: 'ENOENT' },
      'Arquivo legado deveria ter sido removido',
    )
    await assert.rejects(
      async () => readFile(path.join(targetDir, 'assets', 'old-obsolete-chunk.js')),
      { code: 'ENOENT' },
      'Chunk obsoleto da versão anterior deveria ter sido removido',
    )
  } finally {
    await rm(tmpBase, { recursive: true, force: true })
  }
})
