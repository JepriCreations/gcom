import * as p from '@clack/prompts'
import color from 'picocolors'
import { z } from 'zod'
import { trytm } from '@bdsqqq/try'

import { CommitState, Config } from './validations'
import {
  addNewLine,
  buildCommitString,
  cleanCommitTitle,
  exitProgram,
  inferTypeFromBranch,
  loadSetup,
} from './utils'
import {
  getChangedFiles,
  getCurrentBranchName,
  getStagedFiles,
  gitAdd,
  gitCommit,
  gitPush,
} from './git'
import {
  BREAKING_TYPES,
  COMMIT_FOOTER_OPTIONS,
  CONFIG_FILE_NAME,
  CUSTOM_SCOPE_KEY,
  OPTIONAL_PROMPT,
  REGEX_SLASH_NUM,
  REGEX_SLASH_TAG,
  REGEX_SLASH_UND,
  REGEX_START_NUM,
  REGEX_START_TAG,
  REGEX_START_UND,
  SPACE_TO_SELECT,
  Z_FOOTER_OPTIONS,
} from './constants'

main()

export async function main() {
  const config: z.infer<typeof Config> = await loadSetup()

  const commit_state = CommitState.parse({})
  const [changed_files, error_changed_files] = await trytm(getChangedFiles())
  const [staged_files, error_staged_files] = await trytm(getStagedFiles())
  const git_status = { changed_files, staged_files }
  let breakingChange = false

  // STATUS CHECK
  if (config.check_status) {
    p.log.step(color.black(color.bgGreen(' Checking Git Status ')))

    if (error_changed_files ?? error_staged_files) {
      exitProgram({
        message: 'Error: please check that you are in a git directory.',
      })
    }

    if (staged_files.length > 0) {
      const files = staged_files.reduce(
        (prev, curr, i) =>
          color.green(prev + curr + addNewLine(staged_files, i)),
        ''
      )
      p.log.success('Changes to be committed:\n' + files)
    }

    const missing_staged =
      changed_files.length > 0 &&
      changed_files.some((file) => !staged_files.includes(file))

    if (missing_staged) {
      const addAll = {
        value: 'all',
        label: 'Add all',
      }

      const unstaged_files = changed_files.filter(
        (f) => !staged_files.includes(f)
      )

      const options = unstaged_files.map((file) => ({
        value: file,
        label: file,
      }))
      options.unshift(addAll)

      const files = (await p.multiselect({
        message: `There are files that have not been staged. Select the ones you want to add. ${SPACE_TO_SELECT}`,
        options,
        required: staged_files.length === 0,
      })) as string[]

      if (p.isCancel(files)) exitProgram()

      const filesToAdd = files.includes(addAll.value) ? unstaged_files : files

      await gitAdd({ files: filesToAdd })
      git_status.staged_files = staged_files.concat(filesToAdd)
    }
  }

  if (
    error_staged_files ||
    !git_status.staged_files ||
    !git_status.staged_files.length
  ) {
    p.log.error(
      color.red(
        'No changes added to commit (use "git add" and/or "git commit -a")'
      )
    )
    exitProgram()
  }

  // COMMIT TYPE
  if (config.commit_type.enable) {
    p.log.step(color.black(color.bgGreen(' Preparing Commit ')))
    let initial_value = config.commit_type.initial_value

    if (config.commit_type.infer_type_from_branch) {
      const options = config.commit_type.options.map((opt) => opt.value)
      const type_from_branch = await inferTypeFromBranch(options)
      if (type_from_branch) {
        initial_value = type_from_branch
      }
    }

    const commit_type = await p.select({
      message: 'Select a commit type',
      initialValue: initial_value,
      options: config.commit_type.options.map(
        ({ value, label, emoji, hint }) => ({
          value,
          label: config.commit_type.emojis ? `${emoji} ${label}` : label,
          hint: hint,
        })
      ),
    })

    if (p.isCancel(commit_type)) exitProgram()

    if (BREAKING_TYPES.includes(commit_type)) {
      breakingChange = (await p.confirm({
        initialValue: false,
        message: color.yellow(
          'Does this commit have changes that break previous compatibility?'
        ),
      })) as boolean

      if (p.isCancel(breakingChange)) exitProgram()
    }

    const emoji =
      config.commit_type.options.find((opt) => opt.value === commit_type)
        ?.emoji ?? ''

    commit_state.type = config.commit_type.emojis
      ? `${emoji} ${commit_type}`
      : commit_type
  }

  // COMMIT SCOPE
  if (config.commit_scope.enable) {
    let commit_scope = await p.select({
      message: 'Select a commit scope',
      initialValue: config.commit_scope.initial_value,
      options: config.commit_scope.options,
    })
    if (p.isCancel(commit_scope)) exitProgram()

    if (commit_scope === CUSTOM_SCOPE_KEY && config.commit_scope.custom_scope) {
      commit_scope = await p.text({
        message: 'Write a custom scope',
        placeholder: '',
      })
      if (p.isCancel(commit_scope)) exitProgram()
    }
    commit_state.scope = commit_scope
  }

  // COMMIT TICKET
  if (config.check_ticket.infer_ticket) {
    const [branch, branch_error] = await trytm(getCurrentBranchName())

    if (branch_error) return ''

    const found: string[] = [
      branch.match(REGEX_START_UND),
      branch.match(REGEX_SLASH_UND),
      branch.match(REGEX_SLASH_TAG),
      branch.match(REGEX_SLASH_NUM),
      branch.match(REGEX_START_TAG),
      branch.match(REGEX_START_NUM),
    ]
      .filter((v) => v != null)
      .map((v) => (v && v.length >= 2 ? v[1] : ''))

    if (found.length && found[0]) {
      commit_state.ticket = config.check_ticket.append_hashtag
        ? '#' + found[0]
        : found[0]
    }

    if (config.check_ticket.confirm_ticket) {
      const user_commit_ticket = await p.text({
        message: commit_state.ticket
          ? `Ticket / issue inferred from branch ${color.dim(
              '(confirm / edit)'
            )}`
          : `Add ticket / issue ${OPTIONAL_PROMPT}`,
        placeholder: '',
        initialValue: commit_state.ticket,
      })
      if (p.isCancel(user_commit_ticket)) process.exit(0)

      commit_state.ticket = user_commit_ticket ?? ''
    }
  }

  // COMMIT TITLE
  const commit_title = await p.text({
    message: 'Write a brief title describing the commit:',
    placeholder: '',
    validate: (value) => {
      if (value.length === 0) return color.red("The title can't be empty")

      const commit_scope_size = commit_state.scope
        ? commit_state.scope.length + 2
        : 0
      const commit_type_size = commit_state.type.length
      const commit_ticket_size = config.check_ticket.add_to_title
        ? commit_state.ticket.length
        : 0

      if (
        commit_scope_size +
          commit_type_size +
          commit_ticket_size +
          value.length >
        config.commit_title.max_size
      )
        return color.red(
          `Exceeded max length. Title max [${config.commit_title.max_size}] characteres.`
        )
    },
  })
  if (p.isCancel(commit_title)) exitProgram()

  commit_state.title = cleanCommitTitle(commit_title)

  // COMMIT BODY
  if (config.commit_body.enable) {
    const commit_body = await p.text({
      message: `Write a detailed description of the changes ${OPTIONAL_PROMPT}`,
      placeholder: '',
      validate: (val) => {
        if (config.commit_body.required && val.length === 0)
          return color.red(
            `The description is required. You can change this in the ${CONFIG_FILE_NAME}`
          )
      },
    })
    if (p.isCancel(commit_body)) exitProgram()

    commit_state.body = commit_body ?? ''
  }

  // COMMIT FOOTER
  if (config.commit_footer.enable || breakingChange) {
    let commit_footer = null
    if (breakingChange) {
      commit_footer = Z_FOOTER_OPTIONS.Enum['breaking-change']
    } else {
      commit_footer = await p.multiselect({
        message: `Select optional footers ${SPACE_TO_SELECT}`,
        initialValues: config.commit_footer.initial_value,
        options: COMMIT_FOOTER_OPTIONS as {
          value: z.infer<typeof Z_FOOTER_OPTIONS>
          label: string
          hint: string
        }[],
        required: false,
      })
    }
    if (p.isCancel(commit_footer)) exitProgram()

    if (commit_footer.includes('breaking-change')) {
      const breaking_changes_title = await p.text({
        message: 'Breaking changes: Write a short title / summary',
        placeholder: '',
        validate: (value) => {
          if (value.length === 0) return 'A title / summary is required'
        },
      })
      if (p.isCancel(breaking_changes_title)) exitProgram()

      const breaking_changes_body = await p.text({
        message: `Breaking Changes: Write a description & migration instructions ${OPTIONAL_PROMPT}`,
        placeholder: '',
      })
      if (p.isCancel(breaking_changes_body)) exitProgram()

      commit_state.breaking_title = breaking_changes_title
      commit_state.breaking_body = breaking_changes_body
    }

    if (commit_footer.includes('deprecated')) {
      const deprecated_title = await p.text({
        message: 'Deprecated: Write a short title / summary',
        placeholder: '',
        validate: (value) => {
          if (value.length === 0) return 'A title / summary is required'
        },
      })
      if (p.isCancel(deprecated_title)) exitProgram()

      const deprecated_body = await p.text({
        message: `Deprecated: Write a description ${OPTIONAL_PROMPT}`,
        placeholder: '',
      })
      if (p.isCancel(deprecated_body)) exitProgram()

      commit_state.deprecates_body = deprecated_body
      commit_state.deprecates_title = deprecated_title
    }

    if (commit_footer.includes('closes')) {
      commit_state.closes = 'Closes:'
    }

    if (commit_footer.includes('custom')) {
      const custom_footer = await p.text({
        message: 'Write a custom footer',
        placeholder: '',
      })
      if (p.isCancel(custom_footer)) exitProgram()

      commit_state.custom_footer = custom_footer
    }
  }

  // PREVIEW AND CONFIRM
  let continue_commit = true
  p.note(
    buildCommitString({ commit_state, config, colorize: true }),
    'Commit Preview'
  )

  if (config.confirm_commit) {
    continue_commit = (await p.confirm({
      initialValue: true,
      message: 'Confirm Commit?',
    })) as boolean
    if (p.isCancel(continue_commit)) exitProgram()
  }

  if (!continue_commit) {
    p.log.info('Exiting without commit')
    process.exit(0)
  }

  const commit = buildCommitString({ commit_state, config, colorize: false })
    .toString()
    .trim()
  const [output, output_error] = await trytm(gitCommit({ commit }))

  if (output_error) {
    p.log.error('Something went wrong when committing: ' + output_error.message)
  }

  if (config.print_commit_output && output) {
    const { changed, insertions, deletions } = output.changes
    const formatedOutput = `${output.title}
    ${changed ? `${color.blue(changed)}` : ''} ${
      insertions ? `, ${color.green(insertions)}` : ''
    } ${deletions ? `, ${color.red(deletions)}` : ''}
    `
    p.log.info(formatedOutput)
  }

  // PUSH CHANGES
  if (config.push.enable && !breakingChange) {
    p.log.step(color.black(color.bgGreen(' Ready to push ')))
    let continue_push = true

    if (config.push.confirm) {
      continue_push = (await p.confirm({
        initialValue: true,
        message: 'Do you want to push your changes now?',
      })) as boolean
      if (p.isCancel(continue_push)) exitProgram()
    }

    if (!continue_push) {
      p.log.info('Exiting without pushing')
      process.exit(0)
    }
    const [branch] = await trytm(getCurrentBranchName())
    const s = p.spinner()
    s.start(`Pushing your changes to ${branch}`)
    const [, push_error] = await trytm(gitPush())
    if (push_error) {
      p.log.error('Something went wrong when pushing: ' + push_error.message)
      exitProgram()
    }
    s.stop(color.green('The changes has been pushed 🥳'))
  }
}
