const { default: axios } = require("axios");
const io = require("socket.io-client");
const { iframeBaseUrl, soketBackendUrl, backendUrl, supportedCurrencies } = require("../constants");
const supportedChains = require('../utils/supportedChains.json');
const { ethers } = require("ethers");


const generateDayFiContainer = ({ url, height = "90vh", width = "90vw" }) => {
  const dayfiIframeWrapper = document.createElement("div");
  dayfiIframeWrapper.id = "dayfi-iframe-wrapper";
  dayfiIframeWrapper.style.position = "fixed";
  dayfiIframeWrapper.style.bottom = "50%";
  dayfiIframeWrapper.style.left = "50%";
  dayfiIframeWrapper.style.transform = "translate(-50%, 50%)";
  dayfiIframeWrapper.style.width = width;
  dayfiIframeWrapper.style.height = height;
  dayfiIframeWrapper.style.minHeight = "250px";
  dayfiIframeWrapper.style.boxShadow = "rgba(0, 0, 0, 0.16) 0px 5px 40px";
  dayfiIframeWrapper.style.zIndex = "2147483000";
  dayfiIframeWrapper.style.borderRadius = "16px";
  dayfiIframeWrapper.style.padding = "16px";
  dayfiIframeWrapper.style.backgroundColor = "#fff";

  const containerIframe = document.createElement("iframe");
  containerIframe.src = url;
  containerIframe.style.width = "100%";
  containerIframe.style.height = "100%";
  containerIframe.style.borderRadius = "16px";

  dayfiIframeWrapper.appendChild(containerIframe);

  return dayfiIframeWrapper;
};

const handleBNPLayout = async ({ type, partnerId, walletAddress, tokenDetails, chainName, chainId }) => {
  const socket = io(`${soketBackendUrl}/${partnerId}_${walletAddress}`);
  
  socket.on("pending_requests", async (request) => {
    const { id, method, params = {} } = request;
    if(method === "getTokenDetailsForListingNFT") {
      const result = await axios.get(`${backendUrl}/general/getNFTMetadataIndividual/${tokenDetails.token_id}/${tokenDetails.token_address}/${chainName}`);
      if(result) {
        socket.emit("request_fullfilled", {
          id,
          result: result.data.NFTMetaData,
        });
      }
    } else if(method === "getNFTDataForPayLater") {
      const NFTMetadataResponse = await axios.get(`${backendUrl}/general/getNFTMetadataIndividual/${tokenDetails.token_id}/${tokenDetails.token_address}/${chainName}`);
      const ListingDetails = await checkIsNFTListedForPayLater({
        partnerId,
        chainId,
        token_id: tokenDetails.token_id,
        token_address: tokenDetails.token_address,
        walletAddress
      });

      if(ListingDetails) {
        socket.emit("request_fullfilled", {
          id,
          type: "Listing Found",
          nftMetaData: NFTMetadataResponse.data.NFTMetaData,
          payLaterListingDetails: ListingDetails
        });
      } else {
        socket.emit("request_fullfilled", {
          id,
          type: "Listing Not Found",
          nftMetaData: NFTMetadataResponse.data.NFTMetaData
        });
      }
    }
  });

  const isVaultExists = await axios.get(`${backendUrl}/account/getAccount/${walletAddress}/${chainName}`);

  if(isVaultExists.data.message === "Account found") {

    const dayfiContainer = document.getElementById("dayfi-container");
    const dayfiIframeWrapper = generateDayFiContainer({
      url: `${iframeBaseUrl}/${type}/borrower?partnerId=${partnerId}&walletAddress=${walletAddress}`,
      height: "70vh",
      width: "90vw",
    });
    dayfiContainer.appendChild(dayfiIframeWrapper);

  } else if(isVaultExists.data.message === "Account not found") {

    const dayfiContainer = document.getElementById("dayfi-container");
    const dayfiIframeWrapper = generateDayFiContainer({
      url: `${iframeBaseUrl}/checkout/withVaultSetup?partnerId=${partnerId}&walletAddress=${walletAddress}`,
      height: "70vh",
      width: "90vw",
    });
    dayfiContainer.appendChild(dayfiIframeWrapper);

  }
};

