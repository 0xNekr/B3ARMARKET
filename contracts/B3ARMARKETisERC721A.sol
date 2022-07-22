// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./ERC721A/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/finance/PaymentSplitter.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/draft-ERC721Votes.sol";

contract B3ARMARKETisERC721A is ERC721A, Ownable, PaymentSplitter {
    using Strings for uint;

    enum Step {
        SaleNotStarted,
        OGSale,
        WhitelistSale,
        PublicSale,
        FreeMint,
        SoldOut
    }

    Step public currentStep;

    bytes32 public ogMerkleRoot;    // OG merkle root
    bytes32 public wlMerkleRoot;    // Whitelist merkle root
    bytes32 public fmMerkleRoot;    // FreeMint merkle root

    uint public wlPrice = 0.0066 ether;
    uint public publicPrice = 0.013 ether;

    mapping(address => uint) private mintByWalletOG;
    mapping(address => uint) private mintByWalletWL;
    mapping(address => uint) private mintByWalletFM;

    uint public constant sale_supply = 192;
    uint public constant total_supply = 222;

    string public baseURI;

    /*
    * @notice Initializes the contract with the given parameters.
    * @param baseURI The base token URI of the token.
    * @param rootOfMerkle The root of the merkle tree.
    * @param teamMembers The team members of the token.
    */
    constructor(string memory _baseURI, bytes32 _ogMerkleRoot, bytes32 _wlMerkleRoot, bytes32 _fmMerkleRoot, address[] memory _team, uint[] memory _teamShares, string memory _name, string memory _symbol)
    ERC721A(_name, _symbol)
    PaymentSplitter(_team, _teamShares)
    {
        setBaseURI(_baseURI);
        setOGMerkleRoot(_ogMerkleRoot);
        setWlMerkleRoot(_wlMerkleRoot);
        setFMMerkleRoot(_fmMerkleRoot);
    }

    /*
    * @notice OG mint function
    * @param _proof Merkle Proof for OG
    */
    function OGMint(bytes32[] calldata _proof) public payable {
        require(currentStep == Step.OGSale, "The OG sale is not open.");
        require(isOG(msg.sender, _proof), "Not OG.");
        require(mintByWalletOG[msg.sender] + 1 <= 1, "You can only mint 1 NFT with OG role");
        require(totalSupply() + 1 <= sale_supply, "Max supply exceeded");
        require(msg.value >= wlPrice, "Not enough ETH");
        mintByWalletOG[msg.sender] += 1;
        _safeMint(msg.sender, 1);
    }

    /*
    * @notice WL mint function
    * @param _proof Merkle Proof for WL
    * @param _amount The amount of tokens to mint. (max 2)
    */
    function WLMint(bytes32[] calldata _proof, uint256 _amount) public payable {
        require(currentStep == Step.WhitelistSale, "The WL sale is not open.");
        require(isWhitelisted(msg.sender, _proof), "Not WL.");
        require(mintByWalletWL[msg.sender] + _amount <= 2, "You can only mint 2 NFTs with WL role");
        require(totalSupply() + _amount <= sale_supply, "Max supply exceeded");
        require(msg.value >= wlPrice * _amount, "Not enough ETH");
        mintByWalletWL[msg.sender] += _amount;
        _safeMint(msg.sender, _amount);
    }

    /*
    * @notice public mint function
    * @param _amount The amount of tokens to mint. (no limit)
    */
    function PublicMint(uint256 _amount) public payable {
        require(currentStep == Step.PublicSale, "The public sale is not open.");
        require(totalSupply() + _amount <= sale_supply, "Max supply exceeded");
        require(msg.value >= publicPrice * _amount, "Not enough ETH");
        _safeMint(msg.sender, _amount);
    }

    /*
    * @notice FreeMint mint function
    * @param _proof Merkle Proof for FreeMint
    */
    function FreeMint(bytes32[] calldata _proof) public payable {
        require(currentStep == Step.FreeMint, "The FreeMint sale is not open.");
        require(isFreeMint(msg.sender, _proof), "You don't have Free mint.");
        require(totalSupply() + 1 <= total_supply, "Max supply exceeded");
        require(mintByWalletFM[msg.sender] + 1 <= 1, "You can only mint 1 NFT with FreeMint role");
        mintByWalletFM[msg.sender] += 1;
        _safeMint(msg.sender, 1);
    }


    /*
    * @notice Owner mint function
    * @param _count The number of NFTs to mint
    * @param _to The address to mint the NFTs to
    */
    function mintForOwner(uint _count, address _to) external payable onlyOwner {
        require(totalSupply() + _count  <= total_supply, "Max supply exceeded.");
        _safeMint(_to, _count);
    }

    /*
    * @notice update step
    * @param _step step to update
    */
    function updateStep(Step _step) external onlyOwner {
        currentStep = _step;
    }

    /*
    * @notice set base token URI
    * @param _baseURI string
    */
    function setBaseURI(string memory _baseURI) public onlyOwner {
        baseURI = _baseURI;
    }

    /*
    * @notice set wl merkle root
    * @param _merkleRoot bytes32
    */
    function setOGMerkleRoot(bytes32 _ogMerkleRoot) public onlyOwner {
        ogMerkleRoot = _ogMerkleRoot;
    }

    /*
    * @notice set wl merkle root
    * @param _merkleRoot bytes32
    */
    function setWlMerkleRoot(bytes32 _wlMerkleRoot) public onlyOwner {
        wlMerkleRoot = _wlMerkleRoot;
    }

    /*
    * @notice set fm merkle root
    * @param _merkleRoot bytes32
    */
    function setFMMerkleRoot(bytes32 _fmMerkleRoot) public onlyOwner {
        fmMerkleRoot = _fmMerkleRoot;
    }

    /*
    * @notice return token URI
    * @param _tokenId uint256 id of token
    */
    function tokenURI(uint256 _tokenId) override public view returns (string memory) {
        require(_exists(_tokenId),"ERC721Metadata: URI query for nonexistent token");

        return string(abi.encodePacked(baseURI, _tokenId.toString()));
    }

    /*
    * @notice return current price
    */
    function getPrice() public view returns (uint) {
        if (currentStep == Step.WhitelistSale) {
            return wlPrice;
        } else {
            return publicPrice;
        }
    }

    /*
    * @notice know if user is OG
    * @param _account address of user
    * @param proof Merkle proof
    */
    function isOG(address _account, bytes32[] calldata proof) public view returns(bool) {
        return _verifyOG(_leaf(_account), proof);
    }

    /*
    * @notice know if user is whitelisted
    * @param _account address of user
    * @param proof Merkle proof
    */
    function isWhitelisted(address _account, bytes32[] calldata proof) public view returns(bool) {
        return _verifyWL(_leaf(_account), proof);
    }

    /*
    * @notice know if user is free mint
    * @param _account address of user
    * @param proof Merkle proof
    */
    function isFreeMint(address _account, bytes32[] calldata proof) public view returns(bool) {
        return _verifyFM(_leaf(_account), proof);
    }

    /*
    * @notice get merkle _leaf
    * @param _account address of user
    */
    function _leaf(address _account) internal pure returns(bytes32) {
        return keccak256(abi.encodePacked(_account));
    }


    /*
    * @notice verify if user is whitelisted OG
    * @param leaf bytes32 leaf of merkle tree
    * @param proof bytes32 Merkle proof
    */
    function _verifyOG(bytes32 leaf, bytes32[] memory proof) internal view returns(bool) {
        return MerkleProof.verify(proof, ogMerkleRoot, leaf);
    }

    /*
    * @notice verify if user is whitelisted
    * @param leaf bytes32 leaf of merkle tree
    * @param proof bytes32 Merkle proof
    */
    function _verifyWL(bytes32 leaf, bytes32[] memory proof) internal view returns(bool) {
        return MerkleProof.verify(proof, wlMerkleRoot, leaf);
    }

    /*
    * @notice verify if user is free mint
    * @param leaf bytes32 leaf of merkle tree
    * @param proof bytes32 Merkle proof
    */
    function _verifyFM(bytes32 leaf, bytes32[] memory proof) internal view returns(bool) {
        return MerkleProof.verify(proof, fmMerkleRoot, leaf);
    }
}
