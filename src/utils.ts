import * as p from '@clack/prompts'
import color from 'picocolors'
import fs from 'fs'
import { homedir } from 'os'
import { ZodError, z } from 'zod'
import { fromZodError } from 'zod-validation-error'

import { CONFIG_FILE_NAME, DEFAULT_TYPE_OPTIONS } from './constants'
import { getCurrentBranchName, getGitRoot } from './git'
import { CommitState, Config } from './validations'
import { trytm } from '@bdsqqq/try'

export function getDefaultConfigPath(): string {
  return homedir() + '/' + CONFIG_FILE_NAME
}

export function addNewLine(arr: string[], i: number) {
  return i === arr.length - 1 ? '' : '\n'
}

export function exitProgram({
  code = 0,
  message = 'The commit has not been created',
} = {}): never {
  p.log.error(color.red(message))
  process.exit(code)
}

function validateConfig(
  config: z.infer<typeof Config>
): z.infer<typeof Config> {
  try {
    return Config.parse(config)
  } catch (err) {
    exitProgram({ message: fromZodError(err as ZodError).message })
  }
}

function readConfigFromPath(config_path: string) {
  let res = null
  try {
    res = JSON.parse(fs.readFileSync(config_path, 'utf8'))
  } catch (err) {
    exitProgram({ message: 'Invalid JSON file. Exiting.\n' + err })
  }

  return validateConfig(res)
}

function getTypeData(value?: string) {
  return (
    DEFAULT_TYPE_OPTIONS.find((type) => type.value === value) ??
    DEFAULT_TYPE_OPTIONS[0]
  )
}

export async function loadSetup(): Promise<z.infer<typeof Config>> {
  let config: { value: z.infer<typeof Config>; message: string }
  // Welcome the user to the CLI
  p.intro(
    `${color.bgCyan(`${color.black(' gcom ')}`)} ${color.cyan(
      "- Let's commit some changes to your cool project."
    )}`
  )

  const root = getGitRoot()
  const root_path = `${root}/${CONFIG_FILE_NAME}`

  // Check for a config file in the repository dir
  if (fs.existsSync(root_path)) {
    config = {
      value: readConfigFromPath(root_path),
      message: '🔎 Found repository config',
    }

    // If there is no default config yet, create one
  } else {
    const configType = (await p.select({
      message:
        'Config not found. Do you want to use the default, or create a custom one?',
      options: [
        { value: 'default', label: 'Default' },
        { value: 'custom', label: 'Custom' },
      ],
    })) as 'default' | 'custom'
    if (p.isCancel(configType)) exitProgram()

    if (configType === 'default') {
      const default_config = Config.parse({})

      fs.writeFileSync(root_path, JSON.stringify(default_config, null, 2))
      config = {
        value: default_config,
        message: `A default ${CONFIG_FILE_NAME} has been generated for you.`,
      }
    } else {
      const default_config = await configGuide()

      fs.writeFileSync(root_path, JSON.stringify(default_config, null, 2))
      config = {
        value: default_config,
        message: `Your ${CONFIG_FILE_NAME} has been generated.`,
      }
    }
  }

  if (config.value.clean_console) {
    console.clear()
  }

  p.log.success(config.message)

  return config.value
}

export async function inferTypeFromBranch(
  types: string[] = []
): Promise<string> {
  const [branch, error_branch] = await trytm(getCurrentBranchName())

  if (error_branch) return ''

  const found = types.find((t) => {
    const start_dash = new RegExp(`^${t}-`)
    const between_dash = new RegExp(`-${t}-`)
    const before_slash = new RegExp(`${t}/`)
    const re = [
      branch.match(start_dash),
      branch.match(between_dash),
      branch.match(before_slash),
    ].filter((v) => v != null)
    return re?.length
  })

  return found ?? ''
}

