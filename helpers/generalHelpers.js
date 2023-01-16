const { getChainsConfig } = require("@gnosis.pm/safe-react-gateway-sdk");

const { iframeBaseUrl } = require("../constants");

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

const handleBNPLayout = ({ type, partnerId, walletAddress }) => {
  const dayfiContainer = document.getElementById("dayfi-container");
  const dayfiIframeWrapper = generateDayFiContainer({
    url: `${iframeBaseUrl}/customize/checkout?partnerId=${partnerId}&walletAddress=${walletAddress}`,
    height: "70vh",
    width: "90vw",
  });
  dayfiContainer.appendChild(dayfiIframeWrapper);
};

const handleChainChange = async ({ socket, web3Provider }) => {
  web3Provider.provider.on("chainChanged", (newNetwork) => {
    socket.emit("request_fullfilled", {
      id: "chainChanged",
      chain: parseInt(newNetwork, 16),
    });
  });
};

const getChainDetails = async () => {
  const { results } = await getChainsConfig("https://safe-client.gnosis.io");
  return results;
};

module.exports = {
  generateDayFiContainer,
  handleBNPLayout,
  handleChainChange,
  getChainDetails,
};
