const accountHandlers = require("./accountHandlers");
const bnplHandlers = require("./bnplHandlers");
const containerHandlers = require("./containerHandlers");
const vaultHandlers = require("./vaultHandlers");

module.exports = {
  ...accountHandlers,
  ...bnplHandlers,
  ...containerHandlers,
  ...vaultHandlers,
};
