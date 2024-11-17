// test/Payout.test.ts

import { Payout, MockERC20 } from '../../typechain-types'

import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers'
import { expect } from 'chai'
import { ethers } from 'hardhat'

describe('Payout Contract Test Suite', function () {
    let payout: Payout
    let mockERC20: MockERC20
    let owner: SignerWithAddress
    let distributor: SignerWithAddress
    let user1: SignerWithAddress
    let user2: SignerWithAddress
    let user3: SignerWithAddress
    let otherUser: SignerWithAddress

    const DISTRIBUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes('DISTRIBUTOR_ROLE'))
    const initialERC20Supply = ethers.parseEther('10000')

    before(async function () {
        ;[owner, distributor, user1, user2, user3, otherUser] = await ethers.getSigners()

        // Deploy Payout contract
        const PayoutFactory = await ethers.getContractFactory('Payout')
        payout = await PayoutFactory.deploy()

        // Deploy MockERC20 token
        const MockERC20Factory = await ethers.getContractFactory('MockERC20')
        mockERC20 = await MockERC20Factory.deploy('MockToken', 'MTK', initialERC20Supply)

        // Transfer some tokens to the payout contract
        await mockERC20.transfer(await payout.getAddress(), ethers.parseEther('1000'))

        // Grant DISTRIBUTOR_ROLE to distributor
        await payout.grantRole(DISTRIBUTOR_ROLE, distributor.address)
    })

    describe('Deployment', function () {
        it('Should assign DEFAULT_ADMIN_ROLE and DISTRIBUTOR_ROLE to deployer', async function () {
            expect(await payout.hasRole(await payout.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true
            expect(await payout.hasRole(DISTRIBUTOR_ROLE, owner.address)).to.be.true
        })
    })

    describe('Access Control', function () {
        it('Distributor can distribute payouts', async function () {
            const investors = [user1.address, user2.address]
            const payouts = [ethers.parseEther('1'), ethers.parseEther('2')]

            // Deposit ETH into the contract
            await owner.sendTransaction({
                to: await payout.getAddress(),
                value: ethers.parseEther('3'),
            })

            const initialBalanceUser1 = await ethers.provider.getBalance(user1.address)
            const initialBalanceUser2 = await ethers.provider.getBalance(user2.address)

            await expect(
                payout.connect(distributor).distribute(
                    '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // Native token
                    investors,
                    payouts
                )
            )
                .to.emit(payout, 'PayoutDistributed')
                .withArgs('0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', distributor.address, ethers.parseEther('3'), 2)

            const finalBalanceUser1 = await ethers.provider.getBalance(user1.address)
            const finalBalanceUser2 = await ethers.provider.getBalance(user2.address)

            expect(finalBalanceUser1 - initialBalanceUser1).to.equal(ethers.parseEther('1'))
            expect(finalBalanceUser2 - initialBalanceUser2).to.equal(ethers.parseEther('2'))
        })

        it('Non-distributor cannot distribute payouts', async function () {
            const investors = [user1.address]
            const payouts = [ethers.parseEther('1')]

            await expect(
                payout.connect(otherUser).distribute('0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', investors, payouts)
            ).to.be.revertedWithCustomError(payout, 'AccessControlUnauthorizedAccount')
        })
    })

    describe('Distribution of Native Tokens', function () {
        it('Should distribute native tokens to investors', async function () {
            const investors = [user1.address, user2.address, user3.address]
            const payouts = [ethers.parseEther('1'), ethers.parseEther('2'), ethers.parseEther('3')]

            // Deposit ETH into the contract
            await owner.sendTransaction({
                to: await payout.getAddress(),
                value: ethers.parseEther('6'),
            })

            const initialBalances = await Promise.all(investors.map((addr) => ethers.provider.getBalance(addr)))

            await expect(
                payout.connect(distributor).distribute('0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', investors, payouts)
            )
                .to.emit(payout, 'PayoutDistributed')
                .withArgs('0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', distributor.address, ethers.parseEther('6'), 3)

            const finalBalances = await Promise.all(investors.map((addr) => ethers.provider.getBalance(addr)))

            for (let i = 0; i < investors.length; i++) {
                expect(finalBalances[i] - initialBalances[i]).to.equal(payouts[i])
            }
        })

        it('Should revert if contract has insufficient balance', async function () {
            const investors = [user1.address]
            const payouts = [ethers.parseEther('10')] // Exceeds contract balance

            await expect(
                payout.connect(distributor).distribute('0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', investors, payouts)
            ).to.be.revertedWith('Insufficient contract balance')
        })
    })

    describe('Distribution of ERC20 Tokens', function () {
        it('Should distribute ERC20 tokens to investors', async function () {
            const investors = [user1.address, user2.address]
            const payouts = [ethers.parseEther('100'), ethers.parseEther('200')]

            const initialBalances = await Promise.all(investors.map((addr) => mockERC20.balanceOf(addr)))

            await expect(payout.connect(distributor).distribute(await mockERC20.getAddress(), investors, payouts))
                .to.emit(payout, 'PayoutDistributed')
                .withArgs(await mockERC20.getAddress(), distributor.address, ethers.parseEther('300'), 2)

            const finalBalances = await Promise.all(investors.map((addr) => mockERC20.balanceOf(addr)))

            for (let i = 0; i < investors.length; i++) {
                expect(finalBalances[i] - initialBalances[i]).to.equal(payouts[i])
            }
        })

        it('Should revert if contract has insufficient token balance', async function () {
            const investors = [user1.address]
            const payouts = [ethers.parseEther('2000')] // Exceeds contract token balance

            await expect(
                payout.connect(distributor).distribute(await mockERC20.getAddress(), investors, payouts)
            ).to.be.revertedWith('Insufficient contract token balance')
        })
    })

    describe('Edge Cases and Error Handling', function () {
        it('Should revert on mismatched array lengths', async function () {
            const investors = [user1.address]
            const payouts = [ethers.parseEther('1'), ethers.parseEther('2')]

            await expect(
                payout.connect(distributor).distribute('0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', investors, payouts)
            ).to.be.revertedWith('Investors and payouts length mismatch')
        })

        it('Should revert if no investors provided', async function () {
            const investors: string[] = []
            const payouts: bigint[] = []

            await expect(
                payout.connect(distributor).distribute('0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', investors, payouts)
            ).to.be.revertedWith('No investors provided')
        })

        it('Should revert if payout amount is zero', async function () {
            const investors = [user1.address]
            const payouts = [0n]

            await expect(
                payout.connect(distributor).distribute('0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', investors, payouts)
            ).to.be.revertedWith('Amount must be greater than zero')
        })

        it('Should revert if investor address is zero address', async function () {
            const investors = [ethers.ZeroAddress]
            const payouts = [ethers.parseEther('1')]

            await owner.sendTransaction({
                to: await payout.getAddress(),
                value: ethers.parseEther('1'),
            })

            await expect(
                payout.connect(distributor).distribute('0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', investors, payouts)
            ).to.be.revertedWith('Transfer to zero address')
        })
    })
})