const handleChainChange = async ({ socket, signer }) => {
  signer.provider.on("chainChanged", (newNetwork) => {
    socket.emit("request_fullfilled", {
      id: "chainChanged",
      chain: parseInt(newNetwork, 16),
    });
  });
};

const getSupportedChains = async () => {
  const chains = supportedChains.filter((chain) => chain.supported === true);

  return chains;
};

const checkIsSupportedChainByChainId = async ({rawChainId}) => {
  try {

    if(!rawChainId) {
      throw new Error("Please provide valid values for chainId")
    } else {
      // const chainId = rawChainId.split('0x')[1];
      let chainId;
      const rawChainDetails = rawChainId.split('0x');
      if(rawChainDetails.length > 1 && rawChainDetails.length <3) {
        chainId = rawChainId.split('0x')[1];
      } else if(rawChainDetails.length === 1) {
        chainId = rawChainId.split('0x')[0];
      }
      const resultingChain = supportedChains.filter((chain) => chain.chainId === chainId && chain.supported === true);
      if(!resultingChain.length > 0) {
        return false;
      } else {
        return true;
      }
    }
  } catch(error) {
    throw new Error(error);
  }
}

const checkIsSupportedChainByChainName = async ({chainName}) => {
  try {
    const Chains = await getSupportedChains();
    const isChainSupported = Chains.filter((chain) => chain.chainName === chainName);
    if(!(isChainSupported.length > 0)) {
      throw new Error(`Chain ${chainName} not supported`);
    } 

    return true;
    
  } catch(error) {
    throw new Error(error);
  }
}

const GetNFTMetadata = async ({tokenDetails, chainName}) => {
  try {
    // tokendetails verification check goes here
    const isChainSupported = await checkIsSupportedChainByChainName(chainName);
    if(isChainSupported) {
      const response = await axios.get(`${backendUrl}/general/getNFTMetadataIndividual/${tokenDetails.token_id}/${tokenDetails.token_address}/${chainName}`);
      return response.data.NFTMetaData;
    }
  } catch(error) {
    return false;
  }
};

const validateLenderTerms = async ({terms}) => {
    // Validate terms exists
    if(!terms) {
      throw new Error("Please provide valid terms");
      
    }

    // Price should be greater than 0 check
    if(!(parseFloat(terms.price) > 0.0)) {
      throw new Error("Price should be greater than zero");
    }

    // Interest should not exceed 20% check
    if(!(parseFloat(terms.interest) >= 0 && parseFloat(terms.interest) <= 20)) {
      throw new Error("Interest should be less than 20%");
    }

    // Supported chain check
    const Chains = await SupportedCurrencies();
    const isChainSupported = Chains.filter((chain) => chain.chainName === terms.chainName);
    if(!(isChainSupported.length > 0)) {
      throw new Error(`Chain ${terms.chainName} not supported`);
    }

    // Currency Support check
    if(!(Object.keys(isChainSupported[0].currency).includes(terms.currency))) {
      throw new Error(`Currency ${terms.currency} not supported on ${terms.chainName}`);
    }

    // Maximum installment 12 check
    if(parseInt(terms.maxInstallment) > 12) {
      throw new Error("Maximum Installments must be less than 12");
    }

    // Maximum 30 Days check
    if(parseInt(terms.maxDuration) > 30 && terms.durationType === "Days") {
      throw new Error("Maximum 30 Days allowed or choose month for longer duration");
    }

    // Maximum 12 months allowed
    if(parseInt(terms.maxDuration) > 12 && terms.durationType === "Months") {
      throw new Error("Maximum 12 Months allowed");
    }

    return true;
};

const SupportedCurrencies = async() => {
  return supportedCurrencies;
};

const isPartnerExists = async(partnerId) => {
  try {
    if(!partnerId) {
      return false;
    }
    const response = await axios.get(`${backendUrl}/partner/getPartnerByPartnerId/${partnerId}`);
    return response.data.partner;
  } catch(error) {
    return false;
  }
};

