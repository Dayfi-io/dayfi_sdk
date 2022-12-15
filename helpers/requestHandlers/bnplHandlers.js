const { ethers } = require("ethers");

const ERC721 = require("../../abis/ERC721.json");
const ERC1155 = require("../../abis/ERC1155.json");
const wETH = require("../../abis/wETH.json");
const PayLaterLoanCore = require("../../artifacts/PayLaterLoanCore.json");
const OriginationManager = require("../../artifacts/OriginationManager.json");

const getApprovalForPayLaterTransfer = async ({ tokenDetails, interest, maxDuration, chain, web3Provider }) => {
  const { DEPLOYED_ADDRESS } = require("../../constants");

  console.log({
    tokenDetails,
    interest,
    maxDuration,
    address: DEPLOYED_ADDRESS[chain].OriginationManager,
  });
  const signer = web3Provider.getSigner();
  let tokenContractInstance = null;
  if (tokenDetails.contract_type === "ERC721") {
    tokenContractInstance = new ethers.Contract(tokenDetails.token_address, ERC721.abi, signer);
  } else if (tokenDetails.contract_type === "ERC1155") {
    tokenContractInstance = new ethers.Contract(tokenDetails.token_address, ERC1155.abi, signer);
  }
  const response = await tokenContractInstance.approve(
    DEPLOYED_ADDRESS[chain].OriginationManager,
    tokenDetails.token_id,
  );

  const receipt = await response.wait();

  return receipt;
};

const buyPayLaterNFT = async ({ provider, chain, web3Provider }) => {
  console.log({
    provider,
    chain,
    web3Provider,
  });
  try {
    const { DEPLOYED_ADDRESS, ZERO_ADDRESS } = require("../../constants");

    const { tokenDetails, financingWalletAddress, account, ListingPrice, lender, terms, onClose, getRequests } = {
      tokenDetails: {
        token_address: "0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b",
        token_id: "1837486",
        contract_type: "ERC721",
        name: "MultiFaucet Test NFT",
      },
      financingWalletAddress: "0x68d68DA8A7B994F624fed7b387781880283108Cc",
      account: "0x4146838819AE0E69291442e9A97aB75FE51bBA15",
      ListingPrice: "0.01",
      lender: "0x23cC353858Cbf5cc7F16C47484a29556f6cE00C3",
      terms: {
        loanDuration: 172800,
        rateOfInterest: 1,
        installments: 1,
      },
      onClose: () => {
        /*noop*/
      },
      getRequests: () => {
        /*noop*/
      },
    };

    const signer = web3Provider.getSigner();

    if (financingWalletAddress && account && lender) {
      // console.log(terms);
      const loanTerms = {
        // The number of seconds representing relative due date of the loan
        durationSecs: parseInt(terms.loanDuration),
        // The amount of principal in terms of the payableCurrency
        principal: ethers.utils.parseEther(ListingPrice),
        // The amount of interest in terms of the payableCurrency
        interest: terms.rateOfInterest,
        // The tokenID of the collateral bundle
        collateralTokenId: tokenDetails.token_id,
        // The payable currency for the loan principal and interest
        payableCurrency: wETH.address,
        // The number parts in the payment cycle
        parts: terms.installments,
        // The part duration in seconds
        partduration: parseInt(parseInt(terms.loanDuration) / terms.installments),
      };
      // console.log(loanTerms);

      const tokenType = tokenDetails.contract_type === "ERC721" ? 0 : tokenDetails.contract_type === "ERC1155" ? 1 : 3;

      const wETHContractInstance = new ethers.Contract(wETH.address, wETH.abi, signer);

      const PayLateCore = new ethers.Contract(DEPLOYED_ADDRESS[5].PayLaterLoanCore, PayLaterLoanCore.abi, signer);
      console.log({
        PayLateCore,
      });
      // const PayLateCore = new web3Js.eth.Contract(PayLaterLoanCore.abi, DEPLOYED_ADDRESS[5].PayLaterLoanCore);
      const ins = await PayLateCore.getFirstInstallmentWithoutLoan(
        loanTerms.principal,
        loanTerms.parts,
        loanTerms.interest,
      );
      console.log({
        ins,
      });

      // const tx = {
      //   to: DEPLOYED_ADDRESS[5].OriginationManager,
      //   value: ins,
      //   gasLimit: 50000,
      // };

      // const res = await signer.sendTransaction(tx);

      // console.log({
      //   res,
      // });

      // await wETHContract.methods.approve(DEPLOYED_ADDRESS[5].OriginationManager, ins).send({ from: account });
      // const OriginationManagerInstance = new web3Js.eth.Contract(
      //   OriginationManager.abi,
      //   DEPLOYED_ADDRESS[5].OriginationManager,
      // );

      const approveRequest = await wETHContractInstance.approve(DEPLOYED_ADDRESS[5].OriginationManager, ins);

      await approveRequest.wait();

      const OriginationManagerInstance = new ethers.Contract(
        DEPLOYED_ADDRESS[5].OriginationManager,
        OriginationManager.abi,
        signer,
      );

      console.log({
        loanTerms,
        account,
        financingWalletAddress,
        lender,
        tokenType,
        address_token: tokenDetails.token_address,
        OriginationManagerInstance,
      });

      const response = await OriginationManagerInstance.initializePayLaterRequest(
        loanTerms,
        account,
        financingWalletAddress,
        lender,
        tokenType,
        tokenDetails.token_address,
      );

      console.log({ response });

      await PayLateCore.once("LoanStarted", (loanId, lender, borrower, borrowerSecondary) => {
        console.log("From loanId", { loanId, lender, borrower, borrowerSecondary });
      });

      // getRequests();
    }
  } catch (err) {
    console.log(err);
  }
};

module.exports = {
  getApprovalForPayLaterTransfer,
  buyPayLaterNFT,
};
