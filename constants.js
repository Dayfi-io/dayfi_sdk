const CHAIN_DETAILS = {
  80001: {
    chainId: "0x13881",
    rpcUrls: ["https://matic-mumbai.chainstacklabs.com"],
    chainName: "Mumbai",
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18,
    },
    blockExplorerUrls: ["https://mumbai.polygonscan.com/"],
  },
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const EMPTY_DATA = "0x";
const SALT = Date.now();

const NETWORK_MAP_DECIMAL = {
  1: "Eth mainnet",
  5: "Goerli",
  56: "Bsc mainnet",
  97: "Bsc testnet",
  137: "Matic main",
  80001: "Mumbai",
  43114: "Avalanche Mainnet",
  43113: "Avalanche test",
  250: "Fantom Mainnet",
  11155111: "Sepolia",
};

const DEPLOYED_ADDRESS = {
  5: {
    PayLaterLoanLibrary: "0xE4CCB02e634815F5767A66D7540810E8f4765Af1",
    FeeController: "0xBE126001b4f5D52CAc66369CBc68a38837a90b67",
    PayLaterLoanCore: "0x788ec6eE255bC1b6dCAC480CFD53c5c853db6872",
    RepaymentController: "0xe3D2c405B58d7AEf9d5e19E8fda31F18C10AE943",
    OriginationManager: "0xA606415C746316705e947175d6b353Bf95583464",
    SimulateTxAccessor: "0xE573239E53e92c5EE89B2410a01f3d26A6258BAD",
    GnosisSafeProxyFactory: "0xfAa0AD7089061e7AD02e70cde952000813613Ec8",
    DefaultCallbackHandler: "0xe4852b4e2F407B8FaacD1E4AFb377f1F6305b03C",
    CompatibilityFallbackHandler: "0xa761947daB45Fccb97ed756F3C7187a693F364B1",
    CreateCall: "0x56C3d5e642963b881c45E3b2F7FEC20aaD631F88",
    MultiSend: "0x126E23F23bF06d96B8E2F2dA5B7245dd2ecEAde6",
    MultiSendCallOnly: "0x9277f9B4860dF47C9DB0561a9e87429A99CeFDD1",
    SignMessageLib: "0xf3C2aB21A1caf8c7eDFD17E44C58E6344811D929",
    GnosisSafe: "0x2fA031a575c3800FCca4F1f3126aD90733539020",
  },
  80001: {
    PayLaterLoanLibrary: "0xE4CCB02e634815F5767A66D7540810E8f4765Af1",
    FeeController: "0xBE126001b4f5D52CAc66369CBc68a38837a90b67",
    PayLaterLoanCore: "0x788ec6eE255bC1b6dCAC480CFD53c5c853db6872",
    RepaymentController: "0xe3D2c405B58d7AEf9d5e19E8fda31F18C10AE943",
    OriginationManager: "0xA606415C746316705e947175d6b353Bf95583464",
    SimulateTxAccessor: "0xE573239E53e92c5EE89B2410a01f3d26A6258BAD",
    GnosisSafeProxyFactory: "0xfAa0AD7089061e7AD02e70cde952000813613Ec8",
    DefaultCallbackHandler: "0xe4852b4e2F407B8FaacD1E4AFb377f1F6305b03C",
    CompatibilityFallbackHandler: "0xa761947daB45Fccb97ed756F3C7187a693F364B1",
    CreateCall: "0x56C3d5e642963b881c45E3b2F7FEC20aaD631F88",
    MultiSend: "0x126E23F23bF06d96B8E2F2dA5B7245dd2ecEAde6",
    MultiSendCallOnly: "0x9277f9B4860dF47C9DB0561a9e87429A99CeFDD1",
    SignMessageLib: "0xf3C2aB21A1caf8c7eDFD17E44C58E6344811D929",
    GnosisSafe: "0x2fA031a575c3800FCca4F1f3126aD90733539020",
  },
};

const iframeBaseUrl = "https://main.d2qs3oix9e2v7x.amplifyapp.com";
const soketBackendUrl = "https://socket.sandbox.dayfi.io";

module.exports = {
  CHAIN_DETAILS,
  ZERO_ADDRESS,
  EMPTY_DATA,
  SALT,
  NETWORK_MAP_DECIMAL,
  DEPLOYED_ADDRESS,
  iframeBaseUrl,
  soketBackendUrl,
};
