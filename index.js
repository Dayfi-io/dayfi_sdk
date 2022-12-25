const { ethers } = require("ethers");
const io = require("socket.io-client");
const { getChainsConfig } = require("@gnosis.pm/safe-react-gateway-sdk");

const iframeBaseUrl = "http://localhost:3001";

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
    this.socket = io(`https://socket.sandbox.dayfi.io/${this.partnerId}_${this.walletAddress}`);
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

  openBNPLApproval(
    tokenDetails = {
      token_address: "",
      token_id: "",
      contract_type: "",
      name: "",
    },
  ) {
    const { generateDayFiContainer } = require("./helpers/generalHelpers");
    const dayfiContainer = document.getElementById("dayfi-container");
    const dayfiIframeWrapper = generateDayFiContainer({
      url: `${iframeBaseUrl}/bnpl/approve?partnerId=${this.partnerId}&walletAddress=${this.walletAddress}`,
      height: "70vh",
      width: "90vw",
    });
    this.exeParams = { tokenDetails };
    dayfiContainer.appendChild(dayfiIframeWrapper);
  }

  openTransferNft(
    tokenDetails = {
      token_address: "",
      token_id: "",
      contract_type: "",
      name: "",
    },
  ) {
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
}

module.exports = DayfiSDK;
