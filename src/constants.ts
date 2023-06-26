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
export const REGEX_START_UND = new RegExp(/^([A-Z]+-[\[a-zA-Z\]\d]+)_/)
export const REGEX_SLASH_UND = new RegExp(/\/([A-Z]+-[\[a-zA-Z\]\d]+)_/)

export const DEFAULT_TYPE_OPTIONS = [
  {
    value: 'refactor',
    label: 'refactor',
    hint: 'A general code change that does not add a feature or fix a bug.',
    emoji: '🔨',
  },
  {
    value: 'feat',
    label: 'feat',
    hint: 'Add new feature',
    emoji: '✨',
  },
  {
    value: 'fix',
    label: 'fix',
    hint: 'Fixing a bug',
    emoji: '🐛',
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
    hint: 'Add or update documentation',
    emoji: '📚',
  },
  {
    value: 'format',
    label: 'format',
    hint: 'Updating the UI and style files.',
    emoji: '💅',
  },
  {
    value: 'test',
    label: 'test',
    hint: 'Adding or updating tests',
    emoji: '✅',
  },
  {
    value: 'translation',
    label: 'translation',
    hint: 'Changes in translation files',
    emoji: '🌍',
  },
  {
    value: 'build',
    label: 'build',
    hint: 'Changes that affect the build system or external dependencies',
    emoji: '🚧',
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
