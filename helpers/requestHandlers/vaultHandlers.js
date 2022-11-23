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

const createVault = async ({ provider, chainId, accounts, chainDetails, currentUserAddress }) => {
  try {
    const { SALT, ZERO_ADDRESS, EMPTY_DATA, DEPLOYED_ADDRESS } = require("../../constants");

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

const transferNFTFromVault = async ({ NFT, provider, chainId, chainDetails, vaultAddress, recipientAddress }) => {
  try {
    const web3Js = new Web3(provider);
    const currentChainId = chainId;
    const currentChain = search(currentChainId, chainDetails);
    const SafeNonce = await web3Js.eth.getTransactionCount(vaultAddress, "pending");
    const tx = {
      token_address: NFT.token_address,
      assetName: NFT.name,
      recipientAddress: recipientAddress,
      token_id: NFT.token_id,
    };
    const txData = await generateERC721TransferTxData(tx, vaultAddress, currentChainId, provider);

    const {
      gasCostFormatted,
      gasPriceFormatted,
      gasMaxPrioFeeFormatted,
      gasLimit,
      gasEstimation,
      txEstimationExecutionStatus,
      isCreation,
      isOffChainSignature,
      canTxExecute,
    } = await EstimateTransactionGas({
      txData,
      txRecipient: NFT.token_address || vaultAddress,
      txType: undefined,
      txConfirmations: undefined,
      txAmount: "0",
      preApprovingOwner: account,
      safeTxGas: "0",
      manualGasPrice: undefined,
      manualMaxPrioFee: undefined,
      manualGasLimit: undefined,
      manualSafeNonce: undefined,
      operation: undefined,
      currentChain,
      currentChainId,
      provider,
      vaultAddress,
      account,
      SafeNonce,
    });

    const defaultParameterStatus = canTxExecute ? "ENABLED" : "ETH_HIDDEN";

    const parametersStatus = getParametersStatus(isCreation, canTxExecute, undefined);

    const txParameters = await TransactionParameters({
      parametersStatus: parametersStatus || defaultParameterStatus,
      initialEthGasLimit: gasLimit,
      initialEthGasPrice: gasPriceFormatted,
      initialEthMaxPrioFee: gasMaxPrioFeeFormatted,
      initialSafeNonce: SafeNonce,
      initialSafeTxGas: gasEstimation,
      provider: provider,
      connectedWalletAddress: account,
      safeAddress: vaultAddress,
      currentChainId: currentChainId,
    });

    const txProps = {
      vaultAddress,
      to: NFT.token_address,
      valueInWei: "0",
      txNonce: SafeNonce,
      safeTxGas: txParameters.safeTxGas,
      ethParameters: txParameters,
      notifiedTransaction: TX_NOTIFICATION_TYPES.STANDARD_TX,
      delayExecution: false,
      operation: Operation.CALL,
      origin: null,
      txData: txData,
    };

    const ethAdapter = new Web3(provider);

    const safeInstance = new ethAdapter.eth.Contract(Safe.abi, vaultAddress, provider);

    const isFinalization = await canExecuteCreatedTx(safeInstance, SafeNonce);

    const txArgs = {
      safeInstance: safeInstance,
      to: txProps.to,
      valueInWei: txProps.valueInWei,
      data: txProps.txData,
      operation: txProps.operation,
      nonce: Number.parseInt(SafeNonce),
      safeTxGas: txProps.safeTxGas,
      baseGas: "0",
      gasPrice: "0",
      gasToken: ZERO_ADDRESS,
      refundReceiver: ZERO_ADDRESS,
      sender: account,
      // We're making a new tx, so there are no other signatures
      // Just pass our own address for an unsigned execution
      // Contract will compare the sender address to this
      sigs: getPreValidatedSignatures(account),
      tokenId: NFT.token_id,
    };

    const promiEvent = await getExecutionTransaction(txArgs).send({ from: account });
    const result = new Promise((resolve, reject) => {
      promiEvent.once("transactionHash", resolve); // this happens much faster than receipt
      promiEvent.once("error", reject);
    });

    await result;
    console.log(await safeInstance.getPastEvents("allEvents"));
  } catch (err) {
    console.log(err);
    const ethAdapter = new Web3(provider);

    const safeInstance = new ethAdapter.eth.Contract(Safe.abi, vaultAddress);
    console.log(await safeInstance.getPastEvents("allEvents"));

    return;
  }
};

module.exports = {
  createVault,
  transferNFTFromVault,
};
