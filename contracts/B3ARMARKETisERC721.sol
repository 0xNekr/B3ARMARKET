// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/finance/PaymentSplitter.sol";

contract B3ARMARKETisERC721 is ERC721, Ownable, PaymentSplitter {
    using Counters for Counters.Counter;
    using Strings for uint;

    Counters.Counter private _tokenIds;

    enum Step {
        SaleNotStarted,
        WhitelistSale,
        PublicSale,
        SoldOut
    }

    Step public currentStep;

    bytes32 public merkleRoot;

    uint public price = 0.05 ether;
    mapping(address => uint) public mintByWallet;

    uint public constant max_supply = 10;

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
    constructor(string memory _notRevealURI, bytes32 _rootOfMerkle, address[] memory _teamMembers, address[] memory _coreTeam, uint[] memory _teamShares)
    ERC721("Test", "TST")
    PaymentSplitter(_coreTeam, _teamShares)
    {
        setNotRevealURI(_notRevealURI);
        setMerkleRoot(_rootOfMerkle);
        teamMembers = _teamMembers;
    }

    /*
    * @notice Mint function
    * @param _proof Merkle Proof
    */
    function mint(bytes32[] calldata _proof) external payable {
        require(currentStep == Step.WhitelistSale || currentStep == Step.PublicSale, "The sale is not open.");

        if (currentStep == Step.WhitelistSale) {
            require(isWhitelisted(msg.sender, _proof), "Not whitelisted.");
        }

        require(mintByWallet[msg.sender] + 1 <= 1, "You can only mint one NFT per address.");
        require(_tokenIds.current() + 1  <= max_supply, "Max supply exceeded.");
        require(msg.value >= price, "Not enough funds to purchase.");

        mintByWallet[msg.sender]++;

        uint newTokenID = _tokenIds.current();
        _mint(msg.sender, newTokenID);
        _tokenIds.increment();
    }

    /*
    * @notice Mint function for team members
    */
    function mintForTeam() external payable {
        require(currentStep == Step.WhitelistSale || currentStep == Step.PublicSale, "The sale is not open.");
        require(isTeamMember(msg.sender), "Not a team member.");
        require(mintByWallet[msg.sender] + 1 <= 1, "You can only mint one NFT per address.");
        require(_tokenIds.current() + 1  <= max_supply, "Max supply exceeded.");

        mintByWallet[msg.sender]++;

        uint newTokenID = _tokenIds.current();
        _mint(msg.sender, newTokenID);
        _tokenIds.increment();
    }

    /*
    * @notice Owner mint function
    * @param _count The number of NFTs to mint
    * @param _to The address to mint the NFTs to
    */
    function mintForOwner(uint _count, address _to) external payable onlyOwner {
        require(_tokenIds.current() + _count  <= max_supply, "Max supply exceeded.");
        for (uint i = 0; i < _count; i++) {
            uint newTokenID = _tokenIds.current();
            _mint(_to, newTokenID);
            _tokenIds.increment();
        }
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
    * @notice set merkle root
    * @param _merkleRoot bytes32
    */
    function setMerkleRoot(bytes32 _merkleRoot) public onlyOwner {
        merkleRoot = _merkleRoot;
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
        return string(abi.encodePacked(notRevealURI, _tokenId.toString(),".json"));
    }

    /*
    * @notice know if user is whitelisted
    * @param _account address of user
    * @param proof Merkle proof
    */
    function isWhitelisted(address _account, bytes32[] calldata proof) internal view returns(bool) {
        return _verify(_leaf(_account), proof);
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
    function _verify(bytes32 leaf, bytes32[] memory proof) internal view returns(bool) {
        return MerkleProof.verify(proof, merkleRoot, leaf);
    }

    /*
    * @notice check if user is team member
    * @param _account address of user
    */
    function isTeamMember(address _account) public view returns(bool) {
        bool isInTeamMembersList = false;
        for (uint i = 0; i < teamMembers.length; i++) {
            if (teamMembers[i] == _account) {
                isInTeamMembersList = true;
            }
        }

        return isInTeamMembersList;
    }

}
