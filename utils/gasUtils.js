const Web3 = require("web3");
const { fromWei, toWei } = require("web3-utils");
const axios = require("axios");
const { List } = require("immutable");
const { ethers } = require("ethers");
const { BigNumber } = require("bignumber.js");
const semverSatisfies = require("semver/functions/satisfies");
const { postSafeGasEstimation, Operation, FEATURES } = require("@gnosis.pm/safe-react-gateway-sdk");
const ERC20Contract = require("@openzeppelin/contracts/build/contracts/ERC20.json");
const ERC721Contract = require("@openzeppelin/contracts/build/contracts/ERC721.json");

const SafeProxyFactory = require("../artifacts/SafeProxyFactory.json");
const Safe = require("../artifacts/Safe.json");
const { checksumAddress } = require("./index");

// constants
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const SAFE_VERSION_FOR_OFF_CHAIN_SIGNATURES = ">=1.0.0";
const GATEWAY_URL = "https://safe-client.gnosis.io";
const DEFAULT_MAX_GAS_FEE = 3.5e9; // 3.5 GWEI
const DEFAULT_MAX_PRIO_FEE = 2.5e9; // 2.5 GWEI
const ParametersStatus = "ENABLED" | "DISABLED" | "SAFE_DISABLED" | "ETH_HIDDEN" | "CANCEL_TRANSACTION";

const EstimationStatus = {
  LOADING: "LOADING",
  FAILURE: "FAILURE",
  SUCCESS: "SUCCESS",
};

const TX_NOTIFICATION_TYPES = {
  STANDARD_TX: "STANDARD_TX",
  CONFIRMATION_TX: "CONFIRMATION_TX",
  CANCELLATION_TX: "CANCELLATION_TX",
  WAITING_TX: "WAITING_TX",
  SETTINGS_CHANGE_TX: "SETTINGS_CHANGE_TX",
  NEW_SPENDING_LIMIT_TX: "NEW_SPENDING_LIMIT_TX",
  REMOVE_SPENDING_LIMIT_TX: "REMOVE_SPENDING_LIMIT_TX",
  SAFE_NAME_CHANGE_TX: "SAFE_NAME_CHANGE_TX",
  OWNER_NAME_CHANGE_TX: "OWNER_NAME_CHANGE_TX",
  ADDRESS_BOOK_NEW_ENTRY: "ADDRESS_BOOK_NEW_ENTRY",
  ADDRESS_BOOK_EDIT_ENTRY: "ADDRESS_BOOK_EDIT_ENTRY",
  ADDRESS_BOOK_DELETE_ENTRY: "ADDRESS_BOOK_DELETE_ENTRY",
  ADDRESS_BOOK_EXPORT_ENTRIES: "ADDRESS_BOOK_EXPORT_ENTRIES",
  ADDRESS_BOOK_IMPORT_ENTRIES: "ADDRESS_BOOK_IMPORT_ENTRIES",
};

const EIP712_NOT_SUPPORTED_ERROR_MSG = "EIP712 is not supported by user's wallet";

const EIP712_DOMAIN_BEFORE_V130 = [
  {
    type: "address",
    name: "verifyingContract",
  },
];

const EIP712_DOMAIN = [
  {
    type: "uint256",
    name: "chainId",
  },
  {
    type: "address",
    name: "verifyingContract",
  },
];

// https://github.com/gnosis/safe-contracts/blob/main/docs/error_codes.md
const CONTRACT_ERRORS = {
  // General init related
  GS000: "Could not finish initialization",
  GS001: "Threshold needs to be defined",

  // General gas/ execution related
  GS010: "Not enough gas to execute Safe transaction",
  GS011: "Could not pay gas costs with ether",
  GS012: "Could not pay gas costs with token",
  GS013: "Safe transaction failed when gasPrice and safeTxGas were 0",

  // General signature validation related
  GS020: "Signatures data too short",
  GS021: "Invalid contract signature location = inside static part",
  GS022: "Invalid contract signature location = length not present",
  GS023: "Invalid contract signature location = data not complete",
  GS024: "Invalid contract signature provided",
  GS025: "Hash has not been approved",
  GS026: "Invalid owner provided",

  // General auth related
  GS030: "Only owners can approve a hash",
  GS031: "Method can only be called from this contract",

  // Module management related
  GS100: "Modules have already been initialized",
  GS101: "Invalid module address provided",
  GS102: "Module has already been added",
  GS103: "Invalid prevModule, module pair provided",
  GS104: "Method can only be called from an enabled module",

  // Owner management related
  GS200: "Owners have already been setup",
  GS201: "Threshold cannot exceed owner count",
  GS202: "Threshold needs to be greater than 0",
  GS203: "Invalid owner address provided",
  GS204: "Address is already an owner",
  GS205: "Invalid prevOwner, owner pair provided",

  // Guard management related
  GS300: "Guard does not implement IERC165",

  // Loan mortgage Related
  GS007: "You cannot transfer NFT with on going loan or mortgage",
};

const CONTRACT_ERROR_CODES = Object.keys(CONTRACT_ERRORS);

