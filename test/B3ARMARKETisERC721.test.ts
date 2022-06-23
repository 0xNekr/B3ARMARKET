import {use, expect} from "chai";
import {ethers, waffle} from "hardhat";
import {solidity} from "ethereum-waffle";
import {Signer} from "ethers";
const { MerkleTree } = require('merkletreejs');
// @ts-ignore
import * as keccak256 from "keccak256";

use(solidity);

describe("B3ARMARKETisERC721 Unit tests", async () => {

    // @dev accounts
    let accounts: Signer[];
    let owner;
    let not_owner;
    let whitelisted;
    let not_whitelisted;
    let team_member;

    // @dev contract
    let contract;

    // @dev merkle tree
    let merkleTree;
    let merkleRoot;

    function getMerkleProof(address) {
        const leaf = keccak256(address);
        return merkleTree.getHexProof(leaf);
    }

    before(async () => {
        accounts = await ethers.getSigners();
        owner = accounts[0];
        not_owner = accounts[1];
        whitelisted = accounts[2];
        not_whitelisted = accounts[3];
        team_member = accounts[4];

        let addressTab = [];
        addressTab.push(owner.address);
        addressTab.push(whitelisted.address);
        const leaves = addressTab.map(address => keccak256(address));
        merkleTree = new MerkleTree(leaves, keccak256, {sort: true});
        merkleRoot = merkleTree.getHexRoot();

        const Contract = await ethers.getContractFactory("B3ARMARKETisERC721");

        contract = await Contract.deploy(
            "ipfs://notRevealURI/",
            merkleRoot,
            [owner.address, team_member.address, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"],
            [owner.address, team_member.address],
            [70, 30]
        );
    });

    // @dev variables tests

    it("price should be equal to 0.05 ether", async () => {
        const price = await contract.price();
        expect(price).to.equal(ethers.utils.parseEther("0.05"));
    });

    it("max_supply should be equal to 10", async () => {
        const max_supply = await contract.max_supply();
        expect(max_supply).to.equal(10);
    });

    it("notRevealURI should be equal to 'ipfs://notRevealURI/'", async () => {
        const notRevealURI = await contract.notRevealURI();
        expect(notRevealURI).to.equal("ipfs://notRevealURI/");
    });

    it("revealURI should be empty", async () => {
        const revealURI = await contract.revealURI();
        expect(revealURI).to.equal("");
    });

    it("currentStep should be equal to 0", async () => {
        const currentStep = await contract.currentStep();
        expect(currentStep).to.equal(0);
    });

    it("merkleRoot should be equal to init merkleRoot", async () => {
        const contractMerkleRoot = await contract.merkleRoot();
        expect(contractMerkleRoot).to.equal(merkleRoot);
    });

    it("isRevealed shoud be equal to false", async () => {
        const isRevealed = await contract.isRevealed();
        expect(isRevealed).to.equal(false);
    });

    // @dev functions tests
    // @dev Not dependent of currentStep

    it("not_owner should have revert for addTeamMember() call", async () => {
        await expect(contract.connect(not_owner).addTeamMember(not_owner.address)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("owner should be able to add team member", async () => {
        const isTeamMember = await contract.isTeamMember(not_owner.address);
        expect(isTeamMember).to.equal(false);
        await contract.connect(owner).addTeamMember(not_owner.address);
        const isTeamMember2 = await contract.isTeamMember(not_owner.address);
        expect(isTeamMember2).to.equal(true);
    });

    it("not_owner should have revert for removeTeamMember() call", async () => {
        await expect(contract.connect(not_owner).removeTeamMember(not_owner.address)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("owner should be able to remove team member", async () => {
        const isTeamMember = await contract.isTeamMember(not_owner.address);
        expect(isTeamMember).to.equal(true);
        await contract.connect(owner).removeTeamMember(not_owner.address);
        const isTeamMember2 = await contract.isTeamMember(not_owner.address);
        expect(isTeamMember2).to.equal(false);
    });

    it("owner should be able to modify notRevealURI", async () => {
        const newNotRevealURI = "ipfs://newNotRevealURI/";
        await contract.connect(owner).setNotRevealURI(newNotRevealURI);
        const notRevealURI = await contract.notRevealURI();
        expect(notRevealURI).to.equal(newNotRevealURI);
    });

    it("not_owner should have revert for setNotRevealURI() call", async () => {
        await expect(contract.connect(not_owner).setNotRevealURI("ipfs://newNotRevealURI/")).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("owner should be able to modify revealURI", async () => {
        const newRevealURI = "ipfs://newRevealURI/";
        await contract.connect(owner).setRevealURI(newRevealURI);
        const revealURI = await contract.revealURI();
        expect(revealURI).to.equal(newRevealURI);
    });

    it("not_owner should have revert for setRevealURI() call", async () => {
        await expect(contract.connect(not_owner).setRevealURI("ipfs://newRevealURI/")).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("owner should have revert for tokenURI(0) call", async () => {
        await expect(contract.connect(owner).tokenURI(0)).to.be.revertedWith("ERC721Metadata: URI query for nonexistent token");
    });

    it("owner should be able to mint 2 NFTs for mintForOwner() call", async () => {
        await contract.connect(owner).mintForOwner(2, owner.address);
        const balance = await contract.balanceOf(owner.address);
        expect(balance).to.equal(2);
        expect(await contract.ownerOf(0)).to.equal(owner.address);
        expect(await contract.ownerOf(1)).to.equal(owner.address);
    });

    it("not_owner should have revert for mintForOwner() call", async () => {
        await expect(contract.connect(not_owner).mintForOwner(2, owner.address)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("tokenURI(0) should return 'ipfs://newNotRevealURI/0.json'", async () => {
        expect(await contract.tokenURI(0)).to.equal("ipfs://newNotRevealURI/0.json");
    });

    it("not_owner should have revert for reveal() call", async () => {
        await expect(contract.connect(not_owner).reveal()).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("owner should be able to reveal", async () => {
        await contract.connect(owner).reveal();
        expect(await contract.isRevealed()).to.equal(true);
    });

    it("tokenURI(0) should return 'ipfs://newRevealURI/0.json'", async () => {
        expect(await contract.tokenURI(0)).to.equal("ipfs://newRevealURI/0.json");
    });

    it("owner should have revert for reveal() call", async () => {
        await expect(contract.connect(owner).reveal()).to.be.revertedWith("Already revealed");
    });

    // @dev functions tests
    // @dev during step 0 : SaleNotStarted

    it("team_member should have revert for mintForTeam() call", async () => {
        await expect(contract.connect(team_member).mintForTeam()).to.be.revertedWith("The sale is not open.");
    });

    it("not_owner should have revert for mintForTeam() call", async () => {
        await expect(contract.connect(not_owner).mintForTeam()).to.be.revertedWith("The sale is not open.");
    });

    it("whitelisted should have revert for mint() call", async () => {
        const merkleProof = getMerkleProof(whitelisted.address);
        await expect(contract.connect(whitelisted).mint(merkleProof)).to.be.revertedWith("The sale is not open.");
    });

    // @dev functions tests
    // @dev Between step 0 and step 1

    it("not_owner should have revert for updateStep(1) call", async () => {
        await expect(contract.connect(not_owner).updateStep(1)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("owner should be able to update step to 1", async () => {
        await contract.connect(owner).updateStep(1);
        expect(await contract.currentStep()).to.equal(1);
    });

    // @dev functions tests
    // @dev During step 1 : WhitelistSale

    it("team_member should be able to mint with mintForTeam() call", async () => {
        await contract.connect(team_member).mintForTeam();
        expect(await contract.balanceOf(team_member.address)).to.equal(1);
        expect(await contract.ownerOf(2)).to.equal(team_member.address);
    });

    it("team_member should have revert for mintForTeam() call", async () => {
        await expect(contract.connect(team_member).mintForTeam()).to.be.revertedWith("You can only mint one NFT per address.");
    });

    it("not_owner should have revert for mintForTeam() call", async () => {
        await expect(contract.connect(not_owner).mintForTeam()).to.be.revertedWith("Not a team member.");
    });

    it("not_whitelisted should have revert for mint() call", async () => {
        const merkleProof = getMerkleProof(not_whitelisted.address);
        await expect(contract.connect(not_whitelisted).mint(merkleProof)).to.be.revertedWith("Not whitelisted.");
    });

    it("whitelisted should have revert for mint() call (with no funds)", async () => {
        const merkleProof = getMerkleProof(whitelisted.address);
        await expect(contract.connect(whitelisted).mint(merkleProof)).to.be.revertedWith("Not enough funds to purchase.");
    });

    it("whitelisted should have revert for mint() call (with not enough funds)", async () => {
        const merkleProof = getMerkleProof(whitelisted.address);
        const price = ethers.utils.parseEther("0.04");
        await expect(contract.connect(whitelisted).mint(merkleProof, {value: price})).to.be.revertedWith("Not enough funds to purchase.");
    });

    it("whitelisted should be able to mint with mint() call", async () => {
        const merkleProof = getMerkleProof(whitelisted.address);
        const price = ethers.utils.parseEther("0.05");
        await contract.connect(whitelisted).mint(merkleProof, {value: price});

        expect(await contract.balanceOf(whitelisted.address)).to.equal(1);
        expect(await contract.ownerOf(3)).to.equal(whitelisted.address);
    });

    it("whitelisted should have revert for mint() call (only one per address)", async () => {
        const merkleProof = getMerkleProof(whitelisted.address);
        const price = ethers.utils.parseEther("0.05");
        await expect(contract.connect(whitelisted).mint(merkleProof, {value: price})).to.be.revertedWith("You can only mint one NFT per address.");
    });

    // @dev functions tests
    // @dev Step 2 : PublicSale

    it("owner should be able to update step to 2", async () => {
        await contract.connect(owner).updateStep(2);
        expect(await contract.currentStep()).to.equal(2);
    });

    it("not_whitelisted should have revert for mint() call (not enough funds)", async () => {
        await expect(contract.connect(not_whitelisted).mint([])).to.be.revertedWith("Not enough funds to purchase.");
    });

    it("not_whitelisted should be able to mint with mint() call", async () => {
        const price = ethers.utils.parseEther("0.05");
        await contract.connect(not_whitelisted).mint([], {value: price});

        expect(await contract.balanceOf(not_whitelisted.address)).to.equal(1);
        expect(await contract.ownerOf(4)).to.equal(not_whitelisted.address);
    });

    it("not_whitelisted should have revert for mint() call (only one per address)", async () => {
        const price = ethers.utils.parseEther("0.05");
        await expect(contract.connect(not_whitelisted).mint([], {value: price})).to.be.revertedWith("You can only mint one NFT per address.");
    });

    it("5 others accounts should be able to mint with mint() call", async () => {
        const price = ethers.utils.parseEther("0.05");
        for (let i = 0; i < 5; i++) {
            await contract.connect(accounts[5 + i]).mint([], {value: price});
            expect(await contract.balanceOf(accounts[5 + i]['address'])).to.equal(1);
            expect(await contract.ownerOf(5 + i)).to.equal(accounts[5 + i]['address']);
        }
    });

    it("another account should have revert for mint() call", async () => {
        const price = ethers.utils.parseEther("0.05");
        await expect(contract.connect(accounts[10]).mint([], {value: price})).to.be.revertedWith("Max supply exceeded.");
    });

    it("owner should have revert for mintForOwner() call", async () => {
        await expect(contract.connect(owner).mintForOwner(1, owner.address)).to.be.revertedWith("Max supply exceeded.");
    });

    it("owner should have rever for mintForTeam() call", async () => {
        await expect(contract.connect(owner).mintForTeam()).to.be.revertedWith("Max supply exceeded.");
    });

    // @dev functions tests
    // @dev Step 3 : SoldOut

    it("owner should be able to update step to 3", async () => {
        await contract.connect(owner).updateStep(3);
        expect(await contract.currentStep()).to.equal(3);
    });

    it("owner should have revert for mintForTeam() call", async () => {
        await expect(contract.connect(owner).mintForTeam()).to.be.revertedWith("The sale is not open.");
    });

    it("owner should have revert for mint() call", async () => {
        const price = ethers.utils.parseEther("0.05");
        await expect(contract.connect(owner).mint([], {value: price})).to.be.revertedWith("The sale is not open.");
    });

})
