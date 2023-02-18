const { ethers } = require("ethers");
const io = require("socket.io-client");
const { iframeBaseUrl, soketBackendUrl } = require("./constants");
const { handleChainChange } = require("./helpers/generalHelpers");

let exeParams = {};

const initialize = ({ provider = {}, partnerId = ""}) => {
  try {
    const web3Provider = new ethers.providers.Web3Provider(provider);

    web3Provider.provider.on("chainChanged", (newChain) => {
      console.log(newChain)
    });
  } catch (error) {
    console.error(error);
  }
};

const listNFTForPayLater = async({
  tokenDetails = {
    token_address: "",
    token_id: "",
    contract_type: "",
    name: "",
  },
  dayfiConfig,
  provider,
}) => {
    try {
      const web3Provider = new ethers.providers.Web3Provider(provider);
      const { partnerId, walletAddress } = dayfiConfig;

    } catch (error) {
      console.error(error);
    }
};

module.exports = {
  initialize,
  listNFTForPayLater
};