module.exports = {
    norpc: true,
    testCommand: 'yarn test',
    compileCommand: 'yarn compile',
    providerOptions: {
        default_balance_ether: '10000000000000000000000000',
        total_accounts: 20,
    },
    skipFiles: ['utils', 'interfaces', 'lib', 'mocks', 'proxies'],
}
