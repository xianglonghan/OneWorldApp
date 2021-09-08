// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/ERC721.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/IERC721Receiver.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/Ownable.sol";

// Not used now, keep it just in case
contract OneWorldDelegate {
    function transferTo(OneWorld oneWorld, address to, uint256 tokenId) public {
        // Delegate is a trick to change msg.sender to caller contract
        oneWorld.safeTransferFrom(address(oneWorld), to, tokenId);
    }
}

contract OneWorld is ERC721,Ownable,IERC721Receiver {

    struct TokenInfo {
        uint256 price;
        Status status;
        uint8 layer;
        uint32 resaleId;
    }
    enum Status {UNAVAILABLE,AVAILABLE,SOLD,RESALE}
    struct ResaleInfo {
        address sellerAddress;
        uint256 highestBid;
        address bidderAddress;
        uint256 resalePrice;
        uint256 tokenId;
        uint256 resaleEndTime;
    }
    struct TokenAndResaleInfo {
        TokenInfo tokenInfo;
        ResaleInfo resaleInfo;
    }
    
    uint256 mintPrice = 1 ether;
    
    mapping(uint256 => TokenInfo) public tokenInfoMap;
    mapping(uint256 => ResaleInfo) public resaleInfoMap;
    uint32 private currentResaleId = 1;

    event MintTokenEvent(uint256 tokenId, TokenInfo tokenInfo);
    event StartResaleEvent(uint256 tokenId,uint32 resaleId,ResaleInfo resaleInfo,uint256 creationTime);
    event BidResaleEvent(ResaleInfo latestInfo, uint32 resaleId,uint256 tokenId);
    event RetrieveTokenFromResaleEvent(uint256 tokenId, ResaleInfo resaleInfo);
    
    constructor() ERC721("OneToken","OT"){
    }
    
    function onERC721Received(address, address, uint256, bytes memory) public virtual override returns (bytes4) {
        return this.onERC721Received.selector;
    }
    
    function mintToken(uint256 tokenId, uint8 layer) external payable {
        // TODO(xlhan): verify the tokenId is the right level
        require(msg.value == mintPrice, "OneWorld : Sender has not paid equal to required price");
        
        TokenInfo memory info;
        info.price = mintPrice;
        info.layer = layer;
        info.status = Status.SOLD;
        tokenInfoMap[tokenId] = info;
        
        _safeMint(msg.sender, tokenId);
        emit MintTokenEvent(tokenId, tokenInfoMap[tokenId]);
    }
    
    // Resale
    function startResale(uint256 price, uint256 tokenId, uint256 secondsAfter) external {
        require(ownerOf(tokenId) == msg.sender,"GeoTokens: User is not the owner of this NFT");
        require(tokenInfoMap[tokenId].status != Status.RESALE,"GeoTokens: Token is already on re sale");
        // Put the token in escrow
        safeTransferFrom(msg.sender, address(this), tokenId);
        ResaleInfo memory info;
        info.sellerAddress = msg.sender;
        info.resalePrice = price;
        info.tokenId = tokenId;
        info.resaleEndTime = block.timestamp + secondsAfter * 1 seconds;
        resaleInfoMap[currentResaleId] = info;
        tokenInfoMap[tokenId].status = Status.RESALE;
        tokenInfoMap[tokenId].resaleId = currentResaleId;
        emit StartResaleEvent(tokenId, currentResaleId, info, block.timestamp);
        currentResaleId += 1;
    }
    
    function bidResale(uint32 resaleId, uint256 tokenId) external payable {
        require(resaleInfoMap[resaleId].tokenId == tokenId, "GeoTokens: Token ID mismatch");
        require(block.timestamp < resaleInfoMap[resaleId].resaleEndTime, "GeoTokens: Resale has ended");
        require(resaleInfoMap[resaleId].sellerAddress != msg.sender,"GeoTokens: Seller cannot bid");
        require(msg.value > resaleInfoMap[resaleId].resalePrice, "GeoTokens: Bid can't be lower than initial price");
        require(msg.value > resaleInfoMap[resaleId].highestBid + 0.01 ether ,"GeoTokens: You need to send amount more than previous bid");
        address bidder;
        uint256 bid;
        if(resaleInfoMap[resaleId].bidderAddress != address(0)) {
            bidder = resaleInfoMap[resaleId].bidderAddress;
            bid = resaleInfoMap[resaleId].highestBid;
            resaleInfoMap[resaleId].bidderAddress = address(0);
            resaleInfoMap[resaleId].highestBid = 0;
            payable(bidder).transfer(bid);
        }
        resaleInfoMap[resaleId].bidderAddress = msg.sender;
        resaleInfoMap[resaleId].highestBid = msg.value;
        emit BidResaleEvent(resaleInfoMap[resaleId], resaleId, tokenId);
    }
    
    function retrieveTokenFromResale(uint32 resaleId, uint256 tokenId) external{
        // This concludes the resale process, and escrow will send money/token to seller/buyer
        TokenInfo memory tokenInfo = tokenInfoMap[tokenId];
        ResaleInfo memory resaleInfo = resaleInfoMap[resaleId];
        // This also checks if the token has been retrieved
        require(tokenInfo.status == Status.RESALE, 'Token is for resale');
        require(tokenInfo.resaleId == resaleId, 'Invalid resale ID');
        require(resaleInfo.bidderAddress == msg.sender,"GeoTokens: User is not auction winner for this token");
        require(resaleInfo.resaleEndTime < block.timestamp,"GeoTokens: Auction has not ended yet");
        
        tokenInfo.status = Status.SOLD;
        tokenInfo.price = resaleInfoMap[resaleId].highestBid;
        tokenInfo.resaleId = 0;
        
        // Seller gets money
        payable(resaleInfo.sellerAddress).transfer(resaleInfo.highestBid);
        // Buyer gets token
        // Use _safeTransfer instead of safeTransferFrom to avoid ownership == msg.sender check
        _safeTransfer(address(this), msg.sender, tokenId, '');
        emit RetrieveTokenFromResaleEvent(tokenId, resaleInfo);
        delete resaleInfoMap[resaleId];
    }
    
    function getTokenAndResaleInfos(uint256[] memory tokenIds) external view returns (TokenAndResaleInfo[] memory) {
        TokenAndResaleInfo[] memory retInfos = new TokenAndResaleInfo[](tokenIds.length);
        for (uint32 i = 0; i < tokenIds.length; i++) {
            TokenInfo memory tokenInfo = tokenInfoMap[tokenIds[i]];
            ResaleInfo memory resaleInfo = resaleInfoMap[tokenInfo.resaleId];
            TokenAndResaleInfo memory retInfo;
            retInfo.tokenInfo = tokenInfo;
            retInfo.resaleInfo = resaleInfo;
            retInfos[i] = retInfo;
        }
        return retInfos;
    }
    
}