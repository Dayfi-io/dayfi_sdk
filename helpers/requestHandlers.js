const { ethers } = require("ethers");
const OriginationManager = require("../artifacts/OriginationManager.json");
const ERC721 = require("../abis/ERC721.json");
const Safe = require("../artifacts/Safe.json");
const SafeProxyFactory = require("../artifacts/SafeProxyFactory.json");
const { search } = require("../utils");
const { EstimateSafeCreationGas, createSendParams } = require("./../utils/gasUtils");
const Web3 = require("web3");

const triggerCloseContainer = async () => {
  const dayfiContainer = document.getElementById("dayfi-container");
  dayfiContainer.removeChild(dayfiContainer.firstChild);
};

const getIsAccountConnected = async ({ web3Provider }) => {
  const accounts = await web3Provider.listAccounts();
  if (accounts.length > 0) {
    const network = await web3Provider.getNetwork();
    return {
      type: "accountDetails",
      isAccountConnected: true,
      address: accounts[0],
      chain: network?.chainId,
    };
  } else {
    return {
      isAccountConnected: false,
    };
  }
};

const triggerChainChange = async ({ web3Provider, chain }) => {
  try {
    const { CHAIN_DETAILS } = require("./../constants");
    const defaultMetamaskChains = [5];
    const isDefaultChain = defaultMetamaskChains.includes(chain);
    if (isDefaultChain) {
      const hexString = `0x${chain.toString(16)}`;

      await web3Provider.provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexString }],
      });
    } else {
      await web3Provider.provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            ...CHAIN_DETAILS[chain],
          },
        ],
      });
    }
  } catch (err) {
    console.log(err);
  }
};

const getApprovalForPayLaterTransfer = async ({ tokenDetails, interest, web3Provider }) => {
  console.log({
    tokenDetails,
    interest,
  });
  const signer = web3Provider.getSigner();
  const originationManagerContractInstance = new ethers.Contract(tokenDetails.tokenAddress, ERC721.abi, signer);
  const response = await originationManagerContractInstance.approve(
    OriginationManager.defaultAddress,
    tokenDetails.tokenId,
  );

  const receipt = await response.wait();

  return receipt;
};

const createVault = async ({ provider, chainId, accounts, chainDetails, currentUserAddress }) => {
  try {
    const { SALT, ZERO_ADDRESS, EMPTY_DATA, DEPLOYED_ADDRESS } = require("./../constants");

    const web3Js = new Web3(provider);
    const SafeContract = new web3Js.eth.Contract(Safe.abi, DEPLOYED_ADDRESS[5].GnosisSafe, provider);
    const SafeProxyFactoryContract = new web3Js.eth.Contract(
      SafeProxyFactory.abi,
      DEPLOYED_ADDRESS[5].GnosisSafeProxyFactory,
      provider,
    );

    const currentChain = search(String(chainId), chainDetails);
    const safeAccounts = [...accounts];
    const numOfConfirmations = safeAccounts.length;

    const SafeData = SafeContract.methods
      .setup(
        safeAccounts,
        numOfConfirmations,
        ZERO_ADDRESS,
        EMPTY_DATA,
        DEPLOYED_ADDRESS[5].CompatibilityFallbackHandler,
        ZERO_ADDRESS,
        0,
        ZERO_ADDRESS,
        DEPLOYED_ADDRESS[5].PayLaterLoanCore,
      )
      .encodeABI();

    const deploymentTX = SafeProxyFactoryContract.methods.createProxyWithNonce(
      DEPLOYED_ADDRESS[5].GnosisSafe,
      SafeData,
      SALT,
    );

    const proxyFactoryData = deploymentTX.encodeABI();
    const gasLimitEstimate = await web3Js.eth.estimateGas({
      data: proxyFactoryData,
      from: currentUserAddress,
      to: DEPLOYED_ADDRESS[5].GnosisSafeProxyFactory,
    });

    const { gasCostFormatted, gasLimit, gasPrice, gasMaxPrioFee } = await EstimateSafeCreationGas({
      addresses: safeAccounts,
      numOwners: numOfConfirmations,
      safeCreationSalt: SALT,
      provider,
      proxyFactoryData,
      currentChain,
    });

    const sendParams = createSendParams(
      currentUserAddress,
      {
        ethGasLimit: gasLimitEstimate.toString(),
        ethGasPriceInGWei: gasPrice,
        ethMaxPrioFeeInGWei: gasMaxPrioFee.toString(),
      },
      currentChain,
    );

    try {
      const txReceipt = await deploymentTX.send(sendParams);
      const vaultAddress = txReceipt.events.ProxyCreation.returnValues.proxy;
      console.log({
        txReceipt,
        vaultAddress,
      });
      return {
        type: "vaultCreated",
        vaultAddress,
        chainId,
      };
    } catch (error) {
      console.log({ error });
      return {};
    }
  } catch (err) {
    console.log(err);
  }
};

module.exports = {
  triggerCloseContainer,
  getIsAccountConnected,
  triggerChainChange,
  getApprovalForPayLaterTransfer,
  createVault,
};
