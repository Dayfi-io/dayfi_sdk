const { ethers } = require("ethers");
const io = require("socket.io-client");
const { getChainsConfig } = require("@gnosis.pm/safe-react-gateway-sdk");

const iframeBaseUrl = "http://localhost:3001";
const soketBackendUrl = "https://socket.sandbox.dayfi.io";

class DayfiSDK {
  constructor({ provider = {} }) {
    this.provider = provider;
    this.web3Provider = new ethers.providers.Web3Provider(this.provider);
    this.signer = this.web3Provider.getSigner();
    this.walletAddress = null;
    this.exeParams = null;
    this.partnerId = "opensea";
    this.socket = null;
    this.chainDetails = null;
    this.init();
  }

  async init() {
    if (!document.getElementById("dayfi-container")) {
      const dayfiContainer = document.createElement("div");
      dayfiContainer.id = "dayfi-container";
      document.body.appendChild(dayfiContainer);
      if (window) {
        window.Dayfi = this;
      }
      this.handleSignRequests();
      this.getChainDetails();
      this.web3Provider.provider.on("chainChanged", (newNetwork) => {
        this.socket.emit("request_fullfilled", {
          id: "chainChanged",
          chain: parseInt(newNetwork, 16),
        });
      });
    }
  }

  async getChainDetails() {
    const { results } = await getChainsConfig("https://safe-client.gnosis.io");
    this.chainDetails = results;
  }

  async handleSignRequests() {
    this.walletAddress = await this.signer.getAddress();
    console.log({
      userAddress: this.walletAddress,
    });
    this.socket = io(`${soketBackendUrl}/${this.partnerId}_${this.walletAddress}`);
    this.socket.on("welcome", (msg) => console.log(msg));
    this.socket.on("pending_requests", async (req) => {
      console.log({
        req,
        this: this,
      });
      const { id, method, params = {} } = req;
      try {
        const requestMethods = require(`./helpers/requestHandlers/`);
        const requestHandler = requestMethods[method];
        const res = await requestHandler({
          web3Provider: this.web3Provider,
          provider: this.provider,
          ...params,
          ...this.exeParams,
        });
        if (res) {
          this.socket.emit("request_fullfilled", {
            id,
            result: res,
          });
        }
      } catch (error) {
        console.log(error);
      }
    });
  }

  openBNPLApproval({
    tokenDetails = {
      token_address: "",
      token_id: "",
      contract_type: "",
      name: "",
    },
  }) {
    const { handleBNPLayout } = require("./helpers/generalHelpers");
    this.exeParams = { tokenDetails };
    handleBNPLayout({
      partnerId: this.partnerId,
      walletAddress: this.walletAddress,
      tokenDetails,
      type: "approval",
    });
  }

  openBNPLCheckout({
    tokenDetails = {
      token_address: "",
      token_id: "",
      contract_type: "",
      name: "",
    },
  }) {
    const { handleBNPLayout } = require("./helpers/generalHelpers");
    this.exeParams = { tokenDetails };
    handleBNPLayout({
      partnerId: this.partnerId,
      walletAddress: this.walletAddress,
      tokenDetails,
      type: "checkout",
    });
  }

  openTransferNft({
    tokenDetails = {
      token_address: "",
      token_id: "",
      contract_type: "",
      name: "",
    },
  }) {
    const { generateDayFiContainer } = require("./helpers/generalHelpers");
    const dayfiContainer = document.getElementById("dayfi-container");
    const dayfiIframeWrapper = generateDayFiContainer({
      url: `${iframeBaseUrl}/transfer?partnerId=${this.partnerId}&walletAddress=${this.walletAddress}`,
      height: "70vh",
      width: "90vw",
    });
    this.exeParams = { tokenDetails, chainDetails: this.chainDetails };
    dayfiContainer.appendChild(dayfiIframeWrapper);
  }

  getCurrentUserVaultAddress({ userAddress = "" }) {
    //make API call to DayFi's server to get vault address
    return "0x68d68DA8A7B994F624fed7b387781880283108Cc";
  }

  renderLoanBook({ containerId = "" }) {
    const screenContainer = document.getElementById(containerId);
    const url = `${iframeBaseUrl}/loanbook/${type}?partnerId=${partnerId}&walletAddress=${walletAddress}`;

    const containerIframe = document.createElement("iframe");
    containerIframe.src = url;
    containerIframe.style.width = "100%";
    containerIframe.style.height = "100%";

    screenContainer.appendChild(containerIframe);
  }
}

module.exports = DayfiSDK;
