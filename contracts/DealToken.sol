// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/access/AccessControl.sol';

/**
 * @title DealToken
 * @dev Implementation of the ERC20 token with AccessControl for minting.
 * The token is non-transferable, meaning tokens can only be minted or burned.
 *
 * Roles:\
 * - MINTER_ROLE: Allows accounts to mint new tokens.
 * - DEFAULT_ADMIN_ROLE: Grants admin permissions to manage roles.
 *
 * Functions:
 * - constructor: Initializes the token with the name "DealToken" and symbol "DLT".
 *   Grants the deployer the default admin role.
 * - mint: Mints tokens to a specified address. Can only be called by accounts with the MINTER_ROLE.
 * - _update: Overrides the internal _update function to disable transfers between addresses.
 *   Only allows minting and burning.
 */
contract DealToken is ERC20, AccessControl {
    /**
     * @dev Role identifier for the minter role.
     * Accounts with this role are allowed to mint new tokens.
     */
    bytes32 public constant MINTER_ROLE = keccak256('MINTER_ROLE');

    constructor() ERC20('DealToken', 'DLT') {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Mints new tokens and assigns them to the specified address.
     * Can only be called by an account with the MINTER_ROLE.
     *
     * @param to The address to which the newly minted tokens will be assigned.
     * @param amount The amount of tokens to be minted.
     */
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /**
     * @dev Overrides the _update function to disable transfers between addresses.
     * Tokens can only be minted (from == address(0)) or burned (to == address(0)).
     * @param from The address from which tokens are transferred.
     * @param to The address to which tokens are transferred.
     * @param amount The amount of tokens to be transferred.
     */
    function _update(address from, address to, uint256 amount) internal virtual override {
        // Allow minting and burning but disable transfers between addresses
        require(from == address(0) || to == address(0), 'Transfers are disabled');
        super._update(from, to, amount);
    }
}
