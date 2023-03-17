const { ethers } = require("ethers");
const { default: axios } = require("axios");
const io = require("socket.io-client");
const { iframeBaseUrl, soketBackendUrl, backendUrl } = require("./constants");
const { 
  checkIsSupportedChainByChainId,
  SupportedCurrencies,
  getSupportedChains,
  validateLenderTerms,
  checkIsSupportedChainByChainName,
  isPartnerExists,
  validateNFT,
  getChainIdByChainName,
  checkIsNFTListedForPayLater,
  isOwnerOfNFT,
  handleBNPLayout
} = require("./helpers/generalHelpers");
const {
  getApprovalForPayLaterTransfer
} = require("./helpers/requestHandlers");

let exeParams = {};
var Initialised = false;

const isInitialised = () => {
  if(!Initialised) {
    throw new Error("SDK Not Initialised");
  } 

  return Initialised;
};

const handleSignRequests = async ({ socket, signer }) => {
  socket.on("welcome", (msg) => console.log(msg));
  socket.on("pending_requests", async (req) => {
    const { id, method, params = {} } = req;
    try {
      const requestMethods = require(`./helpers/requestHandlers`);
      const requestHandler = requestMethods[method];

      if(requestHandler) {
        const res = await requestHandler({
          signer,
          ...params,
          ...exeParams,
        });
        if (res) {
          socket.emit("request_fullfilled", {
            id,
            result: res,
          });
        }
      }

    } catch (error) {
      console.error(error);
      socket.emit("request_fullfilled", {
        id,
        result: {
          type: "Error",
          error
        }
      });
    }
  });
};

const initialize = async({web3JSProvider, ethersSigner, partnerId, disabledMode}) => {
  try {
    let userWallet;

    if(web3JSProvider) {
      userWallet = (new ethers.providers.Web3Provider(web3JSProvider)).getSigner();
    } else if(ethersSigner) {
      userWallet = ethersSigner;
    } else {
      throw new Error("Please provie a valid web3JS provider or etherJS Signer")
    }

    if(!disabledMode) {
      if (!document.getElementById("dayfi-container")) {
        const dayfiContainer = document.createElement("div");
        dayfiContainer.id = "dayfi-container";
        document.body.appendChild(dayfiContainer);
      }
    }
    

    const isValidPartner = await isPartnerExists(partnerId);
    if(!isValidPartner) {
      throw new Error("Invalid Partner ID: " + partnerId);
    }
    const isChainSupported = await checkIsSupportedChainByChainId({rawChainId: `${userWallet.provider.network.chainId}`})
    if(!isChainSupported) {
      throw new Error(`Chain Id ${userWallet.provider.network.chainId} is not supported`)
    }

    userWallet.provider.on("chainChanged", async (newChain) => {
      const isChainSupported = await checkIsSupportedChainByChainId(newChain);
      if(!isChainSupported) {
        Initialised = false
        throw new Error(`Chain Id ${newChain} is not supported`)
      }
    });

    Initialised = true;

    const walletAddress = await userWallet.getAddress()
    const socket = io(`${soketBackendUrl}/${partnerId}_${walletAddress}`);

    if(!disabledMode) {
      handleSignRequests({ socket, signer: userWallet });
    }


    return isInitialised();
  } catch (error) {
    throw new Error(error.message);
  }
};

