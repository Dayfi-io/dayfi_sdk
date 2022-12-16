const { ethers } = require("ethers");

const PayLaterLoanCore = require("../artifacts/PayLaterLoanCore.json");

const getLoanDetailsByLoanId = async ({ loanId, web3Provider, chain }) => {
  try {
    const { DEPLOYED_ADDRESS } = require("../constants");

    const signer = web3Provider.getSigner();
    const payLaterLoanCoreInstance = new ethers.Contract(
      DEPLOYED_ADDRESS[chain].PayLaterLoanCore,
      PayLaterLoanCore.abi,
      signer,
    );

    return await payLaterLoanCoreInstance.getInstallmentOfPayLaterPurchase(parseInt(loanId));
  } catch (err) {
    console.log(err);
  }
};

module.exports = {
  getLoanDetailsByLoanId,
};
