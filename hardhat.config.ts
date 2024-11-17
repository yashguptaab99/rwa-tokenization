import dotenv from 'dotenv'
import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import '@openzeppelin/hardhat-upgrades'
import 'hardhat-deploy'
import 'solidity-coverage'
import 'hardhat-gas-reporter'
import 'hardhat-contract-sizer'
import 'hardhat-abi-exporter'

dotenv.config()

const { MAINNET_RPC_URL, GOERLI_RPC_URL, PRIVATE_KEY, MNEMONIC, FORKING_BLOCK_NUMBER, ETHERSCAN_API_KEY, REPORT_GAS } =
    process.env

const config: HardhatUserConfig = {
    defaultNetwork: 'hardhat',
    networks: {
        hardhat: {
            forking: {
                url: MAINNET_RPC_URL ?? '',
                blockNumber: parseInt(FORKING_BLOCK_NUMBER ?? '2675000'),
                enabled: MAINNET_RPC_URL ? true : false,
            },
            chainId: 31337,
            allowUnlimitedContractSize: true,
        },
        localhost: {
            chainId: 31337,
        },
        goerli: {
            url: GOERLI_RPC_URL,
            accounts: PRIVATE_KEY ? [PRIVATE_KEY] : MNEMONIC ? { mnemonic: MNEMONIC } : [],
            chainId: 5,
        },
        mainnet: {
            url: MAINNET_RPC_URL,
            accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
            chainId: 1,
        },
    },
    solidity: {
        version: '0.8.24',
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
    },
    gasReporter: {
        enabled: REPORT_GAS === 'true',
        outputFile: 'gas-report.txt',
        noColors: true,
    },
    contractSizer: {
        runOnCompile: false,
        only: [],
    },
    abiExporter: {
        path: './abi',
        runOnCompile: true,
        clear: true,
        flat: true,
        spacing: 2,
    },
    mocha: {
        timeout: 200000,
    },
}

export default config
