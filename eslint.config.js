const browserGlobals = Object.fromEntries([
  'window', 'document', 'location', 'innerWidth', 'innerHeight', 'matchMedia',
  'performance', 'requestAnimationFrame', 'cancelAnimationFrame',
  'addEventListener', 'setTimeout', 'clearTimeout', 'URLSearchParams',
].map(name => [name, 'readonly']));

export default [{
  files: ['src/**/*.js'],
  languageOptions: { globals: browserGlobals },
  rules: {
    'no-undef': 'error',
    'no-unused-vars': ['error', { args: 'all', argsIgnorePattern: '^_' }],
    'no-unreachable': 'error',
    'no-dupe-keys': 'error',
  },
}];
