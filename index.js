const { ethers } = require("ethers");
const io = require("socket.io-client");
const { signerMethodsMap } = require("./constants");

class DayfiSDK {
  constructor({ provider = {} }) {
    this.provider = provider;
    this.web3Provider = new ethers.providers.Web3Provider(this.provider);
    this.signer = this.web3Provider.getSigner();
    this.walletAddress = null;
    this.exeParams = null;
    this.partnerId = "opensea";
    this.socket = null;
    this.init();
  }

  init() {
    if (!document.getElementById("dayfi-container")) {
      const dayfiContainer = document.createElement("div");
      dayfiContainer.id = "dayfi-container";
      document.body.appendChild(dayfiContainer);
      if (window) {
        window.Dayfi = this;
      }
      this.handleSignRequests();
    }
  }

  async handleSignRequests() {
    this.walletAddress = await this.signer.getAddress();
    console.log({
      userAddress: this.walletAddress,
    });
    this.socket = io(`http://socket.sandbox.dayfi.io/${this.partnerId}_${this.walletAddress}`);
    this.socket.on("welcome", (msg) => console.log(msg));
    this.socket.on("pending_requests", async (req) => {
      console.log({
        req,
        this: this,
      });
      const { id, method, params } = req;
      try {
        const signerMethod = signerMethodsMap[method];
        const res = await signerMethod({
          ...params,
          ...this.exeParams,
        });
        this.socket.emit("request_fullfilled", {
          id,
          result: res,
        });
      } catch (error) {
        console.log(error);
      }
    });
  }

  isWalletConnected() {
    const accounts = this.web3Provider.listAccounts();
    return accounts.length > 0;
  }

  openBuyNowPayLater(tokenDetails = {}) {
    const dayfiContainer = document.getElementById("dayfi-container");
    const dayfiIframeWrapper = document.createElement("div");
    dayfiIframeWrapper.id = "dayfi-iframe-wrapper";
    dayfiIframeWrapper.style.position = "fixed";
    dayfiIframeWrapper.style.bottom = "84px";
    dayfiIframeWrapper.style.right = "20px";
    dayfiIframeWrapper.style.width = "400px";
    dayfiIframeWrapper.style.height = "calc(100% - 104px)";
    dayfiIframeWrapper.style.minHeight = "250px";
    dayfiIframeWrapper.style.maxHeight = "704px";
    dayfiIframeWrapper.style.boxShadow = "rgba(0, 0, 0, 0.16) 0px 5px 40px";
    dayfiIframeWrapper.style.zIndex = "2147483000";
    dayfiIframeWrapper.style.borderRadius = "16px";

    const containerIframe = document.createElement("iframe");
    containerIframe.src = `https://main.d2qs3oix9e2v7x.amplifyapp.com/bnpl?partnerId=${this.partnerId}&walletAddress=${this.walletAddress}`;
    containerIframe.style.width = "100%";
    containerIframe.style.height = "100%";
    containerIframe.style.borderRadius = "16px";

    dayfiIframeWrapper.appendChild(containerIframe);
    dayfiContainer.appendChild(dayfiIframeWrapper);
    this.exeParams = { tokenDetails, provider: this.web3Provider };
  }
}

module.exports = DayfiSDK;
