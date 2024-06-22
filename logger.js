exports.log = (...args) => {
  console.log(new Date().toISOString(), '<<< LOG >>>', ...args);
};

exports.warn = (...args) => {
  console.warn(new Date().toISOString(), '<<< WARN >>>', ...args);
};

exports.die = (...args) => {
  log(...args);
  process.exit(1);
};
