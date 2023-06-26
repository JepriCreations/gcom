import { trytm } from '@bdsqqq/try'
import { exec, execSync } from 'child_process'
import { promisify } from 'util'
import { exitProgram } from './utils'
import { title } from 'process'

const execAsync = promisify(exec)

function cleanStdout(stdout: string) {
  return stdout.trim().split('\n').filter(Boolean)
}

export function getGitRoot() {
  const command = 'git rev-parse --show-toplevel 2>NUL'
  try {
    const dir = execSync(command).toString().trim()
    return dir
  } catch (error) {
    exitProgram({
      code: 1,
      message: 'Error: You need to be in a git repository.',
    })
  }
}

export async function getChangedFiles() {
  const { stdout } = await execAsync('git status --porcelain')
  return cleanStdout(stdout).map((line) => line.split(' ').pop()!)
}

export async function getStagedFiles() {
  const { stdout } = await execAsync('git diff --cached --name-only')
  return cleanStdout(stdout)
}

interface CommitReturn {
  title: string
  changes: {
    changed: string
    insertions: string | undefined
    deletions: string | undefined
  }
}
export async function gitCommit({
  commit,
}: {
  commit: string
}): Promise<CommitReturn> {
  const { stdout } = await execAsync(`git commit -m "${commit}"`)
  const result = cleanStdout(stdout)

  const title = result[0] ?? ''
  const changes = result[1] ? result[1].trim().split(',') : []
  const changed = changes.find((i) => i.includes('change')) ?? ''
  const insertions = changes.find((i) => i.includes('insertion'))
  const deletions = changes.find((i) => i.includes('deletion'))

  return {
    title,
    changes: {
      changed,
      insertions,
      deletions,
    },
  }
}

export async function gitAdd({ files = [] }: { files: string[] }) {
  const filesLine = files.join(' ')
  const { stdout } = await execAsync(`git add ${filesLine}`)
  return cleanStdout(stdout)
}

export async function getCurrentBranchName() {
  const { stdout } = await execAsync('git branch --show-current')
  return stdout.trim()
}

export async function gitPush() {
  return await execAsync('git push')
}
