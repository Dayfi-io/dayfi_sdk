const { isAddress, isHexStrict, toChecksumAddress } = require("web3-utils");

export const isValidAddress = (address) => {
  if (address) {
    // `isAddress` do not require the string to start with `0x`
    // `isHexStrict` ensures the address to start with `0x` aside from being a valid hex string
    return isHexStrict(address) && isAddress(address);
  }

  return false;
};

export const checksumAddress = (address) => {
  if (!isValidAddress(address)) {
    return "";
  }

  try {
    return toChecksumAddress(address);
  } catch (err) {
    return "";
  }
};

export function search(nameKey, myArray) {
  for (var i = 0; i < myArray.length; i++) {
    if (myArray[i].chainId === nameKey) {
      return myArray[i];
    }
  }
}
