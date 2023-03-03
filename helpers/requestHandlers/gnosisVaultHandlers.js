const { SafeAccountConfig, SafeDeploymentConfig, SafeFactory } = require('@safe-global/safe-core-sdk');
const EthersAdapter = require('@safe-global/safe-ethers-lib');
const ethers = require('ethers');

const createVault = async ({ 
    signer,
    chainId, 
    accounts, 
    chainDetails, 
    currentUserAddress 
}) => {
    try {
        // Create EthAdapter instance
        const ethAdapter = new EthersAdapter({
            ethers,
            signerOrProvider: signer
        })

        // Create SafeFactory instance
        const safeFactory = await SafeFactory.create({ ethAdapter });
        // Config of the deployed Safe
        const safeAccountConfig = {
            owners: config.DEPLOY_SAFE.OWNERS,
            threshold: 2
        };

        const safeDeploymentConfig = {
            saltNonce: config.DEPLOY_SAFE.SALT_NONCE
        }
    
        // Predict deployed address
        const predictedDeployAddress = await safeFactory.predictSafeAddress({
        safeAccountConfig,
        safeDeploymentConfig
        })
    
        function callback(txHash) {
        console.log('Transaction hash:', txHash)
        }
    
        // Deploy Safe
        const safe = await safeFactory.deploySafe({
        safeAccountConfig,
        safeDeploymentConfig,
        callback
        })
    
        console.log('Predicted deployed address:', predictedDeployAddress)
        console.log('Deployed Safe:', safe.getAddress())

    } catch (error) {
        console.error(error);
        throw new Error(error.message);
    }
};

module.exports = {
    createVault
};