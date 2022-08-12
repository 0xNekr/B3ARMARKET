import * as dotenv from "dotenv";
import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";

dotenv.config();

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const config: HardhatUserConfig = {
  solidity: "0.8.13",
  networks: {
    mainnet: {
      url: process.env.API_URL_MAINNET!,
      accounts: [process.env.PRIVATE_KEY_0xF0!],
      gasPrice: "auto",
    },
    rinkeby: {
      url: process.env.INFURA_RINKEBY_URL!,
      accounts: [process.env.PRIVATE_KEY_0xF0!],
      gas: 2100000,
      gasPrice: 8000000000
    }
  },
  etherscan: {
    apiKey: {
      rinkeby: process.env.ETHSCAN_API_KEY!,
      mainnet: process.env.ETHSCAN_API_KEY!,
    },
  },paths: {
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 90000,
  },
  typechain: {
    outDir: "src/types",
    target: "ethers-v5",
  },
  gasReporter: {
    currency: "USD",
    gasPrice: 21
  }
};

export default config;