const validateNFT = async({
  userWallet,
  tokenDetails
}) => {
  try {

    const response = await axios.get(`https://api-goerli.etherscan.io/api?module=contract&action=getabi&address=${tokenDetails.token_address}&apikey=YFEE1QVDUKEAPVDU3IUUFH3UQKD35XIHKA`)

    if(response.data.result === 'Invalid Address format') {
        throw new Error('Invalid Contract address');
    } else {
        var isOwnerOffunctionExists = JSON.parse(response.data.result).find((object) => object.name === 'ownerOf');
        if(!isOwnerOffunctionExists) {
            throw new Error('Unable to verify NFT OwnerShip: Contract does not have ownerOf property');
        } else {
            const ABI = JSON.parse(response.data.result);

            const NFTContract = new ethers.Contract(tokenDetails.token_address, ABI, userWallet);   
            
            const currentOwnerAddress = await NFTContract.ownerOf(tokenDetails.token_id);
            if(currentOwnerAddress === await userWallet.getAddress()) {
              return true;
            } else {
              throw new Error("Owner mismatch: provided wallet does not hold the NFT");
            }
        }
    } 
  } catch(error) {
    console.error(error);
    throw new Error(error.message)
  }
}

const isOwnerOfNFT = async({
  tokenDetails,
  web3JSProvider,
  ethersSigner
}) => {
  try{

    let userWallet;

    if(web3JSProvider) {
      userWallet = (new ethers.providers.Web3Provider(web3JSProvider)).getSigner();
    } else if(ethersSigner) {
      userWallet = ethersSigner;
    } else {
      throw new Error("Please provie a valid web3JS provider or etherJS Signer")
    }

    const response = await axios.get(`https://api-goerli.etherscan.io/api?module=contract&action=getabi&address=${tokenDetails.token_address}&apikey=YFEE1QVDUKEAPVDU3IUUFH3UQKD35XIHKA`)

    if(response.data.result === 'Invalid Address format') {
        throw new Error('Invalid Contract address');
    } else {
        var isOwnerOffunctionExists = JSON.parse(response.data.result).find((object) => object.name === 'ownerOf');
        if(!isOwnerOffunctionExists) {
            throw new Error('Unable to verify NFT OwnerShip: Contract does not have ownerOf property');
        } else {
            const ABI = JSON.parse(response.data.result);

            const NFTContract = new ethers.Contract(tokenDetails.token_address, ABI, userWallet);   
            
            const currentOwnerAddress = await NFTContract.ownerOf(tokenDetails.token_id);
            if(currentOwnerAddress === await userWallet.getAddress()) {
              return true;
            } else {
              return false;
            }
        }
    } 
  } catch(error) {
    console.error(error);
    throw new Error(error.message)
  }

}

const getChainIdByChainName = ({ chainName }) => {
  const chains = supportedChains.filter((chain) => chain.chainName === chainName);
  if(chains.length > 0) {
    return parseInt(chains[0].chainId);
  } else {
    throw new Error("Chain not found: " + chainName);
  }
}

const checkIsNFTListedForPayLater = async({
  partnerId,
  chainId,
  token_id,
  token_address,
  walletAddress,
}) => {
  try {
    const isListedResponse = await axios.get(`${backendUrl}/paylater/checkIsNFTListed/${partnerId}/${chainId}/${token_id}/${token_address}/${walletAddress}`);
    
    if(isListedResponse.data.message === "NFT not Listed") {
      return false
    } else if(isListedResponse.data.message === "NFT already Listed") {
      return isListedResponse.data.PaylaterRequest;
    }
  } catch(error) {
    console.error(error);
    throw new Error(error.message)
  }
};

module.exports = {
  generateDayFiContainer,
  handleBNPLayout,
  handleChainChange,
  getSupportedChains,
  checkIsSupportedChainByChainId,
  GetNFTMetadata,
  validateLenderTerms,
  SupportedCurrencies,
  checkIsSupportedChainByChainName,
  isPartnerExists,
  validateNFT,
  getChainIdByChainName,
  checkIsNFTListedForPayLater,
  isOwnerOfNFT
};
