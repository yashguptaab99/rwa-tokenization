import { Crowdsale, DealToken, MockERC20 } from '../../typechain-types'

import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'
import { expect } from 'chai'
import { ethers } from 'hardhat'

describe('Crowdsale Contract Test Suite', function () {
    let crowdsale: Crowdsale
    let dealToken: DealToken
    let acceptedERC20: MockERC20
    let owner: HardhatEthersSigner
    let admin: HardhatEthersSigner
    let user: HardhatEthersSigner
    let otherUser: HardhatEthersSigner
    let fundsReceiver: HardhatEthersSigner

    const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes('ADMIN_ROLE'))
    const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'))
    const pricePerToken = ethers.parseEther('1') // 1 ETH per token
    const initialERC20Supply = ethers.parseEther('10000')

    before(async function () {
        ;[owner, admin, user, otherUser, fundsReceiver] = await ethers.getSigners()

        // Deploy DealToken
        const DealTokenFactory = await ethers.getContractFactory('DealToken')
        dealToken = await DealTokenFactory.deploy()

        // Grant MINTER_ROLE to owner (we'll transfer it to Crowdsale later)
        await dealToken.grantRole(MINTER_ROLE, owner.address)

        // Deploy MockERC20 (accepted ERC20 token)
        const MockERC20Factory = await ethers.getContractFactory('MockERC20')
        acceptedERC20 = await MockERC20Factory.deploy('MockToken', 'MTK', initialERC20Supply)

        // Transfer some ERC20 tokens to user and otherUser
        await acceptedERC20.transfer(user.address, ethers.parseEther('1000'))
        await acceptedERC20.transfer(otherUser.address, ethers.parseEther('1000'))

        // Deploy Crowdsale
        const CrowdsaleFactory = await ethers.getContractFactory('Crowdsale')
        crowdsale = await CrowdsaleFactory.deploy(
            dealToken.getAddress(),
            '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // Start with native currency (ETH)
            pricePerToken,
            fundsReceiver.address
        )

        // Grant MINTER_ROLE to Crowdsale contract
        await dealToken.grantRole(MINTER_ROLE, crowdsale.getAddress())
    })

    describe('Deployment', function () {
        it('Should set correct parameters upon deployment', async function () {
            expect(await crowdsale.dealToken()).to.equal(await dealToken.getAddress())
            expect(await crowdsale.acceptedCurrency()).to.equal('0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE')
            expect(await crowdsale.pricePerToken()).to.equal(pricePerToken)
            expect(await crowdsale.fundsReceiver()).to.equal(fundsReceiver.address)
        })

        it('Deployer should have DEFAULT_ADMIN_ROLE and ADMIN_ROLE', async function () {
            expect(await crowdsale.hasRole(await crowdsale.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true
            expect(await crowdsale.hasRole(ADMIN_ROLE, owner.address)).to.be.true
        })
    })

    describe('Access Control', function () {
        it('Owner can grant ADMIN_ROLE to admin', async function () {
            await expect(crowdsale.connect(owner).grantRole(ADMIN_ROLE, admin.address))
                .to.emit(crowdsale, 'RoleGranted')
                .withArgs(ADMIN_ROLE, admin.address, owner.address)

            expect(await crowdsale.hasRole(ADMIN_ROLE, admin.address)).to.be.true
        })

        it('Non-admin cannot grant roles', async function () {
            await expect(crowdsale.connect(user).grantRole(ADMIN_ROLE, user.address)).to.be.revertedWithCustomError(
                crowdsale,
                'AccessControlUnauthorizedAccount'
            )
        })

        it('Admin can revoke roles', async function () {
            await crowdsale.connect(owner).revokeRole(ADMIN_ROLE, admin.address)
            expect(await crowdsale.hasRole(ADMIN_ROLE, admin.address)).to.be.false
        })
    })

    describe('Purchasing Tokens with Native Currency (ETH)', function () {
        it('User can purchase tokens with ETH', async function () {
            const amountToBuy = ethers.parseEther('10')
            const totalCost = (amountToBuy * pricePerToken) / ethers.parseEther('1')
            const fundsReceiverBalance = await ethers.provider.getBalance(fundsReceiver.address)

            await expect(crowdsale.connect(user).buyTokens(amountToBuy, { value: totalCost }))
                .to.emit(crowdsale, 'TokensPurchased')
                .withArgs(user.address, totalCost, amountToBuy)

            expect(await dealToken.balanceOf(user.address)).to.equal(amountToBuy)
            expect(await ethers.provider.getBalance(fundsReceiver.address)).to.equal(fundsReceiverBalance + totalCost)
        })

        it('Should revert if incorrect ETH amount sent', async function () {
            const amountToBuy = ethers.parseEther('5')
            const totalCost = (amountToBuy * pricePerToken) / ethers.parseEther('1')

            await expect(crowdsale.connect(user).buyTokens(amountToBuy, { value: totalCost - 1n })).to.be.revertedWith(
                'Incorrect ETH value sent'
            )
        })

        it('Should revert if amountToBuy is zero', async function () {
            await expect(crowdsale.connect(user).buyTokens(0, { value: 0 })).to.be.revertedWith(
                'Amount to buy must be greater than zero'
            )
        })
    })

    describe('Purchasing Tokens with ERC20 Token', function () {
        before(async function () {
            // Set accepted currency to ERC20 token
            await crowdsale.connect(owner).setAcceptedCurrency(await acceptedERC20.getAddress())
        })

        it('User can purchase tokens with ERC20 token', async function () {
            const amountToBuy = ethers.parseEther('10')
            const totalCost = (amountToBuy * pricePerToken) / ethers.parseEther('1')
            await acceptedERC20.connect(user).approve(await crowdsale.getAddress(), totalCost)

            await expect(crowdsale.connect(user).buyTokens(amountToBuy))
                .to.emit(crowdsale, 'TokensPurchased')
                .withArgs(user.address, totalCost, amountToBuy)

            expect(await dealToken.balanceOf(user.address)).to.equal(ethers.parseEther('20')) // Previous 10 + new 10
            expect(await acceptedERC20.balanceOf(fundsReceiver.address)).to.equal(totalCost)
        })

        it('Should revert if user has insufficient allowance', async function () {
            const amountToBuy = ethers.parseEther('5')
            const totalCost = (amountToBuy * pricePerToken) / ethers.parseEther('1')

            await acceptedERC20.connect(user).approve(await crowdsale.getAddress(), totalCost - ethers.parseEther('1'))

            await expect(crowdsale.connect(user).buyTokens(amountToBuy)).to.be.revertedWith('Insufficient allowance')
        })

        it('Should revert if user has insufficient balance', async function () {
            const amountToBuy = ethers.parseEther('10000') // Exceeds user's balance
            await acceptedERC20.connect(user).approve(await crowdsale.getAddress(), ethers.parseEther('100000'))

            await expect(crowdsale.connect(user).buyTokens(amountToBuy)).to.be.revertedWith('Insufficient balance')
        })
    })

    describe('Administrative Functions', function () {
        it('Admin can set accepted currency', async function () {
            await crowdsale.connect(owner).setAcceptedCurrency('0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE')
            expect(await crowdsale.acceptedCurrency()).to.equal('0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE')
        })

        it('Non-admin cannot set accepted currency', async function () {
            await expect(
                crowdsale.connect(user).setAcceptedCurrency(await acceptedERC20.getAddress())
            ).to.be.revertedWithCustomError(crowdsale, 'AccessControlUnauthorizedAccount')
        })

        it('Admin can set price per token', async function () {
            const newPrice = ethers.parseEther('2')
            await crowdsale.connect(owner).setPricePerToken(newPrice)
            expect(await crowdsale.pricePerToken()).to.equal(newPrice)
        })

        it('Should revert if price per token is zero', async function () {
            await expect(crowdsale.connect(owner).setPricePerToken(0)).to.be.revertedWith(
                'Price per token must be greater than zero'
            )
        })

        it('Admin can set funds receiver', async function () {
            await crowdsale.connect(owner).setFundsReceiver(otherUser.address)
            expect(await crowdsale.fundsReceiver()).to.equal(otherUser.address)
        })

        it('Should revert if funds receiver is zero address', async function () {
            await expect(crowdsale.connect(owner).setFundsReceiver(ethers.ZeroAddress)).to.be.revertedWith(
                'Invalid funds receiver address'
            )
        })
    })

    // describe('Reentrancy Protection', function () {
    //     it('Should prevent reentrancy attacks', async function () {
    //         // Assuming we have a malicious contract trying to re-enter
    //         // For this test, we can ensure that the nonReentrant modifier is in place
    //         // Detailed reentrancy tests would require additional setup
    //         expect(crowdsale.buyTokens).to.be.haveOwnProperty('__revertedWith')
    //     })
    // })

    describe('Edge Cases', function () {
        it('Should revert if dealToken minting fails', async function () {
            await crowdsale.connect(owner).setAcceptedCurrency(await acceptedERC20.getAddress())
            await dealToken.connect(owner).revokeRole(MINTER_ROLE, await crowdsale.getAddress())
            const amountToBuy = ethers.parseEther('1')
            const totalCost = (amountToBuy * (await crowdsale.pricePerToken())) / ethers.parseEther('1')
            await acceptedERC20.connect(user).approve(await crowdsale.getAddress(), totalCost)

            await expect(crowdsale.connect(user).buyTokens(amountToBuy)).to.be.revertedWithCustomError(
                dealToken,
                'AccessControlUnauthorizedAccount'
            )

            await dealToken.connect(owner).grantRole(MINTER_ROLE, await crowdsale.getAddress())
        })

        it('Should handle large token purchases correctly', async function () {
            const amountToBuy = ethers.parseEther('1000')
            const totalCost = (amountToBuy * (await crowdsale.pricePerToken())) / ethers.parseEther('1')
            await acceptedERC20.connect(owner).transfer(user.address, totalCost)
            await acceptedERC20.connect(user).approve(await crowdsale.getAddress(), totalCost)

            await expect(crowdsale.connect(user).buyTokens(amountToBuy))
                .to.emit(crowdsale, 'TokensPurchased')
                .withArgs(user.address, totalCost, amountToBuy)

            expect(await dealToken.balanceOf(user.address)).to.equal(ethers.parseEther('1020')) // Previous balance + new tokens
        })
    })
})
