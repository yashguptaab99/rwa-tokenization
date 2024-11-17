// test/DealToken.test.ts

import { DealToken } from '../../typechain-types'

import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'
import { expect } from 'chai'
import { ethers } from 'hardhat'

describe('DealToken Contract Test Suite', function () {
    let dealToken: DealToken
    let owner: HardhatEthersSigner
    let minter: HardhatEthersSigner
    let user: HardhatEthersSigner
    let otherUser: HardhatEthersSigner

    const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'))

    before(async function () {
        ;[owner, minter, user, otherUser] = await ethers.getSigners()

        const DealTokenFactory = await ethers.getContractFactory('DealToken')
        dealToken = await DealTokenFactory.deploy()
    })

    describe('Deployment', function () {
        it('Should assign DEFAULT_ADMIN_ROLE to the deployer', async function () {
            const hasAdminRole = await dealToken.hasRole(await dealToken.DEFAULT_ADMIN_ROLE(), owner.address)
            expect(hasAdminRole).to.be.true
        })

        it('Should have correct name and symbol', async function () {
            expect(await dealToken.name()).to.equal('DealToken')
            expect(await dealToken.symbol()).to.equal('DLT')
        })
    })

    describe('Access Control', function () {
        it('Deployer should be able to grant MINTER_ROLE', async function () {
            await expect(dealToken.connect(owner).grantRole(MINTER_ROLE, minter.address))
                .to.emit(dealToken, 'RoleGranted')
                .withArgs(MINTER_ROLE, minter.address, owner.address)

            const hasMinterRole = await dealToken.hasRole(MINTER_ROLE, minter.address)
            expect(hasMinterRole).to.be.true
        })

        it('Non-admin should not be able to grant roles', async function () {
            await expect(dealToken.connect(user).grantRole(MINTER_ROLE, await user.getAddress()))
                .to.be.revertedWithCustomError(dealToken, 'AccessControlUnauthorizedAccount')
                .withArgs(await user.getAddress(), await dealToken.DEFAULT_ADMIN_ROLE())
        })

        it('Admin can revoke roles', async function () {
            await dealToken.connect(owner).revokeRole(MINTER_ROLE, minter.address)
            const hasMinterRole = await dealToken.hasRole(MINTER_ROLE, minter.address)
            expect(hasMinterRole).to.be.false
        })
    })

    describe('Minting Tokens', function () {
        before(async function () {
            // Grant MINTER_ROLE to minter again for minting tests
            await dealToken.connect(owner).grantRole(MINTER_ROLE, minter.address)
        })

        it('Only MINTER_ROLE can mint tokens', async function () {
            await expect(dealToken.connect(user).mint(await user.getAddress(), ethers.parseEther('100')))
                .to.be.revertedWithCustomError(dealToken, 'AccessControlUnauthorizedAccount')
                .withArgs(await user.getAddress(), MINTER_ROLE)
        })

        it('Minter can mint tokens to a user', async function () {
            const mintAmount = ethers.parseEther('1000')
            await expect(dealToken.connect(minter).mint(user.address, mintAmount))
                .to.emit(dealToken, 'Transfer')
                .withArgs(ethers.ZeroAddress, user.address, mintAmount)

            const userBalance = await dealToken.balanceOf(user.address)
            expect(userBalance).to.equal(mintAmount)

            const totalSupply = await dealToken.totalSupply()
            expect(totalSupply).to.equal(mintAmount)
        })
    })

    describe('Transfer Restrictions', function () {
        it('Should not allow transfers between addresses', async function () {
            await expect(
                dealToken.connect(user).transfer(otherUser.address, ethers.parseEther('10'))
            ).to.be.revertedWith('Transfers are disabled')
        })

        it('Should not allow transferFrom between addresses', async function () {
            await expect(dealToken.connect(user).approve(otherUser.address, ethers.parseEther('10')))
                .to.emit(dealToken, 'Approval')
                .withArgs(user.address, otherUser.address, ethers.parseEther('10'))

            await expect(
                dealToken.connect(otherUser).transferFrom(user.address, otherUser.address, ethers.parseEther('10'))
            ).to.be.revertedWith('Transfers are disabled')
        })
    })

    describe('Edge Cases', function () {
        it('Cannot mint tokens to the zero address', async function () {
            await expect(dealToken.connect(minter).mint(ethers.ZeroAddress, ethers.parseEther('100')))
                .to.be.revertedWithCustomError(dealToken, 'ERC20InvalidReceiver')
                .withArgs(ethers.ZeroAddress)
        })
    })
})
