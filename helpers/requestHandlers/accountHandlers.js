const getIsAccountConnected = async ({ signer }) => {
  const accounts = await signer.provider.listAccounts();
  if (accounts.length > 0) {
    const network = await signer.provider.getNetwork();
    return {
      type: "accountDetails",
      isAccountConnected: true,
      address: accounts[0],
      chain: network?.chainId,
    };
  } else {
    return {
      isAccountConnected: false,
    };
  }
};

const triggerChainChange = async ({ signer, chain }) => {
  try {
    const { CHAIN_DETAILS } = require("../../constants");
    const defaultMetamaskChains = [5];
    const isDefaultChain = defaultMetamaskChains.includes(chain);
    if (isDefaultChain) {
      const hexString = `0x${chain.toString(16)}`;

      await signer.provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexString }],
      });
    } else {
      await signer.provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            ...CHAIN_DETAILS[chain],
          },
        ],
      });
    }
  } catch (err) {
    console.log(err);
  }
};

module.exports = {
  getIsAccountConnected,
  triggerChainChange,
};
