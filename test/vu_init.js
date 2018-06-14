const utils = require('./helpers/utils');
const Reverter = require('./helpers/reverter');
const BigNumber = require('bignumber.js');

contract('TODO', function (accounts) {
    let reverter = new Reverter(web3);

    afterEach('revert', reverter.revert);

    before('before', async () => {
        await reverter.promisifySnapshot();
    })

    after("after", async () => {
    })

    context("TODO", async () => {
        it('TODO', async () => {
        });
    });
});