const listNFTForPayLater = async({
  tokenDetails = {
    token_address: "",
    token_id: "",
    contract_type: "",
    name: "",
  },
  terms = {
    price: "",
    interest: "",
    maxDuration: "",
    maxInstallment: "",
    currency: "",
    durationType: "",
    chainName: ""
  },
  dayfiConfig,
  web3JSProvider,
  ethersSigner
}) => {
    try {
      // const web3Provider = new ethers.providers.Web3Provider(provider);
      const { partnerId, walletAddress } = dayfiConfig;

      if(isInitialised()) {

        // Validate Provider

        let userWallet;

        if(web3JSProvider) {
          userWallet = (new ethers.providers.Web3Provider(web3JSProvider)).getSigner();
        } else if(ethersSigner) {
          userWallet = ethersSigner;
        } else {
          throw new Error("Please provie a valid web3JS provider or etherJS Signer")
        }
        const userWalletAddressFromWallet = await userWallet.getAddress()
        if(!userWalletAddressFromWallet === walletAddress) {
          throw new Error("User wallet mismatch: " + walletAddress + " with initialised Wallet " + userWalletAddressFromWallet);
        }
        // Validate Partner
        const isPartnerExistsResponse = await isPartnerExists(partnerId);
        if(!isPartnerExistsResponse) {
          throw new Error("Partner does not exist: " + partnerId);
        }

        // Validate NFT
        await validateNFT({userWallet, tokenDetails})
        
        // Validate terms
        await validateLenderTerms({terms});

        // Validate chain
        const chainId = await getChainIdByChainName({chainName: terms.chainName})
        
        // Validate is listing already exists
        const isPayLaterExists = await checkIsNFTListedForPayLater({partnerId, chainId, token_id: tokenDetails.token_id, token_address: tokenDetails.token_address, walletAddress: userWalletAddressFromWallet})
        if(isPayLaterExists) {
          return isPayLaterExists;
        }

        const response = await getApprovalForPayLaterTransfer({
          tokenDetails,
          chain: chainId,
          signer: userWallet
        });
        const listingResponse = await axios.post(`${backendUrl}/paylater/createPaylater`, {
          chain: chainId,
          price: terms.price,
          currency: terms.currency,
          lender: userWalletAddressFromWallet,
          partner: partnerId,
          token_id: tokenDetails.token_id,
          token_address: tokenDetails.token_address,
          contract_type: tokenDetails.contract_type,
          interest: terms.interest,
          max_duration: terms.maxDuration,
          max_installment: terms.maxInstallment,
          maxDurationType: terms.durationType,
          approvalTransactionHash: response.transactionHash,
        })
        return listingResponse.data.Paylater;
      }
    } catch (error) {
      console.error(error.message);
      throw new Error(error.message);
    }
};

const mountPaylaterIFrame = async({
  tokenDetails = {
    token_address: "",
    token_id: "",
    contract_type: "",
    name: "",
  },
  chainName,
  dayfiConfig,
  web3JSProvider,
  ethersSigner,
  callback
}) => {
  try {
    const { partnerId, walletAddress } = dayfiConfig;

    if(isInitialised()) {
      let userWallet;

      if(web3JSProvider) {
        userWallet = (new ethers.providers.Web3Provider(web3JSProvider)).getSigner();
      } else if(ethersSigner) {
        userWallet = ethersSigner;
      } else {
        throw new Error("Please provie a valid web3JS provider or etherJS Signer")
      }
      const userWalletAddressFromWallet = await userWallet.getAddress()
      
      // Validate Partner
      const isPartnerExistsResponse = await isPartnerExists(partnerId);
      if(!isPartnerExistsResponse) {
        throw new Error("Partner does not exist: " + partnerId);
      }
      
      // Validate chain
      const chainId = await getChainIdByChainName({chainName: chainName})
        
      // Validate is listing already exists
      const isPayLaterExists = await checkIsNFTListedForPayLater({partnerId, chainId, token_id: tokenDetails.token_id, token_address: tokenDetails.token_address, walletAddress: userWalletAddressFromWallet})
      if(!isPayLaterExists) {
        throw new Error("NFT is not listed for paylater");
      }
      const socket = io(`${soketBackendUrl}/${partnerId}_${walletAddress}`);
      
      exeParams = { signer: userWallet, tokenDetails, chainId, currentUserAddress: walletAddress, partnerId };
      
      handleBNPLayout({
        type: "checkout", 
        partnerId: partnerId, 
        walletAddress, 
        tokenDetails,
        chainName,
        chainId
      });

      socket.on("pending_requests", async (req) => {
        console.log(req)
        const { id, method, params = {} } = req;
        if(method === "BNPLSucess") {
          if(params.token_address === tokenDetails.token_address && 
            params.token_id === tokenDetails.token_id) {
              callback(params.selectedDuration)
              const webhookResponse = await axios.post(`${backendUrl}/general/hitWebhookByPartnerId`, {
                partnerId: partnerId,
                payLaterRequestId: isPayLaterExists.id
              });
              console.log(webhookResponse)
            }
        }
      });

    }
    
  } catch (error) {
    console.error(error.message);
    throw new Error(error.message);
  }
};

module.exports = {
  initialize,
  listNFTForPayLater,
  isInitialised,
  SupportedCurrencies,
  getSupportedChains,
  validateLenderTerms,
  checkIsSupportedChainByChainId,
  checkIsSupportedChainByChainName,
  checkIsNFTListedForPayLater,
  mountPaylaterIFrame,
  isOwnerOfNFT
};