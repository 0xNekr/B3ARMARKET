import {ethers} from "hardhat";

async function main() {
    const contractAddress = "0x9a88eD21F0783326C887E7b7DfbaFA2BF8939E08";
    const contract = await ethers.getContractFactory("B3ARMARKETisERC721A");
    const Contract = await contract.attach(contractAddress);

    const setStep1 = await Contract.updateStep(1);
    console.log("Update contract to whitelist sale (step 1)");
    await setStep1;

    const currentStep = await Contract.currentStep();
    await currentStep;

    console.log("Current step:", currentStep);
}

main().then();
