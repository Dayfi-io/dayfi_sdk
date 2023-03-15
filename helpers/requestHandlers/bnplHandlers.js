const { ethers } = require("ethers");

const ERC721 = require("../../abis/ERC721.json");
const ERC1155 = require("../../abis/ERC1155.json");
const wETH = require("../../abis/wETH.json");
const ERC20 = require("../../artifacts/ERC20.json");
const PayLaterLoanCore = require("../../artifacts/PayLaterLoanCore.json");
const OriginationManager = require("../../artifacts/OriginationManager.json");
const PaylaterRepaymentController = require("../../artifacts/PayLaterRepaymentController.json");
const {
  checkIsNFTListedForPayLater,
  SupportedCurrencies,
  isPartnerExists,
  isOwnerOfNFTByOwnerAddress
} = require('../generalHelpers');
const abiDecoder = require('abi-decoder');
const { default: axios } = require("axios");
const dayjs = require('dayjs');
const { backendUrl, ZERO_ADDRESS, DEPLOYED_ADDRESS } = require('../../constants');

const getApprovalForPayLaterTransfer = async ({ tokenDetails, chain, signer }) => {

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

const buyPayLaterNFT = async ({ 
  signer,
  currentUserAddress,
  chainId,
  partnerId,
  tokenDetails,
  durationData,
  socket
}) => {

  try {

    if(!durationData) {
      throw new Error("Invalid Borrower Terms")
    }

    if(!tokenDetails) {
      throw new Error("Invalid Token Details")
    }

    const partnerExists = await isPartnerExists(partnerId);
    if(!partnerExists) {
      throw new Error("Partner Does not exists")
    }
    abiDecoder.addABI(PayLaterLoanCore.abi);
    const { DEPLOYED_ADDRESS } = require("../../constants");
    const isVaultExists = await axios.get(`${backendUrl}/account/getAccount/${currentUserAddress}/${chainId}`);
    if(!isVaultExists || isVaultExists.data.message === "Account not found") {
      throw new Error("User Vault not found")
    };

    const payLaterListingDetails = await checkIsNFTListedForPayLater({
      partnerId,
      walletAddress: currentUserAddress,
      chainId,
      token_id: tokenDetails.token_id,
      token_address: tokenDetails.token_address
    });

    if(!payLaterListingDetails) {
      throw new Error("NFT Listing Not Found");
    }
    
    const { financingWalletAddress, account, ListingPrice, lender, terms, onClose, getRequests } = {
      financingWalletAddress: isVaultExists.data.account.primaryVaultProxyAddress,
      account: currentUserAddress,
      ListingPrice: payLaterListingDetails.price,
      lender: payLaterListingDetails.lender,
      terms: {
        loanDuration: parseInt(durationData?.duration) * (durationData?.durationType === "Months" ? 2592000 : durationData?.durationType === "Days" ? 86400 : 0),
        rateOfInterest: parseInt(payLaterListingDetails.interest),
        installments: parseInt(durationData?.installments),
      },
      onClose: () => {
        /*noop*/
      },
      getRequests: () => {
        /*noop*/
      },
    };

    // Supported chain check
    const Chains = await SupportedCurrencies();
    const isChainSupported = Chains.filter((chain) => chain.chainId.split("0x")[1] === payLaterListingDetails.chain);
    if(!(isChainSupported.length > 0)) {
      throw new Error(`Chain ${payLaterListingDetails.chain} not supported`);
    }

    const payableCurrency = isChainSupported[0].currency[payLaterListingDetails.currency]

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
        payableCurrency: payableCurrency,
        // The number parts in the payment cycle
        parts: terms.installments,
        // The part duration in seconds
        partduration: parseInt(parseInt(terms.loanDuration) / terms.installments),
      };
      // console.log(loanTerms);

      const PayLateCore = new ethers.Contract(DEPLOYED_ADDRESS[parseInt(chainId)].PayLaterLoanCore, PayLaterLoanCore.abi, signer);

      const tokenType = tokenDetails.contract_type === "ERC721" ? 0 : tokenDetails.contract_type === "ERC1155" ? 1 : 3;
      const ins = await PayLateCore.getFirstInstallmentWithoutLoan(
        loanTerms.principal,
        loanTerms.parts,
        loanTerms.interest,
      );
      const OriginationManagerInstance = new ethers.Contract(
        DEPLOYED_ADDRESS[parseInt(chainId)].OriginationManager,
        OriginationManager.abi,
        signer,
      );

      const isLenderTheOwnerOfNFTCheck = await isOwnerOfNFTByOwnerAddress({
        signer,
        tokenDetails,
        ownerAddress: lender
      });

      if(!isLenderTheOwnerOfNFTCheck) {
        // ------------- Update Listing ----------------
        
        await axios.post(`${backendUrl}/paylater/updatePaylater`, {
          id: payLaterListingDetails.id,
          expired: '1'
        });

        throw new Error("Lender is not the Owner of NFT");

      }

      if(loanTerms.payableCurrency === ZERO_ADDRESS) {
          const response = await OriginationManagerInstance.initializePayLaterRequest(
            loanTerms,
            account,
            financingWalletAddress,
            lender,
            tokenType,
            tokenDetails.token_address,
            {
              value: ins
            }
          );
          console.log(response)

          const receipt = await response.wait();
          console.log(receipt)

          const logs = abiDecoder.decodeLogs(receipt.logs)[0];
          console.log(logs)

          const loanId = parseInt(logs.events[0].value);
          console.log(loanId)
          if(loanId) {
            await axios.post(`${backendUrl}/paylater/updatePaylater`, {
              id: payLaterListingDetails.id,
              borrower: account,
              loan_sanctioned: '1',
              no_of_installments: terms.installments,
              start_date: dayjs().format('DD/MM/YYYY[ ]HH:mm:ss'),
              end_date: dayjs().add(loanTerms.durationSecs, 's').format('DD/MM/YYYY[ ]HH:mm:ss'),
              duration: loanTerms.durationSecs,
              buyingTransactionHash: response.transactionHash,
              loadId: loanId
            });

            const payLaterListingUpdatedDetails = await checkIsNFTListedForPayLater({
              partnerId,
              walletAddress: currentUserAddress,
              chainId,
              token_id: tokenDetails.token_id,
              token_address: tokenDetails.token_address
            });

            return payLaterListingUpdatedDetails;
          }
      } else {
          const TokenInstance = new ethers.Contract(loanTerms.payableCurrency, ERC20.abi, signer);
          const approveRequest = await TokenInstance.approve(DEPLOYED_ADDRESS[parseInt(chainId)].OriginationManager, ins);
          await approveRequest.wait();
          const response = await OriginationManagerInstance.initializePayLaterRequest(
            loanTerms,
            account,
            financingWalletAddress,
            lender,
            tokenType,
            tokenDetails.token_address,
          );
          const receipt = await response.wait();
          const logs = abiDecoder.decodeLogs(receipt.logs)[0];
          const loanId = parseInt(logs.events[0].value);

          if(loanId) {
            await axios.post(`${backendUrl}/paylater/updatePaylater`, {
              id: payLaterListingDetails.id,
              borrower: account,
              loan_sanctioned: '1',
              no_of_installments: terms.installments,
              start_date: dayjs().format('DD/MM/YYYY[ ]HH:mm:ss'),
              end_date: dayjs().add(loanTerms.durationSecs, 's').format('DD/MM/YYYY[ ]HH:mm:ss'),
              duration: loanTerms.durationSecs,
              buyingTransactionHash: response.transactionHash,
              loadId: loanId
            });

            const payLaterListingUpdatedDetails = await checkIsNFTListedForPayLater({
              partnerId,
              walletAddress: currentUserAddress,
              chainId,
              token_id: tokenDetails.token_id,
              token_address: tokenDetails.token_address
            });

            return payLaterListingUpdatedDetails;

          }
      }

    }
  } catch (err) {
    console.log(err);
    throw new Error(err.message);
  }
};

const repayPayLaterLoan = async ({ chain, signer }) => {
  try {
    const loanId = 3; //to be changed later

    const { DEPLOYED_ADDRESS } = require("../../constants");
    const { getLoanDetailsByLoanId } = require("./../../utils/bnplUtils");

    const pendingInstallment = await getLoanDetailsByLoanId({ chain, loanId, signer });

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

const claimPayLaterLoan = async ({ signer }) => {
  try {
    const loanId = 5; //to be changed later
    const { DEPLOYED_ADDRESS } = require("../../constants");

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
