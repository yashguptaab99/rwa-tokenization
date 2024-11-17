// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./lib//CurrencyTransferLib.sol";


/**
 * @title Payout
 * @dev Contract module which allows distribution of payouts to investors. This contract is
 *      designed to be used with an access control mechanism, where only accounts with the
 *      DISTRIBUTOR_ROLE can distribute payouts. It also includes reentrancy protection.
 *
 * @notice The contract supports both native tokens and ERC20 tokens for payouts.
 *
 * @dev Inherits from:
 *      - AccessControl: Provides role-based access control mechanisms.
 *      - ReentrancyGuard: Protects against reentrant calls.
 *
 * @dev Events:
 *      - PayoutDistributed: Emitted when a payout is successfully distributed.
 *
 * @dev Roles:
 *      - DISTRIBUTOR_ROLE: Role identifier for the distributor role.
 *
 * @dev Functions:
 *      - distribute: Distributes payouts to a list of investors.
 *      - receive: Allows the contract to receive native tokens.
 */
contract Payout is AccessControl, ReentrancyGuard {
		/**
		 * @dev Role identifier for the distributor role.
		 */
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");

		/**
		 * @dev Emitted when a payout is distributed.
		 * @param token The address of the token being distributed.
		 * @param distributor The address of the distributor.
		 * @param totalAmount The total amount of tokens distributed.
		 * @param numberOfRecipients The number of recipients receiving the payout.
		 */
    event PayoutDistributed(
        address indexed token,
        address indexed distributor,
        uint256 totalAmount,
        uint256 numberOfRecipients
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DISTRIBUTOR_ROLE, msg.sender);
    }

    /**
     * @notice Distributes payouts to investors.
     * @dev Only accounts with DISTRIBUTOR_ROLE can call this function.
     * @param _token Address of the token to distribute. Use CurrencyTransferLib.NATIVE_TOKEN for native tokens.
     * @param _investors Array of investor addresses.
     * @param _payouts Array of payout amounts corresponding to each investor.
     */
    function distribute(
        address _token,
        address[] calldata _investors,
        uint256[] calldata _payouts
    ) external payable onlyRole(DISTRIBUTOR_ROLE) nonReentrant {
        uint256 numRecipients = _investors.length;
        require(numRecipients > 0, "No investors provided");
        require(numRecipients == _payouts.length, "Investors and payouts length mismatch");

        uint256 totalPayout = 0;

        // Calculate total payout amount
        for (uint256 i = 0; i < numRecipients; i++) {
            totalPayout += _payouts[i];
        }

        // Ensure the contract has enough balance
        if (_token == CurrencyTransferLib.NATIVE_TOKEN) {
            require(address(this).balance >= totalPayout, "Insufficient contract balance");
        } else {
            require(
                IERC20(_token).balanceOf(address(this)) >= totalPayout,
                "Insufficient contract token balance"
            );
        }

        // Distribute payouts
        for (uint256 i = 0; i < numRecipients; i++) {
            CurrencyTransferLib.transferCurrency(
                _token,
                address(this),
                _investors[i],
                _payouts[i]
            );
        }

        emit PayoutDistributed(_token, msg.sender, totalPayout, numRecipients);
    }

    /**
     * @notice Allows the contract to receive native tokens.
     */
    receive() external payable {}
}
