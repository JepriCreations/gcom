module.exports = {
  git: {
    requireBranch: 'main',
    commitMessage: '🔖 chore: release v${version}',
  },
  hooks: {
    'before:init': ['npm test', 'git pull', 'pnpm lint'],
    'after:bump': 'pnpm build',
    'after:npm:release':
      'echo Successfully published ${name} v${version} to npm. 📦',
    'after:release':
      'echo Successfully released ${name} v${version} to ${repo.repository}. 🚀',
  },
  github: {
    release: true,
  },
  npm: {
    versionArgs: ['--allow-same-version', '--workspaces-update=false'],
    ignoreVersion: true,
  },
  plugins: {
    './scripts/index.js': {
      infile: 'CHANGELOG.md',
      preset: 'angular',
      parserOpts: {
        headerPattern: /^(\S*) (\w*)(?:\(([\w$.\-* ]*)\))?: (.*)$/,
        headerCorrespondence: ['emoji', 'type', 'scope', 'subject'],
      },
    },
  },
}