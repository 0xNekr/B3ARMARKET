const { MerkleTree } = require('merkletreejs');
const og = require('../assets/og.json');
const whitelist = require('../assets/whitelist.json');
const fm = require('../assets/fm.json');
const keccak256 = require('keccak256');

const main = async () => {
    let ogTab = [];
    let wlTab = [];
    let fmTab = [];

    og.map(a => {
        ogTab.push(a.address);
    });

    whitelist.map(a => {
        wlTab.push(a.address);
    });

    fm.map(a => {
        fmTab.push(a.address);
    });

    const ogLeaves = ogTab.map(address => keccak256(address));
    const wlLeaves = wlTab.map(address => keccak256(address));
    const fmLeaves = fmTab.map(address => keccak256(address));

    const ogTree = new MerkleTree(ogLeaves, keccak256, {sort: true});
    const wlTree = new MerkleTree(wlLeaves, keccak256, {sort: true});
    const fmTree = new MerkleTree(fmLeaves, keccak256, {sort: true});

    const addressToCheck = keccak256("0xF096D4e0C02E4115aec303C656BA4b33880aB0e9");

    console.log("OG Proof", ogTree.getHexProof(addressToCheck));
    console.log("OG Root", ogTree.getHexRoot());
    console.log("WL Proof", wlTree.getHexProof(addressToCheck));
    console.log("WL Root", wlTree.getHexRoot());
    console.log("FM Proof", fmTree.getHexProof(addressToCheck));
    console.log("FM Root", fmTree.getHexRoot());
};

const runMain = async () => {
    try {
        await main();
        process.exit(0);
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
};

runMain();
