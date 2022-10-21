const { ethers } = require("ethers");
const io = require("socket.io-client");
const { signerMethodsMap } = require("./constants");

const socket = io(`http://54.255.65.214/opensea_0x4146838819AE0E69291442e9A97aB75FE51bBA15`);

class DayfiSDK {
  constructor({ provider = {}, signer = {} }) {
    this.provider = provider;
    this.signer = signer;
    this.web3Provider = new ethers.providers.Web3Provider(this.provider);
    this.exeParams = null;
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

  handleSignRequests() {
    socket.on("welcome", (msg) => console.log(msg));
    socket.on("pending_requests", async (req) => {
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
        socket.emit("request_fullfilled", {
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
    containerIframe.src = "http://localhost:3001/bnpl";
    containerIframe.style.width = "100%";
    containerIframe.style.height = "100%";
    containerIframe.style.borderRadius = "16px";

    dayfiIframeWrapper.appendChild(containerIframe);
    dayfiContainer.appendChild(dayfiIframeWrapper);
    this.exeParams = { tokenDetails, provider: this.web3Provider };
  }
}

module.exports = DayfiSDK;