const isEnabledByVersion = (feature, version) => {
  if (!(feature in FEATURES_BY_VERSION)) return true;
  return semverSatisfies(version, FEATURES_BY_VERSION[feature]);
};

const enabledFeatures = (version, currentChain) => {
  const chainFeatures = currentChain.features;
  if (!version) return chainFeatures;
  return chainFeatures.filter((feat) => isEnabledByVersion(feat, version));
};

const hasFeature = (name, version, currentChain) => {
  return enabledFeatures(version, currentChain).includes(name);
};

const isMaxFeeParam = (safeVersion, currentChain) => {
  return hasFeature(FEATURES.EIP1559, safeVersion, currentChain);
};

const createSendParams = (from, txParams, currentChain) => {
  const sendParams = {
    from,
    value: 0,
    gas: txParams.ethGasLimit,
    nonce: txParams.ethNonce,
  };

  if (isMaxFeeParam("1.3.0", currentChain)) {
    sendParams.maxPriorityFeePerGas = txParams.ethMaxPrioFeeInGWei;
    sendParams.maxFeePerGas = txParams.ethGasPriceInGWei;
  } else {
    sendParams.gasPrice = txParams.ethGasPriceInGWei;
  }

  return sendParams;
};

const calculateGasOf = async (txConfig, provider) => {
  try {
    const ethAdapter = new Web3(provider);
    return await ethAdapter.eth.estimateGas(txConfig);
  } catch (err) {
    //   throw new CodedException(Errors._612, err.message)
    console.log(err);
  }
};

const estimateGasForDeployingSafe = (
  addresses,
  numOwners,
  userAccount,
  safeCreationSalt,
  provider,
  proxyFactoryData,
) => {
  return calculateGasOf(
    {
      data: proxyFactoryData,
      from: userAccount,
      to: SafeProxyFactory.defaultAddress,
    },
    provider,
  ).then((value) => value * 2);
};

const fetchGasPrice = async (gasPriceOracle) => {
  const { uri, gasParameter, gweiFactor } = gasPriceOracle;
  const { data: response } = await axios.get(uri);
  const data = response.data || response.result || response; // Sometimes the data comes with a data parameter

  const gasPrice = new BigNumber(data[gasParameter]).multipliedBy(gweiFactor);
  if (gasPrice.isNaN()) {
    throw new Error("Fetched gas price is NaN");
  }
  return gasPrice.toString();
};

const getGasPriceOracles = (currentChain) => {
  return currentChain.gasPrice.filter((gasPrice) => gasPrice.type == "ORACLE");
};

const getFixedGasPrice = (currentChain) => {
  return currentChain.gasPrice.filter((gasPrice) => gasPrice.type == "FIXED")[0];
};

const calculateGasPrice = async (currentChain, provider) => {
  const gasPriceOracles = getGasPriceOracles(currentChain);

  if (gasPriceOracles.length > 0) {
    for (const gasPriceOracle of gasPriceOracles) {
      try {
        const fetchedGasPrice = await fetchGasPrice(gasPriceOracle);
        return fetchedGasPrice;
      } catch (err) {
        // Keep iterating price oracles
      }
    }
  }
  // A fallback to fixed gas price from the chain config
  const fixedGasPrice = getFixedGasPrice(currentChain);
  if (fixedGasPrice) {
    return fixedGasPrice.weiValue;
  }

  // A fallback based on the median of a few last blocks
  const web3ReadOnly = new Web3(provider);
  return await web3ReadOnly.eth.getGasPrice();
};

const getFeesPerGas = async (provider) => {
  let blocks;
  let maxPriorityFeePerGas;
  let baseFeePerGas;

  const web3 = new Web3(provider);

  try {
    // Lastest block, 50th reward percentile
    blocks = await web3.eth.getFeeHistory(1, "latest", [50]);

    // hexToNumber can throw if not parsing a valid hex string
    baseFeePerGas = parseInt(blocks.baseFeePerGas[0]);
    maxPriorityFeePerGas = parseInt(blocks.reward[0][0]);
  } catch (err) {
    console.log(err);
  }

  if (!blocks || !maxPriorityFeePerGas || isNaN(maxPriorityFeePerGas) || !baseFeePerGas || isNaN(baseFeePerGas)) {
    return {
      maxFeePerGas: DEFAULT_MAX_GAS_FEE,
      maxPriorityFeePerGas: DEFAULT_MAX_PRIO_FEE,
    };
  }

  return {
    maxFeePerGas: baseFeePerGas + maxPriorityFeePerGas,
    maxPriorityFeePerGas,
  };
};

const setMaxPrioFeePerGas = (maxPriorityFeePerGas, maxFeePerGas) => {
  return maxPriorityFeePerGas > maxFeePerGas ? maxFeePerGas : maxPriorityFeePerGas;
};

const getNativeCurrency = (currentChain) => {
  return currentChain.nativeCurrency;
};

