exports.log = (...args) => {
  console.log(new Date().toISOString(), ...args);
};

exports.warn = (...args) => {
  console.warn(new Date().toISOString(), ...args);
};

exports.die = (...args) => {
  log(...args);
  process.exit(1);
};
