let slm = require('@nycopportunity/pttrn/config/slm');

let remotes = {
  development: '',
  production: 'https://nycopportunity.github.io/loves-open-source',
};

slm.root = remotes[process.env.NODE_ENV];

module.exports = slm;