// Locale is an empty array because we want it to use user's locale
const lt1kFormatter = new Intl.NumberFormat([], { maximumFractionDigits: 5 });
const lt10kFormatter = new Intl.NumberFormat([], { maximumFractionDigits: 4 });
const lt100kFormatter = new Intl.NumberFormat([], { maximumFractionDigits: 3 });
const lt1mFormatter = new Intl.NumberFormat([], { maximumFractionDigits: 2 });
const lt10mFormatter = new Intl.NumberFormat([], { maximumFractionDigits: 1 });
const lt100mFormatter = new Intl.NumberFormat([], { maximumFractionDigits: 0 });
// same format for billions and trillions
const lt1000tFormatter = new Intl.NumberFormat([], { maximumFractionDigits: 3, notation: "compact" });

const formatAmount = (number) => {
  let numberFloat = parseFloat(number);

  if (numberFloat === 0) {
    numberFloat = "0";
  } else if (numberFloat < 0.001) {
    numberFloat = "< 0.001";
  } else if (numberFloat < 1000) {
    numberFloat = lt1kFormatter.format(numberFloat);
  } else if (numberFloat < 10000) {
    numberFloat = lt10kFormatter.format(numberFloat);
  } else if (numberFloat < 100000) {
    numberFloat = lt100kFormatter.format(numberFloat);
  } else if (numberFloat < 1000000) {
    numberFloat = lt1mFormatter.format(numberFloat);
  } else if (numberFloat < 10000000) {
    numberFloat = lt10mFormatter.format(numberFloat);
  } else if (numberFloat < 100000000) {
    numberFloat = lt100mFormatter.format(numberFloat);
  } else if (numberFloat < 10 ** 15) {
    numberFloat = lt1000tFormatter.format(numberFloat);
  } else {
    numberFloat = "> 1000T";
  }

  return numberFloat;
};

const fromTokenUnit = (amount, decimals) => new BigNumber(amount).times(`1e-${decimals}`).toFixed();

const options = { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 8 };
const usNumberFormatter = new Intl.NumberFormat("en-US", options);

const formatAmountInUsFormat = (amount) => {
  const numberFloat = parseFloat(amount);
  return usNumberFormatter.format(numberFloat)?.replace("$", "");
};

const estimateGas = async (
  userAccount,
  numOwners,
  safeCreationSalt,
  addresses,
  provider,
  proxyFactoryData,
  currentChain,
) => {
  const [gasEstimation, gasPrice, feesPerGas] = await Promise.all([
    estimateGasForDeployingSafe(addresses, numOwners, userAccount, safeCreationSalt, provider, proxyFactoryData),
    calculateGasPrice(currentChain, provider),
    getFeesPerGas(provider),
  ]);
  console.log(gasEstimation);
  const estimatedGasCosts = gasEstimation * parseInt(gasPrice, 10);
  const maxPrioFeePerGas = setMaxPrioFeePerGas(feesPerGas.maxPriorityFeePerGas, parseInt(gasPrice, 10));
  const nativeCurrency = getNativeCurrency(currentChain);
  const gasCost = fromTokenUnit(estimatedGasCosts, nativeCurrency.decimals);
  const gasCostFormatted = formatAmount(gasCost);

  console.log({
    maxPrioFeePerGas,
  });

  return {
    gasPrice,
    gasEstimation,
    gasCostFormatted,
    gasLimit: gasEstimation,
    gasMaxPrioFee: maxPrioFeePerGas,
    gasMaxPrioFeeFormatted: formatAmount(maxPrioFeePerGas.toString()),
  };
};

const EstimateSafeCreationGas = async ({
  addresses,
  numOwners,
  safeCreationSalt,
  provider,
  proxyFactoryData,
  currentChain,
}) => {
  var gasEstimation = {
    gasEstimation: 0,
    gasCostFormatted: "< 0.001",
    gasLimit: 0,
    gasPrice: "0",
    gasMaxPrioFee: 0,
    gasMaxPrioFeeFormatted: "0",
  };
  const userAccount = addresses[0];
  // Serialize the addresses array so that it doesn't trigger the effect due to the dependencies
  const addressesSerialized = JSON.stringify(addresses);

  const addressesList = JSON.parse(addressesSerialized);
  if (!addressesList.length || !numOwners || !userAccount) {
    return;
  }
  await estimateGas(
    userAccount,
    numOwners,
    safeCreationSalt,
    addressesList,
    provider,
    proxyFactoryData,
    currentChain,
  )?.then((res) => {
    gasEstimation.gasEstimation = res.gasEstimation;
    gasEstimation.gasCostFormatted = res.gasCostFormatted;
    gasEstimation.gasLimit = res.gasLimit;
    gasEstimation.gasPrice = res.gasPrice;
    gasEstimation.gasMaxPrioFee = res.gasMaxPrioFee;
    gasEstimation.gasMaxPrioFeeFormatted = res.gasMaxPrioFeeFormatted;
  });

  console.log({
    gasEstimation,
  });

  return gasEstimation;
};

const CanTxExecute = (preApprovingOwner, txConfirmations, SafeNonce, existingTxThreshold, txNonce) => {
  // const safeInfo = useSelector(currentSafe)

  if (txNonce && parseInt(txNonce, 10) !== SafeNonce) {
    return false;
  }

  // A tx might have been created with a threshold that is different than the current policy
  // If an existing tx threshold isn't passed, take the current safe threshold
  const threshold = existingTxThreshold ?? 1; //safeInfo.threshold

  if (txConfirmations >= threshold) {
    return true;
  }

  // When having a preApprovingOwner it is needed one less confirmation to execute the tx
  if (preApprovingOwner) {
    return txConfirmations + 1 === threshold;
  }

  return false;
};

