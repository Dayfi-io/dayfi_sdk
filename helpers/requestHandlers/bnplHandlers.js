const { ethers } = require("ethers");

const ERC721 = require("../../abis/ERC721.json");
const ERC1155 = require("../../abis/ERC1155.json");
const wETH = require("../../abis/wETH.json");
const PayLaterLoanCore = require("../../artifacts/PayLaterLoanCore.json");
const OriginationManager = require("../../artifacts/OriginationManager.json");
const PaylaterRepaymentController = require("../../artifacts/PayLaterRepaymentController.json");

const getApprovalForPayLaterTransfer = async ({ tokenDetails, chain, signer }) => {
  const { DEPLOYED_ADDRESS } = require("../../constants");

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
    const { DEPLOYED_ADDRESS } = require("../../constants");

    const { tokenDetails, financingWalletAddress, account, ListingPrice, lender, terms, onClose, getRequests } = {
      tokenDetails: {
        token_address: "0xf5de760f2e916647fd766b4ad9e85ff943ce3a2b",
        token_id: "1837486",
        contract_type: "ERC721",
        name: "MultiFaucet Test NFT",
      },
      financingWalletAddress: "0x68d68DA8A7B994F624fed7b387781880283108Cc",
      account: "0x4146838819AE0E69291442e9A97aB75FE51bBA15",
      ListingPrice: "0.02",
      lender: "0x23cC353858Cbf5cc7F16C47484a29556f6cE00C3",
      terms: {
        loanDuration: 600,
        rateOfInterest: 1,
        installments: 2,
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
        collateralTokenId: parseInt(tokenDetails.token_id),
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
        token_address: tokenDetails.token_address,
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

const repayPayLaterLoan = async ({ chain, web3Provider }) => {
  try {
    const loanId = 3; //to be changed later

    const { DEPLOYED_ADDRESS } = require("../../constants");
    const { getLoanDetailsByLoanId } = require("./../../utils/bnplUtils");

    const signer = web3Provider.getSigner();

    const pendingInstallment = await getLoanDetailsByLoanId({ chain, loanId, web3Provider });

    const repaymentControllerInstance = new ethers.Contract(
      DEPLOYED_ADDRESS[5].RepaymentController,
      PaylaterRepaymentController.abi,
      signer,
    );

    console.log({
      pendingInstallment,
    });

    // console.log({ parsedInstallment: ethers.utils.formatEther(pendingInstallment[0].toString()) });

    // const wETHContractInstance = new ethers.Contract(wETH.address, wETH.abi, signer);
    // const approveRequest = await wETHContractInstance.approve(
    //   DEPLOYED_ADDRESS[5].RepaymentController,
    //   pendingInstallment[0],
    // );

    // await approveRequest.wait();

    // const repayment = await repaymentControllerInstance.repay(parseInt(loanId));

    // const paylaterCoreInstance = new ethers.Contract(
    //   DEPLOYED_ADDRESS[5].PayLaterLoanCore,
    //   PayLaterLoanCore.abi,
    //   signer,
    // );

    // paylaterCoreInstance.on("LoanRepaid", (...args) => {
    //   console.log({
    //     args,
    //   });
    // });

    // await repayment.wait();

    // console.log({
    //   paylaterCoreInstance,
    // });
  } catch (err) {
    console.log(err);
  }
};

const claimPayLaterLoan = async ({ web3Provider }) => {
  try {
    const loanId = 5; //to be changed later
    const { DEPLOYED_ADDRESS } = require("../../constants");

    const signer = web3Provider.getSigner();
    const repaymentControllerInstance = new ethers.Contract(
      DEPLOYED_ADDRESS[5].RepaymentController,
      PaylaterRepaymentController.abi,
      signer,
    );

    await repaymentControllerInstance.claim(parseInt(loanId));
    const paylaterCoreInstance = new ethers.Contract(
      DEPLOYED_ADDRESS[5].PayLaterLoanCore,
      PayLaterLoanCore.abi,
      signer,
    );
    paylaterCoreInstance.on("LoanClaimed", (...args) => {
      console.log({
        args,
      });
    });
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  getApprovalForPayLaterTransfer,
  buyPayLaterNFT,
  repayPayLaterLoan,
  claimPayLaterLoan,
};
