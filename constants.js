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
    PayLaterLoanLibrary: "0x7de4dD9a24b52F9356e82Da3f4bc3aAAa6eC0CA7",
    FeeController: "0x207A1a829123583412C554A1895F40E9B1D1A2fc",
    PayLaterLoanCore: "0x3f4F62BE3821a7bf5C0E5fA7D9790e1d56b3320D",
    RepaymentController: "0x7B2CcD871a89Bd157358DDeD5D28d09fAa94B605",
    OriginationManager: "0xe43BA9D692B2cee83592ddEc0f9EdFc533c468AB",
    SimulateTxAccessor: "0x4a6C3AEb1e3049093e80Fe285EbB72fc182eD7Df",
    GnosisSafeProxyFactory: "0x1af4D613523F2De3bb79d0cD5d805c72131Bf781",
    DefaultCallbackHandler: "0x7CE667cFFb8ceD6b731115647eF4efAd56e117bD",
    CompatibilityFallbackHandler: "0xA2b1dd97Db11e910561c3E29535a928c5EF0394a",
    CreateCall: "0x519BA1522a048D212e063D45E2492d35C4e3E50F",
    MultiSend: "0x2978771BDC7f8e9807FEAf920202FDafB082D453",
    MultiSendCallOnly: "0x28b2F5751c6eD8B0bF6f82c4396a4C2880D0Fe03",
    SignMessageLib: "0x8b4f085C2b49D1c5F89d21f117122e3804443090",
    GnosisSafe: "0x5E2C94b38aBe6B4D8f7105D43c90D0Afd8B93E27",
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
const backendUrl = "https://backend.sandbox.dayfi.io";

const supportedCurrencies = [
  {
    // Ethereum mainnet
    "chainId": "0x1",
    "chainName": "Ethereum Mainnet",
    "currency": {
      "USDT": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      "wETH": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      "DAI": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      "ETH": "0x0000000000000000000000000000000000000000"
    }
  },
  {
    "chainId": "0x5",
    "chainName": "Ethereum Goreli Testnet",
    "currency": {
      "ETHGoreli": "0x0000000000000000000000000000000000000000"
    }
  },
  {
    "chainId": "0x137",
    "chainName": "Polygon Mainnet",
    "currency": {
      "MATIC": "0x0000000000000000000000000000000000000000"
    }
  },
  {
    "chainId": "0x80001",
    "chainName": "Polygon Mumbai Testnet",
    "currency": {
      "MATIC:mumbai": "0x0000000000000000000000000000000000000000"
    }
  }
];

const currencyKeys = ["MATIC", "MATIC:mumbai", "ETHGoreli", "USDT", "wETH", "DAI", "ETH"]

module.exports = {
  CHAIN_DETAILS,
  ZERO_ADDRESS,
  EMPTY_DATA,
  SALT,
  NETWORK_MAP_DECIMAL,
  DEPLOYED_ADDRESS,
  iframeBaseUrl,
  soketBackendUrl,
  backendUrl,
  supportedCurrencies,
  currencyKeys
};