const checkIfOffChainSignatureIsPossible = (isExecution, isSmartContractWallet, safeVersion) => {
  return (
    !isExecution &&
    !isSmartContractWallet &&
    !!safeVersion &&
    semverSatisfies(safeVersion, SAFE_VERSION_FOR_OFF_CHAIN_SIGNATURES)
  );
};

const sameString = (str1, str2) => {
  if (!str1 || !str2) {
    return false;
  }

  return str1.toLowerCase() === str2.toLowerCase();
};

const isSpendingLimit = (txType) => sameString(txType, "spendingLimit");

const checkIfTxIsCreation = (txConfirmations, txType) => txConfirmations === 0 && !isSpendingLimit(txType);

const getDefaultGasEstimation = ({
  txEstimationExecutionStatus,
  gasPrice,
  gasPriceFormatted,
  gasMaxPrioFee,
  gasMaxPrioFeeFormatted,
  isCreation = false,
  isOffChainSignature = false,
}) => {
  return {
    txEstimationExecutionStatus,
    gasEstimation: "0",
    gasCost: "0",
    gasCostFormatted: "< 0.001",
    gasPrice,
    gasPriceFormatted,
    gasMaxPrioFee,
    gasMaxPrioFeeFormatted,
    gasLimit: "0",
    isCreation,
    isOffChainSignature,
    canTxExecute: false,
  };
};

const checkIfTxIsApproveAndExecution = (threshold, txConfirmations, txType, preApprovingOwner) => {
  if (txConfirmations === threshold) return false;
  if (!preApprovingOwner) return false;
  return txConfirmations + 1 === threshold || isSpendingLimit(txType);
};

const fetchSafeTxGasEstimation = async ({ safeAddress, currentChainId, ...body }) => {
  return postSafeGasEstimation(GATEWAY_URL, currentChainId, checksumAddress(safeAddress), body);
};

const FEATURES_BY_VERSION = {
  [FEATURES.SAFE_TX_GAS_OPTIONAL]: ">=1.3.0",
};

const estimateSafeTxGas = async (
  { safeAddress, txData, txRecipient, txAmount, operation },
  safeVersion,
  currentChainId,
  currentChain,
) => {
  if (hasFeature(FEATURES.SAFE_TX_GAS_OPTIONAL, safeVersion, currentChain)) {
    return "0";
  }

  try {
    const { safeTxGas } = await fetchSafeTxGasEstimation({
      safeAddress,
      to: checksumAddress(txRecipient),
      value: txAmount,
      data: txData,
      operation,
      currentChainId,
    });

    return safeTxGas;
  } catch (error) {
    console.info("Error calculating tx gas estimation", error.message);
    throw error;
  }
};
const EMPTY_DATA = "0x";

const getPreValidatedSignatures = (from, initialString = EMPTY_DATA) => {
  console.log(from);
  return `${EMPTY_DATA}000000000000000000000000${from?.replace(
    EMPTY_DATA,
    "",
  )}000000000000000000000000000000000000000000000000000000000000000001`;
};

const generateSignaturesFromTxConfirmations = (confirmations, preApprovingOwner) => {
  let confirmationsMap =
    confirmations?.map((value) => {
      return {
        signature: value.signature,
        owner: value.owner.toLowerCase(),
      };
    }) || List([]);

  if (preApprovingOwner) {
    confirmationsMap = confirmationsMap.push({ owner: preApprovingOwner, signature: null });
  }

  // The constant parts need to be sorted so that the recovered signers are sorted ascending
  // (natural order) by address (not checksummed).
  confirmationsMap = confirmationsMap.sort((ownerA, ownerB) => ownerA.owner.localeCompare(ownerB.owner));

  let sigs = "0x";
  confirmationsMap.forEach(({ signature, owner }) => {
    if (signature) {
      sigs += signature.slice(2);
    } else {
      // https://docs.gnosis.io/safe/docs/contracts_signatures/#pre-validated-signatures
      sigs += getPreValidatedSignatures(owner, "");
    }
  });

  return sigs;
};

const estimateGasForTransactionExecution = async ({
  safeAddress,
  safeVersion,
  txRecipient,
  txConfirmations,
  txAmount,
  txData,
  operation,
  from,
  gasPrice,
  gasToken,
  refundReceiver,
  safeTxGas,
  approvalAndExecution,
  provider,
}) => {
  // const safeInstance = getGnosisSafeInstanceAt(safeAddress, safeVersion);
  const ethAdapter = new Web3(provider);

  const safeInstance = new ethAdapter.eth.Contract(Safe.abi, safeAddress);

  // If it's approvalAndExecution we have to add a preapproved signature else we have all signatures
  const sigs = generateSignaturesFromTxConfirmations(txConfirmations, approvalAndExecution ? from : undefined);

  const estimationData = safeInstance.methods
    .execTransaction(txRecipient, txAmount, txData, operation, safeTxGas, 0, gasPrice, gasToken, refundReceiver, sigs)
    .encodeABI();

  return calculateGasOf(
    {
      data: estimationData,
      from,
      to: safeAddress,
    },
    provider,
  );
};

