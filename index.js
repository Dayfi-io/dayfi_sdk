const { ethers } = require("ethers");
const io = require("socket.io-client");
const { getChainsConfig } = require("@gnosis.pm/safe-react-gateway-sdk");

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
          chain: parseInt(newNetwork, 16)
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
      userAddress: this.walletAddress
    });
    this.socket = io(`https://socket.sandbox.dayfi.io/${this.partnerId}_${this.walletAddress}`);
    this.socket.on("welcome", (msg) => console.log(msg));
    this.socket.on("pending_requests", async (req) => {
      console.log({
        req,
        this: this
      });
      const { id, method, params = {} } = req;
      try {
        const requestMethods = require(`./helpers/requestHandlers/`);
        const requestHandler = requestMethods[method];
        const res = await requestHandler({
          web3Provider: this.web3Provider,
          provider: this.provider,
          firestore: this.firestore,
          ...params,
          ...this.exeParams
        });
        if (res) {
          this.socket.emit("request_fullfilled", {
            id,
            result: res
          });
        }
      } catch (error) {
        console.log(error);
      }
    });
  }

  openBuyNowPayLater(tokenDetails = {}) {
    const dayfiContainer = document.getElementById("dayfi-container");
    const dayfiIframeWrapper = document.createElement("div");
    dayfiIframeWrapper.id = "dayfi-iframe-wrapper";
    dayfiIframeWrapper.style.position = "fixed";
    dayfiIframeWrapper.style.bottom = "50%";
    dayfiIframeWrapper.style.left = "50%";
    dayfiIframeWrapper.style.transform = "translate(-50%, 50%)";
    dayfiIframeWrapper.style.width = "70vw";
    dayfiIframeWrapper.style.height = "90vh";
    dayfiIframeWrapper.style.minHeight = "250px";
    dayfiIframeWrapper.style.maxHeight = "704px";
    dayfiIframeWrapper.style.boxShadow = "rgba(0, 0, 0, 0.16) 0px 5px 40px";
    dayfiIframeWrapper.style.zIndex = "2147483000";
    dayfiIframeWrapper.style.borderRadius = "16px";

    const containerIframe = document.createElement("iframe");
    containerIframe.src = `http://localhost:3001/bnpl?partnerId=${this.partnerId}&walletAddress=${this.walletAddress}`;
    containerIframe.style.width = "100%";
    containerIframe.style.height = "100%";
    containerIframe.style.borderRadius = "16px";

    dayfiIframeWrapper.appendChild(containerIframe);
    dayfiContainer.appendChild(dayfiIframeWrapper);
    this.exeParams = { tokenDetails };
    this.exeParams = {
      chainDetails: this.chainDetails
    };
  }
}

module.exports = DayfiSDK;
