// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract DepoMarketplace is IERC721Receiver, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    Counters.Counter public listingCount;
    mapping(uint256 => Listing) public listings;
    mapping(address => uint256) public userFunds;
    uint256 public feeCollected;
    uint256 public fee = 25; // 2.5% fee

    struct Listing {
        IERC721 nftCollection;
        uint256 listingId;
        uint256 tokenId;
        address user;
        uint256 price;
        bool sold;
        bool canceled;
    }

    event ListingCreated(IERC721 nftCollection, uint256 listingId, uint256 tokenId, address user, uint256 price, bool sold, bool cancelled);
    event Filled(uint256 listingId, IERC721 nftCollection, uint256 tokenId, address newOwner);
    event Canceled(uint256 listingId, IERC721 nftCollection, uint256 tokenId, address owner);
    event Withdraw(address user, uint256 amount);

    function createListing(
        IERC721 nftCollection,
        uint256 _tokenId,
        uint256 _price
    ) external {
        require(nftCollection.isApprovedForAll(msg.sender, address(this)), "Not approved to transfer");

        nftCollection.safeTransferFrom(msg.sender, address(this), _tokenId);
        listingCount.increment();
        listings[listingCount.current()] = Listing(nftCollection, listingCount.current(), _tokenId, msg.sender, _price, false, false);
        emit ListingCreated(nftCollection, listingCount.current(), _tokenId, msg.sender, _price, false, false);
    }

    function buy(uint256 _listingId) external payable existing(_listingId) {
        Listing storage listing = listings[_listingId];
        require(listing.user != msg.sender, "The owner cannot buy it");
        require(msg.value == listing.price, "Not exact price");

        listing.nftCollection.safeTransferFrom(address(this), msg.sender, listing.tokenId);
        listing.sold = true;
        uint256 feeAmount = (msg.value * fee) / 1000;
        feeCollected += feeAmount;
        userFunds[listing.user] += msg.value - feeAmount;

        emit Filled(_listingId, listing.nftCollection, listing.tokenId, msg.sender);
    }

    function cancel(uint256 _listingId) external existing(_listingId) {
        Listing storage listing = listings[_listingId];
        require(listing.user == msg.sender, "Should only be canceled by the owner");
        listing.nftCollection.safeTransferFrom(address(this), msg.sender, listing.tokenId);
        listing.canceled = true;

        emit Canceled(_listingId, listing.nftCollection, listing.tokenId, msg.sender);
    }

    function withdraw(address to, uint256 amount) external nonReentrant {
        require(userFunds[msg.sender] >= amount, "Not enough to withdraw");
        userFunds[msg.sender] -= amount;
        payable(to).transfer(amount);
        emit Withdraw(msg.sender, amount);
    }

    function setFee(uint256 _fee) external onlyOwner {
        require(_fee > 0 && _fee < 100, "Should be greater than 0 and less than 10%");
        fee = _fee;
    }

    function claimFee(address to, uint256 amount) external onlyOwner {
        require(amount <= feeCollected && amount <= address(this).balance, "Invalid amount to claim");
        feeCollected -= amount;
        payable(to).transfer(amount);
    }

    modifier existing(uint256 _listingId) {
        Listing storage listing = listings[_listingId];
        require(listing.listingId == _listingId, "Invalid listingId");
        require(!listing.sold, "Already sold");
        require(!listing.canceled, "Already canceled");
        _;
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes memory
    ) public virtual override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