async function configGuide() {
  const group = await p.group(
    {
      clean_console: () =>
        p.confirm({
          message: 'Clean the console every time the command is run?',
          initialValue: false,
        }),
      commit_initial_value: () =>
        p.select({
          message: 'Select a default commit type value',
          initialValue: DEFAULT_TYPE_OPTIONS[2].value,
          options: DEFAULT_TYPE_OPTIONS.map(({ value, label, hint }) => ({
            value,
            label,
            hint,
          })),
        }),
      emojis: ({ results }) => {
        const initial_value = results.commit_initial_value
        return p.confirm({
          message: `Use emojis in commits? ${color.dim(
            `Ex.: ${
              getTypeData(initial_value)?.emoji
            } ${initial_value}: Example commit.`
          )}`,
          initialValue: true,
        })
      },
      commit_scope: () =>
        p.confirm({
          message: 'Enable scope?',
          initialValue: false,
        }),
      check_ticket: () =>
        p.confirm({
          message: 'Enable ticket?',
          initialValue: false,
        }),
      commit_body: () =>
        p.confirm({
          message: 'Enable commit body?',
          initialValue: true,
        }),
      commit_footer: () =>
        p.confirm({
          message: `Enable commit footer? ${color.dim(
            '(It will always be activated on breaking changes)'
          )}`,
          initialValue: false,
        }),
      breaking_change_exclamation: () =>
        p.confirm({
          message:
            'Add an exclamation in breaking changes to the commit title?',
          initialValue: true,
        }),
      confirm_commit: () =>
        p.confirm({
          message: 'Do you want to be asked to confirm the commit?',
          initialValue: true,
        }),
      print_commit_output: ({ results }) => {
        const preview = results.confirm_commit

        if (preview)
          return p.confirm({
            message: 'Do you want to preview the commit?',
            initialValue: true,
          })
      },
      push: () => {
        return p.confirm({
          message: `Push your changes after commit? ${color.dim(
            '(You will be asked before push)'
          )}`,
          initialValue: true,
        })
      },
    },
    {
      onCancel: () => {
        p.cancel('Operation cancelled.')
        process.exit(0)
      },
    }
  )

  const config: z.infer<typeof Config> = Config.parse({
    clean_console: group.clean_console,
    commit_type: {
      initial_value: group.commit_initial_value,
      emojis: group.emojis,
    },
    commit_scope: {
      enabled: group.commit_scope,
    },
    check_ticket: {
      infer_ticket: group.check_ticket,
    },
    commit_body: {
      enable: group.commit_body,
    },
    commit_footer: {
      enable: group.commit_footer,
    },
    breaking_change: {
      add_exclamation_to_title: group.breaking_change_exclamation,
    },
    confirm_commit: group.confirm_commit,
    print_commit_output: group.print_commit_output,
    push: {
      enable: group.push,
    },
  })

  return config
}

export function cleanCommitTitle(title: string) {
  const trimmed_title = title.trim()
  const remove_period = trimmed_title.endsWith('.')
  return remove_period ? trimmed_title.slice(0, -1).trim() : trimmed_title
}

export function buildCommitString({
  commit_state,
  config,
  colorize = false,
}: {
  commit_state: z.infer<typeof CommitState>
  config: z.infer<typeof Config>
  colorize: boolean
}): string {
  let commit_string = ''

  if (commit_state.type) {
    commit_string += colorize
      ? color.blue(commit_state.type)
      : commit_state.type
  }

  if (commit_state.scope) {
    const scope = colorize ? color.cyan(commit_state.scope) : commit_state.scope
    commit_string += `(${scope})`
  }

  if (
    commit_state.breaking_title &&
    config.breaking_change.add_exclamation_to_title
  ) {
    commit_string += colorize ? color.red('!') : '!'
  }

  if (commit_state.scope || commit_state.type) {
    commit_string += ': '
  }

  const position_start = config.check_ticket.title_position === 'start'
  const position_end = config.check_ticket.title_position === 'end'

  if (
    commit_state.ticket &&
    config.check_ticket.add_to_title &&
    position_start
  ) {
    commit_string += colorize
      ? color.magenta(commit_state.ticket) + ' '
      : commit_state.ticket + ' '
  }

  if (commit_state.title) {
    commit_string += colorize
      ? color.reset(commit_state.title)
      : commit_state.title
  }

  if (commit_state.ticket && config.check_ticket.add_to_title && position_end) {
    commit_string +=
      ' ' +
      (colorize ? color.magenta(commit_state.ticket) : commit_state.ticket)
  }

  if (commit_state.body) {
    const temp = commit_state.body.split('\\n') // literal \n, not new-line.
    const res = temp
      .map((v) => (colorize ? color.reset(v.trim()) : v.trim()))
      .join('\n')
    commit_string += colorize ? `\n\n${res}` : `\n\n${res}`
  }

  if (commit_state.breaking_title) {
    const title = colorize
      ? color.red(`BREAKING CHANGE: ${commit_state.breaking_title}`)
      : `BREAKING CHANGE: ${commit_state.breaking_title}`
    commit_string += `\n\n${title}`
  }

  if (commit_state.breaking_body) {
    const body = colorize
      ? color.red(commit_state.breaking_body)
      : commit_state.breaking_body
    commit_string += `\n\n${body}`
  }

  if (commit_state.deprecates_title) {
    const title = colorize
      ? color.yellow(`DEPRECATED: ${commit_state.deprecates_title}`)
      : `DEPRECATED: ${commit_state.deprecates_title}`
    commit_string += `\n\n${title}`
  }

  if (commit_state.deprecates_body) {
    const body = colorize
      ? color.yellow(commit_state.deprecates_body)
      : commit_state.deprecates_body
    commit_string += `\n\n${body}`
  }

  if (commit_state.custom_footer) {
    const temp = commit_state.custom_footer.split('\\n')
    const res = temp
      .map((v) => (colorize ? color.reset(v.trim()) : v.trim()))
      .join('\n')
    commit_string += colorize ? `\n\n${res}` : `\n\n${res}`
  }

  if (commit_state.closes && commit_state.ticket) {
    commit_string += colorize
      ? `\n\n${color.reset(commit_state.closes)} ${color.magenta(
          commit_state.ticket
        )}`
      : `\n\n${commit_state.closes} ${commit_state.ticket}`
  }

  return commit_string
}
