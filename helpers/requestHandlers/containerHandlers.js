const { ethers } = require("ethers");
const OriginationManager = require("../../artifacts/OriginationManager.json");
const ERC721 = require("../../abis/ERC721.json");
const Safe = require("../../artifacts/Safe.json");
const SafeProxyFactory = require("../../artifacts/SafeProxyFactory.json");
const { search } = require("../../utils");
const {
  EstimateSafeCreationGas,
  createSendParams,
  generateERC721TransferTxData,
  EstimateTransactionGas,
  getParametersStatus,
  TransactionParameters,
  canExecuteCreatedTx,
  getPreValidatedSignatures,
  getExecutionTransaction,
} = require("./../../utils/gasUtils");
const Web3 = require("web3");

const triggerCloseContainer = async () => {
  const dayfiContainer = document.getElementById("dayfi-container");
  dayfiContainer.removeChild(dayfiContainer.firstChild);
  return {};
};

module.exports = {
  triggerCloseContainer,
};