const estimateGasForTransactionApproval = async ({
  safeAddress,
  safeVersion,
  txRecipient,
  txAmount,
  txData,
  operation,
  from,
  provider,
}) => {
  const ethAdapter = new Web3(provider);

  const safeInstance = new ethAdapter.eth.Contract(Safe.abi, safeAddress);
  // const safeInstance = getGnosisSafeInstanceAt(safeAddress, safeVersion)

  const nonce = await safeInstance.methods.nonce().call();

  const txHash = await safeInstance.methods
    .getTransactionHash(txRecipient, txAmount, txData, operation, 0, 0, 0, ZERO_ADDRESS, ZERO_ADDRESS, nonce)
    .call({
      from,
    });

  const approveTransactionTxData = safeInstance.methods.approveHash(txHash).encodeABI();

  return calculateGasOf(
    {
      data: approveTransactionTxData,
      from,
      to: safeAddress,
    },
    provider,
  );
};

const estimateTransactionGasLimit = async ({
  txData,
  safeAddress,
  safeVersion,
  txRecipient,
  txConfirmations,
  txAmount,
  operation,
  gasPrice,
  gasToken,
  refundReceiver,
  safeTxGas,
  from,
  isExecution,
  approvalAndExecution,
  provider,
}) => {
  if (!from) {
    throw new Error("No from provided for approving or execute transaction");
  }

  if (isExecution) {
    return estimateGasForTransactionExecution({
      safeAddress,
      safeVersion,
      txRecipient,
      txConfirmations,
      txAmount,
      txData,
      operation,
      from,
      gasPrice: gasPrice || "0",
      gasToken: gasToken || ZERO_ADDRESS,
      refundReceiver: refundReceiver || ZERO_ADDRESS,
      safeTxGas: safeTxGas || "0",
      approvalAndExecution,
      provider,
    });
  }

  return estimateGasForTransactionApproval({
    safeAddress,
    safeVersion,
    operation,
    txData,
    txAmount,
    txRecipient,
    from,
    provider,
  });
};

const calculateTotalGasCost = (gasLimit, gasPrice, gasMaxPrioFee, decimals) => {
  const totalPricePerGas = parseInt(gasPrice, 10) + parseInt(gasMaxPrioFee || "0", 10);
  const estimatedGasCosts = parseInt(gasLimit, 10) * totalPricePerGas;
  const gasCost = fromTokenUnit(estimatedGasCosts, decimals);
  const formattedGasCost = formatAmount(gasCost);
  return [gasCost, formattedGasCost];
};

const checkTransactionExecution = async ({
  safeAddress,
  safeVersion,
  txRecipient,
  txConfirmations,
  txAmount,
  txData,
  operation,
  from,
  gasPrice,
  gasToken,
  gasLimit,
  refundReceiver,
  safeTxGas,
  approvalAndExecution,
  provider,
}) => {
  const ethAdapter = new Web3(provider);

  const safeInstance = new ethAdapter.eth.Contract(Safe.abi, safeAddress);

  // const safeInstance = getGnosisSafeInstanceAt(safeAddress, safeVersion)
  // If it's approvalAndExecution we have to add a preapproved signature else we have all signatures
  const sigs = generateSignaturesFromTxConfirmations(txConfirmations, approvalAndExecution ? from : undefined);

  return safeInstance.methods
    .execTransaction(txRecipient, txAmount, txData, operation, safeTxGas, 0, gasPrice, gasToken, refundReceiver, sigs)
    .call({
      from,
      gas: gasLimit,
    })
    .catch(() => false);
};

