const {
    listNFTForPayLater,
    initialize
} = require('../index');
const { ethers } = require("ethers");
const { createVault } = require('../helpers/requestHandlers/gnosisVaultHandlers');

// wallet address = 0xA4a9a6beE5BEf0bB23c339fe419af49A1B0Fbd49
const _mnemonicPhrase = 'police actor lemon eight stock gloom lawsuit dignity wear burst drum coast';
const privateKey = '0xd609b78218a7b3bcc3d0a5c406cd3b3635cb8883fcf11f7e740f4a3cafbb5c52';

const provider = new ethers.providers.AlchemyProvider('goerli', 'bqirU6vw0QkdvlubBYKyqTZEKzuPMtGW');
const partnerIdFortesting = '0Z1iibgUfaSphgSX-Eei0';
const NFTTokenAddressForLsiting = '0xf5de760f2e916647fd766B4AD9E85ff943cE3A2b';
const NFTTokenIdForLsiting = '3120747';
const NFTTokenContractTypeForLsiting = 'ERC721';
const NFTTokenNameForLsiting = 'MultiFaucet NFT #3120747';
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
        await initialize({ethersSigner: wallet, partnerId: "0Z1iibgUfaSphgSX-Eei0", disabledMode: true});
    } catch (error) {
        expect(error.message).toBe("Invalid Partner ID: " + "0Z1iibgUfaSphgSX-Eei0")
    }
});

test('Should create a gnosis wallet', async () => {
    try {

        const wallet = await getEtherJSWallet();
        await initialize({ethersSigner: wallet, partnerId: "0Z1iibgUfaSphgSX-Eei0", disabledMode: true});
        await createVault({
            signer: wallet,
            currentUserAddress: await wallet.getAddress(),
            chainId: await wallet.getChainId(),
            partnerId: '0Z1iibgUfaSphgSX-Eei0'
        })
    } catch(error) {
        console.error(error)
    }
}, 30000);

test('BNPL Testing', async () => {
    try {
        const wallet = await getEtherJSWallet();
    } catch(error) {
        console.error(error)
    }
})