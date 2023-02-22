const {
    listNFTForPayLater,
    initialize
} = require('../index');
const { ethers } = require("ethers");
const web3 = require("web3");
const Web3ETH = require('web3-eth');

// wallet address = 0xdA77BABE7FabeB2940240478238817F9797b7341
const _mnemonicPhrase = 'milk private soul sugar pottery between unhappy husband scan tomato hollow list';
const privateKey = '0xd609b78218a7b3bcc3d0a5c406cd3b3635cb8883fcf11f7e740f4a3cafbb5c52';

const provider = new ethers.providers.AlchemyProvider('goerli', 'bqirU6vw0QkdvlubBYKyqTZEKzuPMtGW');
const partnerIdFortesting = '0Z1iibgUfaSphgSX-Eei0';
const NFTTokenAddressForLsiting = '0xf5de760f2e916647fd766B4AD9E85ff943cE3A2b';
const NFTTokenIdForLsiting = '1837486';
const NFTTokenContractTypeForLsiting = 'ERC721';
const NFTTokenNameForLsiting = 'MultiFaucet NFT #1837486';
const TermsForListing = {
    price: "0.02",
    interest: "20",
    maxDuration: "12",
    maxInstallment: "12",
    currency: "ETHGoreli",
    durationType: "Months",
    chainName: "Ethereum Goreli Testnet"
}

const getEtherJSWallet = async() => {

    var wallet = ethers.Wallet.fromMnemonic(_mnemonicPhrase);
    wallet =  await wallet.connect(provider)
    return wallet;
};

test('Should generate wallet', async () => {
    const wallet = await getEtherJSWallet();
    expect(wallet.address).toBe('0xdA77BABE7FabeB2940240478238817F9797b7341');
});

test('Should initialize and check for supported chain, and valid partnerId for etherJS_Signer', async () => {
    const wallet = await getEtherJSWallet();
    const isInitialised = await initialize({ethersSigner: wallet, partnerId: partnerIdFortesting, disabledMode: true});

    expect(isInitialised).toBe(true);
});

test('Should initialize and check for supported chain, and valid partnerId for etherJS_Signer', async () => {
    const wallet = await getEtherJSWallet();
    const isInitialised = await initialize({ethersSigner: wallet, partnerId: partnerIdFortesting, disabledMode: true});

    expect(isInitialised).toBe(true);

});

test('Should throw error if web3 provier or signer not provided', async () => {
    try {
        await initialize({partnerId: partnerIdFortesting, disabledMode: true});
    } catch (error) {
        expect(error.message).toBe('Please provie a valid web3JS provider or etherJS Signer')
    }
});

test('Should throw error for invalid partner', async () => {
    try {
    
        const wallet = await getEtherJSWallet();
        await initialize({ethersSigner: wallet, partnerId: "testing", disabledMode: true});
    } catch (error) {
        expect(error.message).toBe("Invalid Partner ID: " + "testing")
    }
});

test('Should list NFT for BNPL', async () => {

    const wallet = await getEtherJSWallet();

    const tokenDetails = {
        token_address: NFTTokenAddressForLsiting,
        token_id: NFTTokenIdForLsiting,
        contract_type: NFTTokenContractTypeForLsiting,
        name: NFTTokenNameForLsiting,
    };

    const dayfiConfig = {
        partnerId: partnerIdFortesting,
        walletAddress: wallet.address
    };

    await listNFTForPayLater({
        tokenDetails,
        terms: TermsForListing,
        dayfiConfig,
        ethersSigner: wallet
    })
});