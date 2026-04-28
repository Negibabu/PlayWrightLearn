/**
 * This file configures module path aliases for ts-node (used by Playwright).
 * The tsconfig.json defines the aliases; this ensures ts-node picks them up.
 */
const tsconfig = require("./tsconfig.json");

module.exports = {
  ...tsconfig,
  "ts-node": {
    require: ["tsconfig-paths/register"],
  },
};