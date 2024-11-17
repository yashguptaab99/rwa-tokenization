// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import 'hardhat/console.sol';

contract Test {
    function test() public pure returns (string memory) {
        console.log('test');
        return 'test';
    }
}
