const { ethers } = require("ethers");
const OriginationManager = require("../../artifacts/OriginationManager.json");
const ERC721 = require("../../abis/ERC721.json");

const getApprovalForPayLaterTransfer = async ({ tokenDetails, interest, web3Provider }) => {
  console.log({
    tokenDetails,
    interest,
  });
  const signer = web3Provider.getSigner();
  const originationManagerContractInstance = new ethers.Contract(tokenDetails.tokenAddress, ERC721.abi, signer);
  const response = await originationManagerContractInstance.approve(
    OriginationManager.defaultAddress,
    tokenDetails.tokenId,
  );

  const receipt = await response.wait();

  return receipt;
};

module.exports = {
  getApprovalForPayLaterTransfer,
};
