import { HardhatUserConfig } from 'hardhat/config';

import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-etherscan';
// TS Support
import '@typechain/hardhat';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-waffle';

import 'hardhat-contract-sizer';

import * as dotenv from 'dotenv';
dotenv.config();

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PRIVATE_KEY: string;
      INFURA_API_KEY: string;
      ETHERSCAN_API_KEY: string;
    }
  }
}

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.9',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          outputSelection: {
            '*': {
              '*': ['storageLayout'],
            },
          },
        },
      },
    ],
  },
  networks: {
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  typechain: {
    outDir: 'types',
    target: 'ethers-v5',
  },
};

export default config;