const EstimateTransactionGas = async ({
  txRecipient,
  txData,
  txConfirmations,
  txAmount,
  preApprovingOwner,
  operation,
  safeTxGas,
  txType,
  manualGasPrice,
  manualMaxPrioFee,
  manualGasLimit,
  manualSafeNonce,
  currentChain,
  safeAddress,
  SafeNonce,
  provider,
  currentChainId,
  account,
}) => {
  if (!txData.length) {
    return;
  }
  const nativeCurrency = currentChain.nativeCurrency;
  const threshold = 1;
  const smartContractWallet = true;
  const providerName = "Moralis";
  const canTxExecute = CanTxExecute(preApprovingOwner, txConfirmations?.size, SafeNonce);
  const safeVersion = "1.3.0";
  const isOffChainSignature = checkIfOffChainSignatureIsPossible(canTxExecute, smartContractWallet, safeVersion);
  const isCreation = checkIfTxIsCreation(txConfirmations?.size || 0, txType);

  const { maxPriorityFeePerGas, maxFeePerGas } = await getFeesPerGas(provider);
  const maxPrioFeePerGas = setMaxPrioFeePerGas(maxPriorityFeePerGas, maxFeePerGas);
  let gasEstimation;

  if (isOffChainSignature && !isCreation) {
    gasEstimation = getDefaultGasEstimation({
      txEstimationExecutionStatus: EstimationStatus.SUCCESS,
      gasPrice: fromWei(maxFeePerGas.toString(), "gwei"),
      gasPriceFormatted: maxFeePerGas.toString(),
      gasMaxPrioFee: fromWei(maxPrioFeePerGas.toString(), "gwei"),
      gasMaxPrioFeeFormatted: maxPrioFeePerGas.toString(),
      isCreation,
      isOffChainSignature,
    });

    return;
  }

  const approvalAndExecution = checkIfTxIsApproveAndExecution(
    Number(threshold),
    txConfirmations?.size || 0,
    txType,
    preApprovingOwner,
  );

  try {
    let safeTxGasEstimation = safeTxGas || "0";
    let ethGasLimitEstimation = 0;
    let transactionCallSuccess = true;
    let txEstimationExecutionStatus = EstimationStatus.LOADING;
    if (isCreation) {
      safeTxGasEstimation = await estimateSafeTxGas(
        {
          safeAddress,
          txData,
          txRecipient,
          txAmount: txAmount || "0",
          operation: operation || Operation.CALL,
        },
        safeVersion,
        currentChainId,
        currentChain,
      );
    }

    if (canTxExecute || approvalAndExecution) {
      ethGasLimitEstimation = await estimateTransactionGasLimit({
        safeAddress,
        safeVersion,
        txRecipient,
        txData,
        txAmount: txAmount || "0",
        txConfirmations,
        isExecution: canTxExecute,
        operation: operation || Operation.CALL,
        from: account,
        safeTxGas: safeTxGasEstimation,
        approvalAndExecution,
        provider,
      });
    }

    const gasPrice = manualGasPrice ? toWei(manualGasPrice, "gwei") : await calculateGasPrice(currentChain, provider);
    const gasPriceFormatted = fromWei(gasPrice, "gwei");
    const gasMaxPrioFee = isMaxFeeParam(safeVersion, currentChain)
      ? manualMaxPrioFee
        ? toWei(manualMaxPrioFee, "gwei")
        : setMaxPrioFeePerGas(maxPriorityFeePerGas, parseInt(gasPrice)).toString()
      : "0";
    const gasMaxPrioFeeFormatted = fromWei(gasMaxPrioFee.toString(), "gwei");
    const gasLimit = manualGasLimit || ethGasLimitEstimation.toString();
    const [gasCost, gasCostFormatted] = calculateTotalGasCost(
      gasLimit,
      gasPrice,
      gasMaxPrioFee,
      nativeCurrency.decimals,
    );

    if (canTxExecute) {
      transactionCallSuccess = await checkTransactionExecution({
        safeAddress,
        safeVersion,
        txRecipient,
        txData,
        txAmount: txAmount || "0",
        txConfirmations,
        operation: operation || Operation.CALL,
        account,
        gasPrice: "0",
        gasToken: ZERO_ADDRESS,
        gasLimit,
        refundReceiver: ZERO_ADDRESS,
        safeTxGas: safeTxGasEstimation,
        approvalAndExecution,
        provider,
      });
    }

    txEstimationExecutionStatus = transactionCallSuccess ? EstimationStatus.SUCCESS : EstimationStatus.FAILURE;

    gasEstimation = {
      txEstimationExecutionStatus,
      gasEstimation: safeTxGasEstimation,
      gasCost,
      gasCostFormatted,
      gasPrice,
      gasPriceFormatted,
      gasMaxPrioFee,
      gasMaxPrioFeeFormatted,
      gasLimit,
      isCreation,
      isOffChainSignature,
      canTxExecute,
    };
  } catch (err) {
    console.warn(err.message);
    gasEstimation = getDefaultGasEstimation({
      txEstimationExecutionStatus: EstimationStatus.FAILURE,
      gasPrice: maxFeePerGas.toString(),
      gasPriceFormatted: fromWei(maxFeePerGas.toString(), "gwei"),
      gasMaxPrioFee: maxPrioFeePerGas.toString(),
      gasMaxPrioFeeFormatted: fromWei(maxPrioFeePerGas.toString(), "gwei"),
    });
  }

  return gasEstimation;
};

const sameAddress = (firstAddress, secondAddress) => {
  return sameString(firstAddress, secondAddress);
};
const CHAIN_ID = {
  UNKNOWN: "0",
  ETHEREUM: "1",
  RINKEBY: "4",
  VOLTA: "73799",
};
const CK_ADDRESS = {
  [CHAIN_ID.ETHEREUM]: "0x06012c8cf97bead5deae237070f9587f8e7a266d",
  [CHAIN_ID.RINKEBY]: "0x16baf0de678e52367adc69fd067e5edd1d33e3bf",
};

const SAFE_TRANSFER_FROM_WITHOUT_DATA_HASH = "42842e0e";

const getTransferMethodByContractAddress = (contractAddress, currentChainId) => {
  if (sameAddress(contractAddress, CK_ADDRESS[currentChainId])) {
    // on mainnet `transferFrom` seems to work fine but we can assure that `transfer` will work on both networks
    // so that's the reason why we're falling back to `transfer` for CryptoKitties
    return "transfer";
  }

  return `0x${SAFE_TRANSFER_FROM_WITHOUT_DATA_HASH}`;
};

