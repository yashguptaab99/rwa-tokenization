import { Test as TestContract } from '../../typechain-types'

import { ethers } from 'hardhat'

describe('TestContract Test Suit', async () => {
    let contract: TestContract

    before(async () => {
        const Test = await ethers.getContractFactory('Test')
        contract = await Test.deploy()
    })

    describe('test()', async () => {
        it('Should test successfully', async () => {
            await contract.test()
        })
    })
})
