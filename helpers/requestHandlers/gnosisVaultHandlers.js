const { SafeAccountConfig, SafeDeploymentConfig, SafeFactory } = require('@safe-global/safe-core-sdk');
const EthersAdapter = require('@safe-global/safe-ethers-lib');
const { default: axios } = require('axios');
const ethers = require('ethers');
const { getSignerAddress } = require('./signerHandlers');
const { backendUrl } = require('../../constants');

const createVault = async ({ 
    signer,
    currentUserAddress,
    chainId,
    partnerId
}) => {
    try {
        const dayfiSignerDetails = await getSignerAddress({chainId});
        const signerAddress = dayfiSignerDetails.result.Signer.signerAddress;
        const recoveryAddress = dayfiSignerDetails.result.Signer.recoveryAddress;


        // Create EthAdapter instance
        const ethAdapter = new EthersAdapter.default({
            ethers,
            signerOrProvider: signer
        })

        // Create SafeFactory instance
        const safeFactory = await SafeFactory.create({ ethAdapter });
        // Config of the deployed Safe
        const safeAccountConfig = {
            owners: [currentUserAddress, signerAddress, recoveryAddress],
            threshold: 2
        };

        const safeDeploymentConfig = {
            saltNonce: await signer.provider.getTransactionCount(currentUserAddress)
        }
        
        // Predict deployed address
        const predictedDeployAddress = await safeFactory.predictSafeAddress({
            safeAccountConfig,
            safeDeploymentConfig
        })
    
        function callback(txHash) {
            // console.log('Transaction hash:', txHash)
        }
    
        // Deploy Safe
        const safe = await safeFactory.deploySafe({
            safeAccountConfig,
            safeDeploymentConfig,
            callback
        })
    
        // console.log('Predicted deployed address:', predictedDeployAddress)
        // console.log('Deployed Safe:', safe.getAddress())

        const payload = {
            chain: chainId,
            address: currentUserAddress,
            partnerOrganizations: partnerId,
            primaryVaultProxyAddress: safe.getAddress()
        };

        const accountCreationResponse = await axios.post(`${backendUrl}/account/createAccount`, payload);

        return {
            type: 'vaultCreated',
            vaultAddress: safe.getAddress(),
            result: accountCreationResponse.data
        }
    } catch (error) {
        console.error(error.message);
        throw new Error(error.message);
    }
};

module.exports = {
    createVault
};