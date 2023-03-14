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
    PayLaterLoanLibrary: "0x89127aFf4d8894A539038144CEA510cfCa9A565b",
    FeeController: "0x5893535e1C58e11FCc3487476CE8996842dcd209",
    PayLaterLoanCore: "0x3D81c70943840A65F6901a827209e9D8778F1Afb",
    RepaymentController: "0x4fA3d13a87c5E8e41a6E59e5BDA5A8Aa4c484bd2",
    OriginationManager: "0xCb071c909650b79DAc916c53625e1248994442bc",
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
    FeeController: "0x03F7C2604e2cA8527776CdCbc73Add3455e37FCA",
    PayLaterLoanCore: "0x4C57237f7fcFE8760dc99dFF9B3881472dD1ac15",
    RepaymentController: "0xF91ac6F56E3F26388c5B2e149944DC250856054f",
    OriginationManager: "0x69e78639F22cfaecc0cB57a2f8c9e2ffcD2C5aC5",
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
