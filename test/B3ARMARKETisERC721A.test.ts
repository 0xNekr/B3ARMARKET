import {use, expect} from "chai";
import {ethers} from "hardhat";
import {solidity} from "ethereum-waffle";
const { MerkleTree } = require('merkletreejs');
// @ts-ignore
import * as keccak256 from "keccak256";
import {exec} from "child_process";

use(solidity);

describe("B3ARMARKETisERC721A Unit tests", async () => {
    // @dev accounts
    let accounts = [];
    let owner; // account 0
    let og = []; // account 1 -> 40 (40 mints)
    let whitelisted = []; // account 1 -> 60 (120 mints)
    let free_mint = []; // 1 -> 30 (30 mints)
    let totalBalance = 0;

    // @dev contract
    let contract;

    // @dev merkle tree
    let ogMerkleTree;
    let ogMerkleRoot;
    let wlMerkleTree;
    let wlMerkleRoot;
    let fmMerkleTree;
    let fmMerkleRoot;


    function getOGMerkleProof(address) {
        const leaf = keccak256(address);
        return ogMerkleTree.getHexProof(leaf);
    }

    function getWLMerkleProof(address) {
        const leaf = keccak256(address);
        return wlMerkleTree.getHexProof(leaf);
    }

    function getFMMerkleProof(address) {
        const leaf = keccak256(address);
        return fmMerkleTree.getHexProof(leaf);
    }

    before(async () => {

        const [eth_accounts] = await ethers.getSigners();

        for (let i = 0; i < 80; i++) {
            let signer = ethers.Wallet.createRandom();
            signer = signer.connect(ethers.provider);
            await eth_accounts.sendTransaction({to: signer.address, value: ethers.utils.parseEther("2")});
            accounts.push(signer);
        }

        owner = accounts[0].connect(ethers.provider);

        for (let i = 1; i <= 39; i++) {
            og.push(accounts[i].connect(ethers.provider));
        }

        for (let i = 1; i <= 59; i++) {
            whitelisted.push(accounts[i].connect(ethers.provider));
        }

        for (let i = 1; i <= 29; i++) {
            free_mint.push(accounts[i].connect(ethers.provider));
        }

        const ogLeaves = og.map(user => keccak256(user.address));
        ogMerkleTree = new MerkleTree(ogLeaves, keccak256, {sort: true});
        ogMerkleRoot = ogMerkleTree.getHexRoot();

        const wlLeaves = whitelisted.map(user => keccak256(user.address));
        wlMerkleTree = new MerkleTree(wlLeaves, keccak256, {sort: true});
        wlMerkleRoot = wlMerkleTree.getHexRoot();

        const fmLeaves = free_mint.map(user => keccak256(user.address));
        fmMerkleTree = new MerkleTree(fmLeaves, keccak256, {sort: true});
        fmMerkleRoot = fmMerkleTree.getHexRoot();

        const Contract = await ethers.getContractFactory("B3ARMARKETisERC721A");

        contract = await Contract.connect(owner).deploy(
            "ipfs://baseURI/",
            ogMerkleRoot,
            wlMerkleRoot,
            fmMerkleRoot,
            [owner.address, accounts[1]['address'], accounts[2]['address'], accounts[3]['address']],
            [45, 25, 15, 15]
        );
    });

    // @dev variables tests

    it("wl price should be equal to 0.0066 ether", async () => {
        const price = await contract.wlPrice();
        expect(price).to.equal(ethers.utils.parseEther("0.0066"));
    });

    it("public price should be equal to 0.013 ether", async () => {
        const price = await contract.publicPrice();
        expect(price).to.equal(ethers.utils.parseEther("0.013"));
    });

    it("total_supply should be equal to 222", async () => {
        const max_supply = await contract.total_supply();
        expect(max_supply).to.equal(222);
    });

    it("sale_supply should be equal to 192", async () => {
        const sale_supply = await contract.sale_supply();
        expect(sale_supply).to.equal(192);
    });

    it("baseURI should be equal to 'ipfs://baseURI/'", async () => {
        const baseURI = await contract.baseURI();
        expect(baseURI).to.equal("ipfs://baseURI/");
    });

    it("currentStep should be equal to 0", async () => {
        const currentStep = await contract.currentStep();
        expect(currentStep).to.equal(0);
    });

    it("ogMerkleRoot should be equal to init ogMerkleRoot", async () => {
        const contractOGMerkleRoot = await contract.ogMerkleRoot();
        expect(contractOGMerkleRoot).to.equal(ogMerkleRoot);
    });

    it("wlMerkleRoot should be equal to init wlMerkleRoot", async () => {
        const contractWlMerkleRoot = await contract.wlMerkleRoot();
        expect(contractWlMerkleRoot).to.equal(wlMerkleRoot);
    });

    it("fmMerkleRoot should be equal to init fmMerkleRoot", async () => {
        const contractFmMerkleRoot = await contract.fmMerkleRoot();
        expect(contractFmMerkleRoot).to.equal(fmMerkleRoot);
    });

    // @dev functions tests
    // @dev Not dependent of currentStep

    it("owner should be able to update ogMerkleRoot / not owner should have revert", async () => {
        const merkleProof = getOGMerkleProof(accounts[40].address);
        expect(await contract.isOG(accounts[40].address, merkleProof)).to.equal(false);

        og.length = 0;
        for (let i = 1; i <= 40; i++) {
            og.push(accounts[i].connect(ethers.provider));
        }

        const newOGLeaves = og.map(user => keccak256(user.address));
        ogMerkleTree = new MerkleTree(newOGLeaves, keccak256, {sort: true});
        ogMerkleRoot = ogMerkleTree.getHexRoot();

        await expect(contract.connect(accounts[1]).setOGMerkleRoot(ogMerkleRoot)).to.be.revertedWith("Ownable: caller is not the owner");
        await contract.connect(owner).setOGMerkleRoot(ogMerkleRoot);

        const newProof = getOGMerkleProof(accounts[40].address);
        expect(await contract.isOG(accounts[40].address, newProof)).to.equal(true);
    });

    it("owner should be able to update wlMerkleRoot / not owner should have revert", async () => {
        const merkleProof = getWLMerkleProof(accounts[60].address);
        expect(await contract.isWhitelisted(accounts[60].address, merkleProof)).to.equal(false);

        whitelisted.length = 0
        for (let i = 1; i <= 60; i++) {
            whitelisted.push(accounts[i].connect(ethers.provider));
        }

        const newWLLeaves = whitelisted.map(user => keccak256(user.address));
        wlMerkleTree = new MerkleTree(newWLLeaves, keccak256, {sort: true});
        wlMerkleRoot = wlMerkleTree.getHexRoot();

        await expect(contract.connect(accounts[1]).setWlMerkleRoot(wlMerkleRoot)).to.be.revertedWith("Ownable: caller is not the owner");
        await contract.connect(owner).setWlMerkleRoot(wlMerkleRoot);

        const newProof = getWLMerkleProof(accounts[60].address);
        expect(await contract.isWhitelisted(accounts[60].address, newProof)).to.equal(true);
    });

    it("owner should be able to update fmMerkleRoot / not owner should have revert", async () => {
        const merkleProof = getFMMerkleProof(accounts[30].address);
        expect(await contract.isFreeMint(accounts[30].address, merkleProof)).to.equal(false);

        free_mint.length = 0;
        for (let i = 1; i <= 30; i++) {
            free_mint.push(accounts[i].connect(ethers.provider));
        }

        const newFMLeaves = free_mint.map(user => keccak256(user.address));
        fmMerkleTree = new MerkleTree(newFMLeaves, keccak256, {sort: true});
        fmMerkleRoot = fmMerkleTree.getHexRoot();

        await expect(contract.connect(accounts[1]).setFMMerkleRoot(fmMerkleRoot)).to.be.revertedWith("Ownable: caller is not the owner");
        await contract.connect(owner).setFMMerkleRoot(fmMerkleRoot);

        const newProof = getFMMerkleProof(accounts[30].address);
        expect(await contract.isFreeMint(accounts[30].address, newProof)).to.equal(true);
    });

    it("owner should be able to modify baseURI", async () => {
        const newBaseURI = "ipfs://newBaseURI/";
        await contract.connect(owner).setBaseURI(newBaseURI);
        const baseURI = await contract.baseURI();
        expect(baseURI).to.equal(newBaseURI);
    });

    it("not_owner should have revert for setBaseURI() call", async () => {
        await expect(contract.connect(og[0]).setBaseURI("ipfs://newBaseURI/")).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("owner should have revert for tokenURI(0) call", async () => {
        await expect(contract.connect(owner).tokenURI(0)).to.be.revertedWith("ERC721Metadata: URI query for nonexistent token");
    });

    it("not_owner should have revert for mintForOwner() call", async () => {
        await expect(contract.connect(og[2]).mintForOwner(2, og[2].address)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    // @dev functions tests
    // @dev during step 0 : SaleNotStarted

    it("not_owner should have revert for mintForOwner() call", async () => {
        await expect(contract.connect(og[2]).mintForOwner(2, og[2].address)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("og should have revert for OGMint() call", async () => {
        const merkleProof = getOGMerkleProof(og[0].address);
        await expect(contract.connect(og[0]).OGMint(merkleProof)).to.be.revertedWith("The OG sale is not open.");
    });

    it("whitelisted should have revert for WLMint() call", async () => {
        const merkleProof = getWLMerkleProof(whitelisted[0].address);
        await expect(contract.connect(whitelisted[0]).WLMint(merkleProof, 2)).to.be.revertedWith("The WL sale is not open.");
    });

    it("og should have revert for PublicMint() call", async () => {
        await expect(contract.connect(og[0]).PublicMint(1)).to.be.revertedWith("The public sale is not open.");
    });

    // @dev functions tests
    // @dev Between step 0 and step 1

    it("not_owner should have revert for updateStep(1) call", async () => {
        await expect(contract.connect(whitelisted[0]).updateStep(1)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("owner should be able to update step to 1", async () => {
        await contract.connect(owner).updateStep(1);
        expect(await contract.currentStep()).to.equal(1);
    });

    // @dev functions tests
    // @dev During step 1 : OGSale

    it("whitelisted but not OG should have revert for OGMint() call", async () => {
        const merkleProof = getOGMerkleProof(whitelisted[40].address);
        await expect(contract.connect(whitelisted[40]).OGMint(merkleProof)).to.be.revertedWith("Not OG.");
    });

    it("free mint should have revert for FreeMint() call", async () => {
        const merkleProof = getFMMerkleProof(free_mint[0].address);
        await expect(contract.connect(free_mint[0]).FreeMint(merkleProof)).to.be.revertedWith("The FreeMint sale is not open.");
    });

    it("not whitelisted should have revert for OGMint() call", async () => {
        const merkleProof = getOGMerkleProof(accounts[61].address);
        await expect(contract.connect(accounts[61]).OGMint(merkleProof)).to.be.revertedWith("Not OG.");
    });

    it("og should have revert for OGMint() call (with not enough funds)", async () => {
        const merkleProof = getOGMerkleProof(og[0].address);
        const price = ethers.utils.parseEther("0.0060");
        await expect(contract.connect(og[0]).OGMint(merkleProof, {value: price})).to.be.revertedWith("Not enough ETH");
    });

    it("og(s) should be able to mint with OGMint() call then revert for another mint", async () => {
        for (let i = 0; i < og.length; i++) {
            const merkleProof = getOGMerkleProof(og[i].address);
            const price = ethers.utils.parseEther("0.0066");
            totalBalance += parseInt(price.toString());
            await contract.connect(og[i]).OGMint(merkleProof, {value: price});

            expect(await contract.balanceOf(og[i].address)).to.equal(1);
            expect(await contract.ownerOf(i)).to.equal(og[i].address);

            await (expect(contract.connect(og[i]).OGMint(merkleProof, {value: price})).to.be.revertedWith("You can only mint 1 NFT with OG role"));
        }

        expect(await contract.totalSupply()).to.equal(40);
    });

    it("og(s) should have revert for mint() call (only one per address)", async () => {
        for (let i = 0; i < og.length; i++) {
            const merkleProof = getOGMerkleProof(og[i].address);
            const price = ethers.utils.parseEther("0.0066");
            await expect(contract.connect(og[i]).OGMint(merkleProof, {value: price})).to.be.revertedWith("You can only mint 1 NFT with OG role");
        }
    });

    // @dev functions tests
    // @dev Step 2 : WhitelistSale

    it("Owner should be able to update step to 2", async () => {
        await contract.connect(owner).updateStep(2);
        expect(await contract.currentStep()).to.equal(2);
    });

    it("non-whitelist should have revert for WLMint() call", async () => {
        const merkleProof = getWLMerkleProof(accounts[61].address);
        await expect(contract.connect(accounts[61]).WLMint(merkleProof, 2)).to.be.revertedWith("Not WL.");
    });

    it("OG should have revert for OGMint() call", async () => {
        const merkleProof = getOGMerkleProof(og[0].address);
        await expect(contract.connect(og[0]).OGMint(merkleProof)).to.be.revertedWith("The OG sale is not open.");
    });

    it("Freemint should have revert for FreeMint() call", async () => {
        const merkleProof = getFMMerkleProof(free_mint[0].address);
        await expect(contract.connect(free_mint[0]).FreeMint(merkleProof)).to.be.revertedWith("The FreeMint sale is not open.");
    });

    it("Whitelisted/OG should be able to mint 2 NFTs then have a revert for other mint", async () => {
        for (let i = 0; i < whitelisted.length; i++) {
            const merkleProof = getWLMerkleProof(whitelisted[i].address);
            const price = ethers.utils.parseEther("0.0132");
            totalBalance += parseInt(price.toString());
            await contract.connect(whitelisted[i]).WLMint(merkleProof, 2, {value: price});

            if (i <= 39) {
                expect(await contract.balanceOf(whitelisted[i].address)).to.equal(3);
            } else {
                expect(await contract.balanceOf(whitelisted[i].address)).to.equal(2);
            }
            await expect(contract.connect(whitelisted[i]).WLMint(merkleProof, 2, {value: price})).to.be.revertedWith("You can only mint 2 NFTs with WL role")
        }

        expect(await contract.totalSupply()).to.equal(160);
    });

    // @dev functions tests
    // @dev Step 3 : PublicSale

    it("owner should be able to update step to 3", async () => {
         await contract.connect(owner).updateStep(3);
         expect(await contract.currentStep()).to.equal(3);
    });

    it("OG should have revert for OGMint() call", async () => {
        const merkleProof = getOGMerkleProof(og[0].address);
        const price = ethers.utils.parseEther("0.0066");
        await expect(contract.connect(og[0]).OGMint(merkleProof, {value: price})).to.be.revertedWith("The OG sale is not open.");
    });

    it("Whitelisted should have revert for WLMint() call", async () => {
        const merkleProof = getWLMerkleProof(whitelisted[0].address);
        const price = ethers.utils.parseEther("0.0132");
        await expect(contract.connect(whitelisted[0]).WLMint(merkleProof, 2, {value: price})).to.be.revertedWith("The WL sale is not open.");
    });

    it("Freemint should have revert for FreeMint() call", async () => {
        const merkleProof = getFMMerkleProof(free_mint[0].address);
        await expect(contract.connect(free_mint[0]).FreeMint(merkleProof)).to.be.revertedWith("The FreeMint sale is not open.");
    });

    it("The remaining supply should be equal to 32", async () => {
        const currentSupply = await contract.totalSupply();
        const saleSupply = await contract.sale_supply();

        expect(saleSupply.sub(currentSupply)).to.equal(32);
    });

    it("2 peoples should be able to buy 16 NFTs", async () => {
        let price = ethers.utils.parseEther("0.0132");
        price = price.mul(16);

        totalBalance += parseInt(price.toString());
        totalBalance += parseInt(price.toString());

        await contract.connect(accounts[61]).PublicMint(16, {value: price});
        await contract.connect(accounts[62]).PublicMint(16, {value: price});

        expect(await contract.balanceOf(accounts[61].address)).to.equal(16);
        expect(await contract.balanceOf(accounts[62].address)).to.equal(16);
    });

    it("Current supply should be equal to 192", async () => {
        expect(await contract.totalSupply()).to.equal(192);
    });

    it("people should have revert for PublicMint() call", async () => {
        for (let i = 0; i < accounts.length; i++) {
            const price = ethers.utils.parseEther("0.0066");
            await expect(contract.connect(accounts[i]).PublicMint(1, {value: price})).to.be.revertedWith("Max supply exceeded");
        }
    });


    // @dev functions tests
    // @dev Step 4 : FreeMint

    it("owner should be able to update step to 4", async () => {
        await contract.connect(owner).updateStep(4);
        expect(await contract.currentStep()).to.equal(4);
    });

    it("OG should have revert for OGMint() call", async () => {
        const merkleProof = getOGMerkleProof(og[0].address);
        const price = ethers.utils.parseEther("0.0066");
        await expect(contract.connect(og[0]).OGMint(merkleProof, {value: price})).to.be.revertedWith("The OG sale is not open.");
    });

    it("Whitelisted should have revert for WLMint() call", async () => {
        const merkleProof = getWLMerkleProof(whitelisted[0].address);
        const price = ethers.utils.parseEther("0.0132");
        await expect(contract.connect(whitelisted[0]).WLMint(merkleProof, 2, {value: price})).to.be.revertedWith("The WL sale is not open.");
    });

    it("Public should have revert for PublicMint() call", async () => {
        const price = ethers.utils.parseEther("0.0066");
        await expect(contract.connect(accounts[0]).PublicMint(1, {value: price})).to.be.revertedWith("The public sale is not open.");
    });

    it("Non-FreeMint should have revert for FreeMint() call", async () => {
        const merkleProof = getFMMerkleProof(accounts[61].address);
        await expect(contract.connect(accounts[61]).FreeMint(merkleProof)).to.be.revertedWith("You don't have Free mint.");
    });

    it("Free mint users should be able to mint then have a revert for another free mint", async () => {
        for (let i = 0; i < free_mint.length - 1; i++) {
            const merkleProof = getFMMerkleProof(free_mint[i].address);
            await contract.connect(free_mint[i]).FreeMint(merkleProof);

            expect(await contract.balanceOf(free_mint[i].address)).to.equal(4);

            await expect(contract.connect(free_mint[i]).FreeMint(merkleProof)).to.be.revertedWith("You can only mint 1 NFT with FreeMint role");
        }
    });

    it("Last free mint user should be able to mint", async () => {
        const merkleProof = getFMMerkleProof(free_mint[free_mint.length - 1].address);
        await contract.connect(free_mint[free_mint.length - 1]).FreeMint(merkleProof);

        expect(await contract.balanceOf(free_mint[free_mint.length - 1].address)).to.equal(4);

        await expect(contract.connect(free_mint[free_mint.length - 1]).FreeMint(merkleProof)).to.be.revertedWith("Max supply exceeded");
    });

    it("The remaining supply should be equal to 0", async () => {
        const currentSupply = await contract.totalSupply();
        const totalSupply = await contract.total_supply();

        expect(totalSupply.sub(currentSupply)).to.equal(0);
    });

    it("Free mint should have revert for FreeMint() call", async () => {
        const merkleProof = getFMMerkleProof(free_mint[0].address);
        await expect(contract.connect(free_mint[0]).FreeMint(merkleProof)).to.be.revertedWith("Max supply exceeded");
    });

    // @dev functions tests
    // @dev Step 5 : SoldOut

    it("owner should be able to update step to 5", async () => {
        await contract.connect(owner).updateStep(5);
        expect(await contract.currentStep()).to.equal(5);
    });

    it("tokenURI should return baseURI for every token", async () => {
        const currentSupply = await contract.totalSupply();
        for (let i = 0; i < currentSupply; i++) {
            expect(await contract.tokenURI(i)).to.equal("ipfs://newBaseURI/" + i.toString());
        }
    });

    it("Contract balance should not be equal to 0", async () => {
        const contractEthBalance = await ethers.provider.getBalance(contract.address);
        expect(contractEthBalance.toString()).to.equal(totalBalance.toString());
    });

    it("non-team member should have revert when call release", async () => {
        await expect(contract.connect(accounts[5])['release(address)'](accounts[5].address)).to.be.revertedWith("PaymentSplitter: account has no shares");
    });

    it("team members should be able to release", async () => {
        await contract.connect(owner)['release(address)'](owner.address);
        await contract.connect(accounts[1])['release(address)'](accounts[1].address);
        await contract.connect(accounts[2])['release(address)'](accounts[2].address);
        await contract.connect(accounts[3])['release(address)'](accounts[3].address);

        const releasedByOwner = await contract.connect(owner)['released(address)'](owner.address);
        const releasedByAccount1 = await contract.connect(accounts[1])['released(address)'](accounts[1].address);
        const releasedByAccount2 = await contract.connect(accounts[2])['released(address)'](accounts[2].address);
        const releasedByAccount3 = await contract.connect(accounts[3])['released(address)'](accounts[3].address);

        expect(releasedByOwner.toString()).to.equal((totalBalance * 0.45).toString());
        expect(releasedByAccount1.toString()).to.equal((totalBalance * 0.25).toString());
        expect(releasedByAccount2.toString()).to.equal((totalBalance * 0.15).toString());
        expect(releasedByAccount3.toString()).to.equal((totalBalance * 0.15).toString());
    });

})
