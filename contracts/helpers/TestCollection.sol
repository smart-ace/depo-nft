// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract TestCollection is ERC721 {
    using Counters for Counters.Counter;
    Counters.Counter private currentTokenId;

    constructor() ERC721("Test", "TEST") {}

    function safeMint() external returns (uint256 tokenId) {
        currentTokenId.increment();
        _safeMint(msg.sender, currentTokenId.current());
        return currentTokenId.current();
    }
}
