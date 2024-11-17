// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

import './DealToken.sol';
import './lib/CurrencyTransferLib.sol';

/**
 * @title Crowdsale
 * @dev Crowdsale contract for selling DealTokens in exchange for a specified currency.
 * Inherits from AccessControl and ReentrancyGuard to manage roles and prevent reentrancy attacks.
 *
 * @notice This contract allows users to purchase DealTokens by transferring the required amount of accepted currency.
 * The contract also includes administrative functions to set the accepted currency, price per token,
 * and funds receiver address.
 *
 * The contract emits a TokensPurchased event when tokens are successfully purchased.
 */
contract Crowdsale is AccessControl, ReentrancyGuard {
    /**
     * @dev Role identifier for the admin role.
     */
    bytes32 public constant ADMIN_ROLE = keccak256('ADMIN_ROLE');

    /**
     * @dev The token being sold.
     */
    DealToken public dealToken;

    /**
     * @dev The currency accepted for payment.
     */
    address public acceptedCurrency;

    /**
     * @dev Price per DealToken in accepted currency.
     */
    uint256 public pricePerToken;

    /**
     * @dev Address to receive the funds.
     */
    address public fundsReceiver;

    /**
     * @dev Emitted when tokens are purchased.
     * @param purchaser The address of the purchaser.
     * @param amountPaid The amount of currency paid.
     * @param tokensMinted The number of tokens minted.
     */
    event TokensPurchased(address indexed purchaser, uint256 amountPaid, uint256 tokensMinted);

    constructor(DealToken _dealToken, address _acceptedCurrency, uint256 _pricePerToken, address _fundsReceiver) {
        require(address(_dealToken) != address(0), 'Invalid DealToken address');
        require(_pricePerToken > 0, 'Price per token must be greater than zero');
        require(_fundsReceiver != address(0), 'Invalid funds receiver address');

        dealToken = _dealToken;
        acceptedCurrency = _acceptedCurrency;
        pricePerToken = _pricePerToken;
        fundsReceiver = _fundsReceiver;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @notice Allows users to buy tokens by transferring the required amount of currency.
     * @dev This function is protected against reentrancy attacks.
     * @param amountToBuy The number of tokens the user wants to buy.
     */
    function buyTokens(uint256 amountToBuy) external payable nonReentrant {
        require(amountToBuy > 0, 'Amount to buy must be greater than zero');

        uint256 totalCost = (amountToBuy * pricePerToken) / (10 ** 18);

        // Transfer the payment from the buyer to the funds receiver
        CurrencyTransferLib.transferCurrency(acceptedCurrency, msg.sender, fundsReceiver, totalCost);

        // Mint DealTokens to the buyer
        dealToken.mint(msg.sender, amountToBuy);

        emit TokensPurchased(msg.sender, totalCost, amountToBuy);
    }

    // Admin functions

    /**
     * @dev Sets the accepted currency for the crowdsale.
     * @param _acceptedCurrency The address of the accepted currency.
     */
    function setAcceptedCurrency(address _acceptedCurrency) external onlyRole(ADMIN_ROLE) {
        acceptedCurrency = _acceptedCurrency;
    }

    /**
     * @dev Sets the price per token for the crowdsale.
     * @param _pricePerToken The price per token in the accepted currency.
     */
    function setPricePerToken(uint256 _pricePerToken) external onlyRole(ADMIN_ROLE) {
        require(_pricePerToken > 0, 'Price per token must be greater than zero');
        pricePerToken = _pricePerToken;
    }

    /**
     * @dev Sets the address that will receive the funds from the crowdsale.
     * @param _fundsReceiver The address of the funds receiver.
     */
    function setFundsReceiver(address _fundsReceiver) external onlyRole(ADMIN_ROLE) {
        require(_fundsReceiver != address(0), 'Invalid funds receiver address');
        fundsReceiver = _fundsReceiver;
    }
}
