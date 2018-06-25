require('babel-register');
require('babel-polyfill');

module.exports = {
  copyNodeModules: true,
  skipFiles: ['Migrations.sol', 'helpers/VUTokenMock.sol', 'lib/Strings.sol'],
}
