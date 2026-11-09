import { access, cp, lstat, mkdir, mkdtemp, readFile, rename, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const frontendDirectory = path.resolve(scriptDirectory, '..')
const defaultSourceDirectory = process.env.FRONTEND_DIST_DIR
  ? path.resolve(frontendDirectory, process.env.FRONTEND_DIST_DIR)
  : path.join(frontendDirectory, 'dist')
const defaultApacheRoot = process.env.APACHE_HTML_ROOT || '/var/www/dasssest.com/html'

const exists = async (candidate) =>
  lstat(candidate)
    .then(() => true)
    .catch((error) => {
      if (error.code === 'ENOENT') return false
      throw error
    })

export const publicSubpathFromBundle = (html) => {
  const assetReference = html.match(/(?:src|href)=["'](\/[^"']*\/assets\/[^"']+)["']/)?.[1]
  if (!assetReference) {
    throw new Error(
      'Não foi possível identificar o subpath público nos assets de dist/index.html. Verifique se "base" está configurado como "/<nome-do-app>/" no vite.config.',
    )
  }

  const assetsMarker = assetReference.indexOf('/assets/')
  const publicSubpath = assetReference.slice(0, assetsMarker + 1)
  const relativeSubpath = publicSubpath.replace(/^\/+|\/+$/g, '')

  if (!relativeSubpath || relativeSubpath.split('/').some((part) => part === '.' || part === '..')) {
    throw new Error(`Subpath público inválido no bundle: ${publicSubpath}`)
  }

  return relativeSubpath
}

export async function publish({
  sourceDir = defaultSourceDirectory,
  customApacheRoot = defaultApacheRoot,
  publishDir = process.env.FRONTEND_PUBLISH_DIR,
} = {}) {
  const currentIndexPath = path.join(sourceDir, 'index.html')
  const bundle = await readFile(currentIndexPath, 'utf8').catch((error) => {
    if (error.code === 'ENOENT') {
      throw new Error('Artefato ausente: execute npm run build antes do publish:apache.')
    }
    throw error
  })
  await access(currentIndexPath)

  const derivedTarget = path.resolve(customApacheRoot, publicSubpathFromBundle(bundle))
  const targetDirectory = path.resolve(publishDir || derivedTarget)
  const targetParent = path.dirname(targetDirectory)
  const targetName = path.basename(targetDirectory)

  if (targetDirectory === path.parse(targetDirectory).root || !targetName) {
    throw new Error('FRONTEND_PUBLISH_DIR precisa apontar para um diretório de aplicação específico.')
  }

  await mkdir(targetParent, { recursive: true })

  const stagingParent = await mkdtemp(path.join(targetParent, `.${targetName}.staging-`))
  const stagedDirectory = path.join(stagingParent, targetName)
  let backupDirectory = null

  try {
    await cp(sourceDir, stagedDirectory, {
      recursive: true,
      errorOnExist: true,
      preserveTimestamps: true,
    })
    await access(path.join(stagedDirectory, 'index.html'))

    if (await exists(targetDirectory)) {
      backupDirectory = path.join(targetParent, `.${targetName}.backup-${process.pid}-${Date.now()}`)
      await rename(targetDirectory, backupDirectory)
    }

    await rename(stagedDirectory, targetDirectory)
    if (backupDirectory) {
      await rm(backupDirectory, { recursive: true, force: true })
      console.log(`Versão anterior de ${targetDirectory} removida completamente.`)
    }
    await rm(stagingParent, { recursive: true, force: true })
    console.log(`Frontend publicado com sucesso em ${targetDirectory}`)
    return targetDirectory
  } catch (error) {
    if (backupDirectory && !(await exists(targetDirectory)) && (await exists(backupDirectory))) {
      await rename(backupDirectory, targetDirectory)
    }
    await rm(stagingParent, { recursive: true, force: true })
    throw error
  }
}

const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
if (isDirectExecution) {
  await publish()
}
