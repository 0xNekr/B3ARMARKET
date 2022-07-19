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
        WhitelistSale,
        PublicSale,
        SoldOut
    }

    Step public currentStep;

    bytes32 public wlMerkleRoot;
    bytes32 public ogMerkleRoot;

    uint public wlPrice = 0.066 ether;
    uint public publicPrice = 0.013 ether;

    mapping(address => uint) private mintByWallet;
    mapping(address => uint) private mintByWalletForTeam;

    uint public constant max_supply = 222;

    string public notRevealURI;
    string public revealURI;

    bool public isRevealed = false;

    address[] private teamMembers;

    /*
    * @notice Initializes the contract with the given parameters.
    * @param notRevealURI The base token URI of the token.
    * @param rootOfMerkle The root of the merkle tree.
    * @param teamMembers The team members of the token.
    */
    constructor(string memory _notRevealURI, bytes32 _ogMerkleRoot, bytes32 _wlMerkleRoot, address[] memory _teamMembers, address[] memory _coreTeam, uint[] memory _teamShares)
    ERC721A("Test", "TST")
    PaymentSplitter(_coreTeam, _teamShares)
    {
        setNotRevealURI(_notRevealURI);
        setOGMerkleRoot(_ogMerkleRoot);
        setWlMerkleRoot(_wlMerkleRoot);
        teamMembers = _teamMembers;
    }

    /*
    * @notice OG mint function
    * @param _proof Merkle Proof for OG
    * @param _amount The amount of tokens to mint. (max 3)
    */
    function OGMint(bytes32[] calldata _proof, uint _amount) {
        require(currentStep == Step.WhitelistSale, "The OG sale is not open.");
        require(isOG(msg.sender, _proof), "Not OG.");
        require(mintByWallet[msg.sender] + _amount <= 3, "You can only mint 3 NFTs with OG role");
        require(totalSupply() + _amount <= max_supply, "Max supply exceeded");
        require(msg.value >= wlPrice * _amount, "Not enough ETH");
        mintByWallet[msg.sender] += _amount;
        _safeMint(msg.sender, _amount);
    }

    /*
    * @notice WL mint function
    * @param _proof Merkle Proof for WL
    * @param _amount The amount of tokens to mint. (max 2)
    */
    function WLMint(bytes32[] calldata _proof, uint _amount) {
        require(currentStep == Step.WhitelistSale, "The WL sale is not open.");
        require(isWhitelisted(msg.sender, _proof), "Not WL.");
        require(mintByWallet[msg.sender] + _amount <= 2, "You can only mint 2 NFTs with WL role");
        require(totalSupply() + _amount <= max_supply, "Max supply exceeded");
        require(msg.value >= wlPrice * _amount, "Not enough ETH");
        mintByWallet[msg.sender] += _amount;
        _safeMint(msg.sender, _amount);
    }

    /*
    * @notice public mint function
    * @param _amount The amount of tokens to mint. (no limit)
    */
    function PublicMint(uint _amount) {
        require(currentStep == Step.PublicSale, "The public sale is not open.");
        require(totalSupply() + _amount <= max_supply, "Max supply exceeded");
        require(msg.value >= publicPrice * _amount, "Not enough ETH");
        _safeMint(msg.sender, _amount);
    }


    /*
    * @notice Mint function for team members
    */
    function mintForTeam() external payable {
        require(currentStep == Step.WhitelistSale || currentStep == Step.PublicSale, "The sale is not open.");
        require(isTeamMember(msg.sender), "Not a team member.");
        require(mintByWalletForTeam[msg.sender] + 1 <= 1, "You can only mint one NFT per address.");
        require(totalSupply() + 1 <= max_supply, "Max supply exceeded");

        mintByWalletForTeam[msg.sender]++;

        _safeMint(msg.sender, 1);
    }

    /*
    * @notice Owner mint function
    * @param _count The number of NFTs to mint
    * @param _to The address to mint the NFTs to
    */
    function mintForOwner(uint _count, address _to) external payable onlyOwner {
        require(_tokenIds.current() + _count  <= max_supply, "Max supply exceeded.");
        _safeMint(_to, _count);
    }

    /*
    * @notice add address to teamMembers list
    * @param _address address to add
    */
    function addTeamMember(address _address) external onlyOwner {
        teamMembers.push(_address);
    }

    /*
    * @notice remove address from teamMembers list
    * @param _address address to remove
    */
    function removeTeamMember(address _address) external onlyOwner {
        uint indexToRemove;
        for (uint i = 0; i < teamMembers.length; i++) {
            if (teamMembers[i] == _address) {
                indexToRemove = i;
            }
        }

        for (uint i = indexToRemove; i < teamMembers.length - 1; i++) {
            teamMembers[i] = teamMembers[i+1];
        }
        teamMembers.pop();
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
    * @param _baseTokenURI string
    */
    function setNotRevealURI(string memory _notRevealURI) public onlyOwner {
        notRevealURI = _notRevealURI;
    }

    /*
    * @notice set reveal URI
    * @param _revealURI string
    */
    function setRevealURI(string memory _revealURI) public onlyOwner {
        revealURI = _revealURI;
    }

    /*
    * @notice reveal
    */
    function reveal() external onlyOwner {
        require(!isRevealed, "Already revealed");
        isRevealed = true;
    }

    /*
    * @notice set wl merkle root
    * @param _merkleRoot bytes32
    */
    function setWlMerkleRoot(bytes32 _wlMerkleRoot) public onlyOwner {
        wlMerkleRoot = _wlMerkleRoot;
    }

    /*
    * @notice set wl merkle root
    * @param _merkleRoot bytes32
    */
    function setOGMerkleRoot(bytes32 _ogMerkleRoot) public onlyOwner {
        ogMerkleRoot = _ogMerkleRoot;
    }

    /*
    * @notice return token URI
    * @param _tokenId uint256 id of token
    */
    function tokenURI(uint256 _tokenId) override public view returns (string memory) {
        require(_exists(_tokenId),"ERC721Metadata: URI query for nonexistent token");
        if (isRevealed) {
            return string(abi.encodePacked(revealURI, _tokenId.toString(), ".json"));
        }
        return string(abi.encodePacked(notRevealURI));
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

    function isWLorOG(address _address, bytes32[] calldata wlProof, bytes32[] calldata ogProof) public view returns (uint) {
        if (isOG(_address, ogProof)) {
            return 1;
        } else if (isWhitelisted(_address, wlProof)) {
            return 2;
        } else {
            return 0;
        }
    }

    /*
    * @notice know if user is whitelisted
    * @param _account address of user
    * @param proof Merkle proof
    */
    function isWhitelisted(address _account, bytes32[] calldata proof) internal view returns(bool) {
        return _verifyWL(_leaf(_account), proof);
    }

    /*
    * @notice know if user is OG
    * @param _account address of user
    * @param proof Merkle proof
    */
    function isOG(address _account, bytes32[] calldata proof) internal view returns(bool) {
        return _verifyOG(_leaf(_account), proof);
    }

    /*
    * @notice get merkle _leaf
    * @param _account address of user
    */
    function _leaf(address _account) internal pure returns(bytes32) {
        return keccak256(abi.encodePacked(_account));
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
    * @notice verify if user is whitelisted OG
    * @param leaf bytes32 leaf of merkle tree
    * @param proof bytes32 Merkle proof
    */
    function _verifyOG(bytes32 leaf, bytes32[] memory proof) internal view returns(bool) {
        return MerkleProof.verify(proof, ogMerkleRoot, leaf);
    }

    /*
    * @notice check if user is team member
    * @param _account address of user
    */
    function isTeamMember(address _account) private view returns(bool) {
        bool isInTeamMembersList = false;
        for (uint i = 0; i < teamMembers.length; i++) {
            if (teamMembers[i] == _account) {
                isInTeamMembersList = true;
            }
        }

        return isInTeamMembersList;
    }

}