const createERC20TokenContract = (tokenAddress, provider) => {
  // const web3 = getWeb3()
  const web3 = new Web3(provider);

  return new web3.eth.Contract(ERC20Contract.abi, tokenAddress);
};

const createERC721TokenContract = (tokenAddress, provider) => {
  // const web3 = getWeb3()
  const web3 = new Web3(provider);

  return new web3.eth.Contract(ERC721Contract.abi, tokenAddress);
};

const getERC20TokenContract = createERC20TokenContract;

const getERC721TokenContract = createERC721TokenContract;

const generateERC721TransferTxData = async (tx, safeAddress, currentChainId, provider) => {
  if (!safeAddress) {
    throw new Error("Failed to build NFT transfer tx data. SafeAddress is not defined.");
  }

  const methodToCall = getTransferMethodByContractAddress(tx.token_address, currentChainId);
  let transferParams = [tx.recipientAddress, tx.token_id];
  let NFTTokenInstance;

  if (methodToCall.includes(SAFE_TRANSFER_FROM_WITHOUT_DATA_HASH)) {
    // we add the `from` param for the `safeTransferFrom` method call
    transferParams = [safeAddress, ...transferParams];
    NFTTokenInstance = getERC721TokenContract(tx.token_address, provider);
  } else {
    // we fallback to an ERC20 Token contract whose ABI implements the `transfer` method
    NFTTokenInstance = getERC20TokenContract(tx.token_address, provider);
  }

  return NFTTokenInstance.methods[methodToCall](...transferParams).encodeABI();
};

const getRecommendedNonce = async (safeAddress, currentChainId) => {
  const { recommendedNonce } = await fetchSafeTxGasEstimation({
    safeAddress,
    value: "0",
    operation: Operation.CALL,
    // Workaround: use a cancellation transaction to fetch only the recommendedNonce
    to: safeAddress,
    data: "0x",
    currentChainId,
  });
  return recommendedNonce;
};

const getUserNonce = async (userAddress, provider) => {
  const web3 = new Web3(provider);
  try {
    return await web3.eth.getTransactionCount(userAddress, "pending");
  } catch (error) {
    return Promise.reject(error);
  }
};

const TransactionParameters = async (props) => {
  let connectedWalletAddress = props?.connectedWalletAddress;
  let safeAddress = props?.safeAddress;

  let safeNonce = props?.initialSafeNonce;
  let safeTxGas = props?.initialSafeTxGas;
  let ethNonce;
  let ethGasLimit = props?.initialEthGasLimit;
  let ethGasPrice = props?.initialEthGasPrice;
  let ethGasPriceInGWei;
  let ethMaxPrioFee = props?.initialEthMaxPrioFee;
  let ethMaxPrioFeeInGWei;

  // Get nonce for connected wallet
  const getNonce = async () => {
    const res = await getUserNonce(connectedWalletAddress, props?.provider);
    ethNonce = res.toString();
  };

  if (connectedWalletAddress) {
    await getNonce();
  }

  // Get ETH gas price
  if (!ethGasPrice) {
    ethGasPriceInGWei = undefined;
  }

  if (ethGasPrice) ethGasPriceInGWei = toWei(ethGasPrice, "Gwei");

  console.log(props);

  // Get max prio fee

  if (!ethMaxPrioFee) {
    ethMaxPrioFee = undefined;
  }
  if (ethMaxPrioFee) ethMaxPrioFeeInGWei = toWei(ethMaxPrioFee, "Gwei");

  // Calc safe nonce
  const getSafeNonce = async () => {
    if (safeAddress) {
      try {
        const recommendedNonce = (await getRecommendedNonce(safeAddress, props?.currentChainId)).toString();
        safeNonce = recommendedNonce;
      } catch (e) {
        console.log(e);
      }
    }
  };

  if (safeNonce === undefined) {
    await getSafeNonce();
  }

  return {
    safeNonce,
    safeTxGas,
    ethNonce,
    ethGasLimit,
    ethGasPrice,
    ethMaxPrioFee,
    ethGasPriceInGWei,
    ethMaxPrioFeeInGWei,
  };
};

const getParametersStatus = (isCreation, doExecute, isRejectTx = false) => {
  return isCreation && !isRejectTx
    ? doExecute
      ? "ENABLED"
      : "ETH_HIDDEN" // allow editing nonce when creating
    : doExecute
    ? "SAFE_DISABLED"
    : "DISABLED"; // when not creating, nonce cannot be edited
};

const canExecuteCreatedTx = async (
  safeInstance,
  nonce, // safe nonce
) => {
  const safeNonce = (await safeInstance.methods.nonce().call()).toString();
  const thresholdAsString = await safeInstance.methods.getThreshold().call();
  const threshold = Number(thresholdAsString);

  // Needs to collect owners signatures
  if (threshold > 1) {
    return false;
  }

  // Allow first tx.
  if (Number(nonce) === 0) {
    return true;
  }

  // Allow if nonce === safeNonce and threshold === 1
  if (nonce === safeNonce) {
    return true;
  }

  // If the previous tx is not executed or the difference between lastTx.nonce and nonce is > 1
  // it's delayed using the approval mechanism.
  // Once the previous tx is executed, the current tx will be available to be executed
  // by the user using the exec button.
  // if (lastTx && isMultisigExecutionInfo(lastTx.executionInfo)) {
  //   return lastTx.txStatus === LocalTransactionStatus.SUCCESS && lastTx.executionInfo.nonce + 1 === Number(nonce)
  // }

  return false;
};

