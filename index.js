const { ethers } = require("ethers");
const io = require("socket.io-client");
const { iframeBaseUrl, soketBackendUrl } = require("./constants");

let exeParams = {};

const handleSignRequests = async ({ socket, web3Provider }) => {
  socket.on("welcome", (msg) => console.log(msg));
  socket.on("pending_requests", async (req) => {
    console.log({
      req,
    });
    const { id, method, params = {} } = req;
    try {
      const requestMethods = require(`./helpers/requestHandlers`);
      const requestHandler = requestMethods[method];
      if(requestHandler) {
        const res = await requestHandler({
          web3Provider,
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
      console.log(error);
    }
  });
};

const initDayFiSdk = ({ provider = {}, partnerId = "opensea", walletAddress = null }) => {
  /*
     This function will return a general
     object that will have information 
     like partnerId and walletAddress.
  */

  const { handleChainChange } = require("./helpers/generalHelpers");

  const socket = io(`${soketBackendUrl}/${partnerId}_${walletAddress}`);
  const web3Provider = new ethers.providers.Web3Provider(provider);

  if (!document.getElementById("dayfi-container")) {
    const dayfiContainer = document.createElement("div");
    dayfiContainer.id = "dayfi-container";
    document.body.appendChild(dayfiContainer);

    handleSignRequests({ socket, web3Provider });
    handleChainChange({ socket, web3Provider });
  }

  return {
    dayfiConfig: {
      partnerId,
      walletAddress,
    },
  };
};

const openBNPLApproval = ({
  tokenDetails = {
    token_address: "",
    token_id: "",
    contract_type: "",
    name: "",
  },
  dayfiConfig,
  provider,
}) => {
  const web3Provider = new ethers.providers.Web3Provider(provider);
  const { partnerId, walletAddress } = dayfiConfig;

  const { handleBNPLayout } = require("./helpers/generalHelpers");
  exeParams = { tokenDetails, web3Provider, provider };
  handleBNPLayout({
    partnerId: partnerId,
    walletAddress: walletAddress,
    tokenDetails,
    type: "listing",
  });
};

const openBNPLCheckout = ({
  tokenDetails = {
    token_address: "",
    token_id: "",
    contract_type: "",
    name: "",
  },
  dayfiConfig,
  provider,
}) => {
  const web3Provider = new ethers.providers.Web3Provider(provider);
  const { partnerId, walletAddress } = dayfiConfig;

  const { handleBNPLayout } = require("./helpers/generalHelpers");
  exeParams = { tokenDetails, web3Provider, provider };
  handleBNPLayout({
    partnerId: partnerId,
    walletAddress: walletAddress,
    tokenDetails,
    type: "checkout",
  });
};

const openTransferNft = async ({
  tokenDetails = {
    token_address: "",
    token_id: "",
    contract_type: "",
    name: "",
  },
  dayfiConfig,
  provider,
}) => {
  const { getChainDetails } = require("./helpers/generalHelpers");

  const web3Provider = new ethers.providers.Web3Provider(provider);
  const { partnerId, walletAddress } = dayfiConfig;

  const { generateDayFiContainer } = require("./helpers/generalHelpers").default;
  const dayfiContainer = document.getElementById("dayfi-container");
  const dayfiIframeWrapper = generateDayFiContainer({
    url: `${iframeBaseUrl}/transfer?partnerId=${partnerId}&walletAddress=${walletAddress}`,
    height: "70vh",
    width: "90vw",
  });

  const chainDetails = await getChainDetails();

  exeParams = { tokenDetails, chainDetails, web3Provider, provider };
  dayfiContainer.appendChild(dayfiIframeWrapper);
};

const getCurrentUserVaultAddress = ({ userAddress = "" }) => {
  //make API call to DayFi's server to get vault address
  return "0x68d68DA8A7B994F624fed7b387781880283108Cc";
};

const renderLoanBook = ({ containerId = "", dayfiConfig }) => {
  const { partnerId, walletAddress } = dayfiConfig;

  const screenContainer = document.getElementById(containerId);
  screenContainer.innerHTML = ""; //prevent duplicate iframes
  const url = `${iframeBaseUrl}/loanbook?partnerId=${partnerId}&walletAddress=${walletAddress}`;

  const containerIframe = document.createElement("iframe");
  containerIframe.src = url;
  containerIframe.style.width = "100%";
  containerIframe.style.height = "100%";

  screenContainer.appendChild(containerIframe);
};

const renderVault = ({ containerId = "", dayfiConfig }) => {
  const { partnerId, walletAddress } = dayfiConfig;

  const screenContainer = document.getElementById(containerId);
  screenContainer.innerHTML = ""; //prevent duplicate iframes
  const url = `${iframeBaseUrl}/customize/vault?partnerId=${partnerId}&walletAddress=${walletAddress}`;

  const containerIframe = document.createElement("iframe");
  containerIframe.src = url;
  containerIframe.style.width = "100%";
  containerIframe.style.height = "100%";

  screenContainer.appendChild(containerIframe);
};

module.exports = {
  initDayFiSdk,
  openBNPLApproval,
  openBNPLCheckout,
  openTransferNft,
  getCurrentUserVaultAddress,
  renderLoanBook,
  renderVault,
};
