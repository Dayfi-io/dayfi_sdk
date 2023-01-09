const generateDayFiContainer = ({ url, height = "70vh", width = "90vw" }) => {
  const dayfiIframeWrapper = document.createElement("div");
  dayfiIframeWrapper.id = "dayfi-iframe-wrapper";
  dayfiIframeWrapper.style.position = "fixed";
  dayfiIframeWrapper.style.bottom = "50%";
  dayfiIframeWrapper.style.left = "50%";
  dayfiIframeWrapper.style.transform = "translate(-50%, 50%)";
  dayfiIframeWrapper.style.width = height;
  dayfiIframeWrapper.style.height = width;
  dayfiIframeWrapper.style.minHeight = "250px";
  dayfiIframeWrapper.style.maxHeight = "704px";
  dayfiIframeWrapper.style.boxShadow = "rgba(0, 0, 0, 0.16) 0px 5px 40px";
  dayfiIframeWrapper.style.zIndex = "2147483000";
  dayfiIframeWrapper.style.borderRadius = "16px";

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
    url: `${iframeBaseUrl}/bnpl/${type}?partnerId=${partnerId}&walletAddress=${walletAddress}`,
    height: "70vh",
    width: "90vw",
  });
  dayfiContainer.appendChild(dayfiIframeWrapper);
};

module.exports = {
  generateDayFiContainer,
  handleBNPLayout,
};
