/* eslint-disable no-console */
import { Contract } from 'ethers'
import { ethers } from 'hardhat'

async function main() {
    const TestContract = await ethers.getContractFactory('TestContract')
    console.log('Deploying TestContract...')

    const testContract = (await TestContract.deploy()) as Contract
    await testContract.deployed()

    console.log('TestContract deployed to:', testContract.address)
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
