const path = require('path');
const greenlockConfigDir = path.join(home, ".greenlock");
const projectPackageJson = require("./package.json");

module.exports = (greenlockConfigDir) => ({
  packageRoot: __dirname,
  manager: {
    module: "@greenlock/manager",
  },
  configDir: greenlockConfigDir,
  staging: isStagingServer,
  maintainerEmail: email,
  packageAgent: `${projectPackageJson.name}/${projectPackageJson.version}`,
  store: {
    module: "greenlock-store-fs",
    basePath: greenlockConfigDir,
  },
  challenges: {
    "http-01": http01,
  },
});
