// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

/**
 * @title CurrencyTransferLib
 * @dev Library for transferring native tokens (e.g., ETH) and ERC20 tokens between addresses.
 *
 * @notice This library provides functions to transfer native tokens and ERC20 tokens from one address to another.
 * It includes checks to ensure the transfer amount is greater than zero, the allowance and balance are sufficient
 * for ERC20 transfers, and the recipient address is not zero for native token transfers.
 *
 * @dev The library defines a constant `NATIVE_TOKEN` to represent the address used for native tokens.
 *
 * Functions:
 * - transferCurrency: Transfers currency (either native tokens or ERC20 tokens) from one address to another.
 * - transferNativeToken: Transfers native tokens (ETH) from one address to another.
 * - transferERC20: Transfers ERC20 tokens from one address to another.
 * - safeTransferNativeToken: Transfers native tokens to a specified address.
 */
library CurrencyTransferLib {
    /**
     * @dev A constant representing the address used to denote native tokens (e.g., ETH).
     */
    address public constant NATIVE_TOKEN = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    /**
     * @dev Transfers currency (either native tokens or ERC20 tokens) from one address to another.
     * @param _currency The address of the currency to transfer. Use NATIVE_TOKEN for native tokens.
     * @param _from The address to transfer the tokens from.
     * @param _to The address to transfer the tokens to.
     * @param _amount The amount of tokens to transfer.
     * @notice This function will revert if the transfer fails or if the amount is zero.
     */
    function transferCurrency(address _currency, address _from, address _to, uint256 _amount) internal {
        require(_amount > 0, 'Amount must be greater than zero');

        if (_currency == NATIVE_TOKEN) {
            transferNativeToken(_from, _to, _amount);
        } else {
            transferERC20(_currency, _from, _to, _amount);
        }
    }

    /**
     * @dev Transfers native tokens (ETH) from one address to another.
     * @param _from The address to transfer the tokens from.
     * @param _to The address to transfer the tokens to.
     * @param _amount The amount of tokens to transfer.
     * @notice This function will revert if the transfer fails or if the sent ETH value is incorrect.
     */
    function transferNativeToken(address _from, address _to, uint256 _amount) internal {
        if (_from == address(this)) {
            safeTransferNativeToken(_to, _amount);
        } else {
            require(msg.value == _amount, 'Incorrect ETH value sent');
            safeTransferNativeToken(_to, _amount);
        }
    }

    /**
     * @dev Transfers ERC20 tokens from one address to another.
     * @param _currency The address of the ERC20 token contract.
     * @param _from The address to transfer the tokens from.
     * @param _to The address to transfer the tokens to.
     * @param _amount The amount of tokens to transfer.
     * @notice This function will revert if the transfer fails, if the allowance is insufficient,
     * or if the balance is insufficient.
     */
    function transferERC20(address _currency, address _from, address _to, uint256 _amount) internal {
        require(_to != address(0), 'Transfer to zero address');
        
        if (_from == address(this)) {
            IERC20(_currency).transfer(_to, _amount);
        } else {
            uint256 allowance = IERC20(_currency).allowance(_from, address(this));
            require(allowance >= _amount, 'Insufficient allowance');

            uint256 balance = IERC20(_currency).balanceOf(_from);
            require(balance >= _amount, 'Insufficient balance');

            IERC20(_currency).transferFrom(_from, _to, _amount);
        }
    }

    /**
     * @dev Transfers native tokens to a specified address.
     * @param _to The address to transfer the tokens to.
     * @param _value The amount of tokens to transfer.
     * @notice This function will revert if the transfer fails or if the recipient address is zero.
     */
    function safeTransferNativeToken(address _to, uint256 _value) internal {
        require(_to != address(0), 'Transfer to zero address');

        (bool success, ) = _to.call{ value: _value }('');
        require(success, 'Native token transfer failed');
    }
}
