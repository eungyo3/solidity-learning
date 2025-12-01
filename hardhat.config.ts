import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-vyper";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  vyper: {
    version: "0.3.0",
  },
  networks: {
    kairos: {
      url: "https://public-en-kairos.node.kaia.io",
      accounts: [
        "0x6575c0c6bb685651618696a94d330ef623d0f96efde17acf7aef612653d84df4",
      ],
    },
  },
  etherscan: {
    apiKey: {
      kairos: "unnecessary",
    },
    customChains: [
      {
        network: "kairos",
        chainId: 1001,
        urls: {
          apiURL: "https://kairos-api.kaiascan.io/hardhat-verify",
          browserURL: "https://kairos.kaiascan.io",
        },
      },
    ],
  },
};

export default config;