const getEip712MessageTypes = (safeVersion) => {
  const eip712WithChainId = semverSatisfies(safeVersion, ">=1.3.0");

  return {
    EIP712Domain: eip712WithChainId ? EIP712_DOMAIN : EIP712_DOMAIN_BEFORE_V130,
    SafeTx: [
      { type: "address", name: "to" },
      { type: "uint256", name: "value" },
      { type: "bytes", name: "data" },
      { type: "uint8", name: "operation" },
      { type: "uint256", name: "safeTxGas" },
      { type: "uint256", name: "baseGas" },
      { type: "uint256", name: "gasPrice" },
      { type: "address", name: "gasToken" },
      { type: "address", name: "refundReceiver" },
      { type: "uint256", name: "nonce" },
    ],
  };
};

const generateTypedDataFrom = ({
  safeAddress,
  safeVersion,
  baseGas,
  data,
  gasPrice,
  gasToken,
  nonce,
  operation,
  refundReceiver,
  safeTxGas,
  to,
  valueInWei,
  currentChainId,
}) => {
  const networkId = Number(currentChainId);
  const eip712WithChainId = semverSatisfies(safeVersion, ">=1.3.0");

  const typedData = {
    types: getEip712MessageTypes(safeVersion),
    domain: {
      chainId: eip712WithChainId ? networkId : undefined,
      verifyingContract: safeAddress,
    },
    primaryType: "SafeTx",
    message: {
      to,
      value: valueInWei,
      data,
      operation,
      safeTxGas,
      baseGas,
      gasPrice,
      gasToken,
      refundReceiver,
      nonce: Number(nonce),
    },
  };

  return typedData;
};

const getApprovalTransaction = (safeInstance, txHash) => {
  try {
    return safeInstance.methods.approveHash(txHash);
  } catch (err) {
    console.error(`Error while approving transaction: ${err}`);
    throw err;
  }
};

const getExecutionTransaction = ({
  baseGas,
  data,
  gasPrice,
  gasToken,
  operation,
  refundReceiver,
  safeInstance,
  safeTxGas,
  sigs,
  to,
  valueInWei,
  tokenId,
}) => {
  try {
    return safeInstance.methods.execTransaction(
      to,
      valueInWei,
      data,
      operation,
      safeTxGas,
      baseGas,
      gasPrice,
      gasToken,
      refundReceiver,
      sigs,
      tokenId,
    );
  } catch (err) {
    console.error(`Error while creating transaction: ${err}`);

    throw err;
  }
};

const decodeMessage = (message) => {
  const code = CONTRACT_ERROR_CODES.find((code) => {
    return message.toUpperCase().includes(code.toUpperCase());
  });

  return code ? `${code}: ${CONTRACT_ERRORS[code]}` : message;
};

module.exports = {
  ZERO_ADDRESS,
  SAFE_VERSION_FOR_OFF_CHAIN_SIGNATURES,
  GATEWAY_URL,
  DEFAULT_MAX_GAS_FEE,
  DEFAULT_MAX_PRIO_FEE,
  ParametersStatus,
  EstimationStatus,
  TX_NOTIFICATION_TYPES,
  CONTRACT_ERRORS,
  CONTRACT_ERROR_CODES,
  enabledFeatures,
  hasFeature,
  isMaxFeeParam,
  calculateGasOf,
  createSendParams,
  estimateGasForDeployingSafe,
  getGasPriceOracles,
  getFixedGasPrice,
  calculateGasPrice,
  getFeesPerGas,
  setMaxPrioFeePerGas,
  getNativeCurrency,
  formatAmount,
  fromTokenUnit,
  formatAmountInUsFormat,
  EstimateSafeCreationGas,
  checkIfOffChainSignatureIsPossible,
  sameString,
  isSpendingLimit,
  checkIfTxIsCreation,
  checkIfTxIsApproveAndExecution,
  fetchSafeTxGasEstimation,
  estimateSafeTxGas,
  EMPTY_DATA,
  getPreValidatedSignatures,
  generateSignaturesFromTxConfirmations,
  estimateGasForTransactionApproval,
  estimateTransactionGasLimit,
  calculateTotalGasCost,
  checkTransactionExecution,
  EstimateTransactionGas,
  sameAddress,
  CHAIN_ID,
  CK_ADDRESS,
  SAFE_TRANSFER_FROM_WITHOUT_DATA_HASH,
  getTransferMethodByContractAddress,
  getERC20TokenContract,
  getERC721TokenContract,
  generateERC721TransferTxData,
  getRecommendedNonce,
  getUserNonce,
  TransactionParameters,
  getParametersStatus,
  canExecuteCreatedTx,
  getEip712MessageTypes,
  generateTypedDataFrom,
  getApprovalTransaction,
  getExecutionTransaction,
  decodeMessage,
};
