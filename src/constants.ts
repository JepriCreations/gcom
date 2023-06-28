import { z } from 'zod'
import color from 'picocolors'

export const CONFIG_FILE_NAME = '.gcomrc'
export const SPACE_TO_SELECT = `${color.dim('(select with <space>)')}`
export const OPTIONAL_PROMPT = `${color.dim('(optional)')}`
export const CACHE_PROMPT = `${color.dim('(value will be saved)')}`
export const REGEX_SLASH_TAG = new RegExp(/\/(\w+-\d+)/)
export const REGEX_START_TAG = new RegExp(/^(\w+-\d+)/)
export const REGEX_SLASH_NUM = new RegExp(/\/(\d+)/)
export const REGEX_START_NUM = new RegExp(/^(\d+)/)
export const REGEX_START_UND = new RegExp(/^([A-Z]+-[[a-zA-Z\]\d]+)_/)
export const REGEX_SLASH_UND = new RegExp(/\/([A-Z]+-[[a-zA-Z\]\d]+)_/)

export const BREAKING_TYPES = ['feat', 'fix', 'hotfix']

export const DEFAULT_TYPE_OPTIONS = [
  {
    value: 'feat',
    label: 'feat',
    hint: 'A new feature',
    emoji: '🆕',
  },
  {
    value: 'fix',
    label: 'fix',
    hint: 'A bug fix',
    emoji: '🐛',
  },
  {
    value: 'refactor',
    label: 'refactor',
    hint: 'A code change that neither fixes a bug nor adds a feature',
    emoji: '♻️',
  },
  {
    value: 'perf',
    label: 'perf',
    hint: 'A code change that improves performance',
    emoji: '⚡',
  },
  {
    value: 'docs',
    label: 'docs',
    hint: 'Documentation only changes',
    emoji: '📝',
  },
  {
    value: 'style',
    label: 'style',
    hint: 'Changes that do not affect the meaning of the code',
    emoji: '💅',
  },
  {
    value: 'test',
    label: 'test',
    hint: 'Adding missing tests or correcting existing tests',
    emoji: '✅',
  },
  {
    value: 'int',
    label: 'int',
    hint: 'Changes that affect internationalization',
    emoji: '🌍',
  },
  {
    value: 'build',
    label: 'build',
    hint: 'Changes that affect the build system or external dependencies',
    emoji: '🏗️',
  },
  {
    value: 'ci',
    label: 'ci',
    hint: 'Changes to our CI configuration files and scripts',
    emoji: '🔧',
  },
  {
    value: 'clean',
    label: 'clean',
    hint: 'Removing unnecesary code or files',
    emoji: '🧹',
  },
  {
    value: 'hotfix',
    label: 'hotfix',
    hint: 'Critical hotfix',
    emoji: '🚑',
  },
  {
    value: 'initial',
    label: 'initial',
    hint: 'Initial commit',
    emoji: '🎉',
  },
]

export const DEFAULT_SCOPE_OPTIONS = [
  { value: 'app', label: 'app' },
  { value: 'shared', label: 'shared' },
  { value: 'server', label: 'server' },
  { value: 'tools', label: 'tools' },
  { value: '', label: 'none' },
]
export const COMMIT_FOOTER_OPTIONS = [
  {
    value: 'closes',
    label: 'closes <issue/ticket>',
    hint: 'Attempts to infer ticket from branch',
  },
  {
    value: 'breaking-change',
    label: 'breaking change',
    hint: 'Add breaking change',
  },
  { value: 'deprecated', label: 'deprecated', hint: 'Add deprecated change' },
  { value: 'custom', label: 'custom', hint: 'Add a custom footer' },
]

export const CUSTOM_SCOPE_KEY = 'custom'

export const Z_FOOTER_OPTIONS = z.enum([
  'closes',
  'breaking-change',
  'deprecated',
  'custom',
])
export const FOOTER_OPTION_VALUES: z.infer<typeof Z_FOOTER_OPTIONS>[] = [
  'closes',
  'breaking-change',
  'deprecated',
  'custom',
]
