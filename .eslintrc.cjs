module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
    rules: {
        'react/jsx-uses-react': 'off',
        'react/react-in-jsx-scope': 'off',
        '@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': 'allow-with-description' }],
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-empty-function': 'off',

        // https://github.com/typescript-eslint/typescript-eslint/issues/2063#issuecomment-675156492
        '@typescript-eslint/ban-types': [
            'error',
            {
                'extendDefaults': true,
                'types': {
                    '{}': false
                }
            }
        ]
    },
    globals: {
        chrome: true,
        window: true,
    },
};
