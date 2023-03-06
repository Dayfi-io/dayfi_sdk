const accountHandlers = require("./accountHandlers");
const bnplHandlers = require("./bnplHandlers");
const containerHandlers = require("./containerHandlers");
// const vaultHandlers = require("./vaultHandlers");
const signerhandlers = require('./signerHandlers');
const gnosisVaultHandlers = require("./gnosisVaultHandlers"); 

module.exports = {
  ...accountHandlers,
  ...bnplHandlers,
  ...containerHandlers,
  // ...vaultHandlers,
  ...signerhandlers,
  ...gnosisVaultHandlers
};
