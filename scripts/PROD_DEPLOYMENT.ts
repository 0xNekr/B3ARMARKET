import {ethers} from "hardhat";
const { MerkleTree } = require('merkletreejs');
const og = require('../assets/og.json');
const whitelist = require('../assets/whitelist.json');
const free_mint = require('../assets/fm.json');
const keccak256 = require('keccak256');

async function main() {
    const baseURI = "ipfs://bafybeib7b5byrk3u3d2d3so2zmynxax5ddznrq75mgkryaxwjxkh2raxbm/";
    const coreTeam = ["0xF096D4e0C02E4115aec303C656BA4b33880aB0e9", "0xE111c1827dE8BfFB313d9C4a0103F8b979905137", "0xBA93f4686CBA0aA9652080EcC17d581425Ed7F13", "0xdc863f2E217B05575ea812178BDC5ed96b4555Ae"];
    const shares = [15, 45, 25, 15];

    let ogTab = [];
    let wlTab = [];
    let fmTab = [];

    og.map(a => {
        ogTab.push(a.address);
    });

    whitelist.map(a => {
        wlTab.push(a.address);
    });

    free_mint.map(a => {
        fmTab.push(a.address);
    });

    const ogLeaves = ogTab.map(address => keccak256(address));
    const wlLeaves = wlTab.map(address => keccak256(address));
    const fmLeaves = fmTab.map(address => keccak256(address));

    const ogTree = new MerkleTree(ogLeaves, keccak256, {sort: true});
    const wlTree = new MerkleTree(wlLeaves, keccak256, {sort: true});
    const fmTree = new MerkleTree(fmLeaves, keccak256, {sort: true});

    const ogRoot = ogTree.getHexRoot();
    const wlRoot = wlTree.getHexRoot();
    const fmRoot = fmTree.getHexRoot();

    const contract = await ethers.getContractFactory("B3ARMARKETisERC721A");
    const Contract = await contract.deploy(
        baseURI,
        ogRoot,
        wlRoot,
        fmRoot,
        coreTeam,
        shares
    );
    console.log("Deploying contract...");
    await Contract.deployed();


    console.log("Argument 1 :", baseURI);
    console.log("Argument 2 :", ogRoot);
    console.log("Argument 3 :", wlRoot);
    console.log("Argument 4 :", fmRoot);
    console.log("Argument 5 :", coreTeam);
    console.log("Argument 6 :", shares);

    console.log("Contract deployed to:", Contract.address);

    console.log("hardhat verify --network rinkeby --constructor-args .\\scripts\\arguments.js", Contract.address); // verify the contract

}

// hardhat verify --network rinkeby --constructor-args .\scripts\arguments.js 0xEf783c3E1163dd5D4e9748c0B4f63F479C820E8c

main().then();
