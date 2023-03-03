const { default: axios } = require("axios");
const { soketBackendUrl, backendUrl } = require("../../constants");

const getSignerAddress = async ({chainId}) => {
    try {
        const response = await axios.get(`${backendUrl}/signer/getSignerbyChainId/${chainId}`);
        return response.data;
    } catch(error) {
        console.error(error);
        throw new Error(error.message);
    }
};

module.exports = {
    getSignerAddress
};
  