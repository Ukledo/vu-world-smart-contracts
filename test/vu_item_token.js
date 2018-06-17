const VUItemToken = artifacts.require('./VUItemToken.sol');

const utils = require('./helpers/utils.js');
const Reverter = require('./helpers/reverter');

contract('VUItemToken', function (accounts) {
    let reverter = new Reverter(web3);
    afterEach('revert', reverter.revert);

    let owner = accounts[0];
    let vuItemToken;

    before('before', async () => {
        vuItemToken = await VUItemToken.deployed();

        await reverter.snapshot()
    })

    after("after", async () => {
    })

    context("Configuration", async () => {
        it('should has valid name', async () => {
            assert.equal(await vuItemToken.name(), "VUItem");
        });

        it('should has valid symbol', async () => {
            assert.equal(await vuItemToken.symbol(), "VUI");
        });

        it('should has valid owner', async () => {
            assert.equal(await vuItemToken.owner(), accounts[0]);
        });
    });

    context("Minting", async () => {
        it('should mint tokens if caller is owner', async () => {
            const target = accounts[1];
            const token1ID = 1;
            const token2ID = 2;
            const token3ID = 3;

            assert.equal(await vuItemToken.balanceOf(target), 0);

            await vuItemToken.massMint(target, [token1ID,token2ID,token3ID], ["hash1", "hash2", "hash3"]);

            assert.equal(await vuItemToken.ownerOf(token1ID), target);
            assert.equal(await vuItemToken.ownerOf(token2ID), target);
            assert.equal(await vuItemToken.ownerOf(token3ID), target);

            assert.equal(await vuItemToken.balanceOf(target), 3);
        })

        it('shouldn\'t mint tokens if caller is non-owner', async () => {
            const stranger = accounts[1];
            const target = accounts[2];
            const token1ID = 1;

            assert.equal(await vuItemToken.balanceOf(target), 0);

            try {
                await vuItemToken.massMint(target, [token1ID], [0x1], {from: stranger});
                assert.isTrue(false);
            } catch (error) {
                utils.ensureException(error);
            }

            assert.equal(await vuItemToken.balanceOf(target), 0);
        })

        it('should mint token if caller is owner', async () => {
            const target = accounts[1];
            const token1ID = 1;

            assert.equal(await vuItemToken.balanceOf(target), 0);

            await vuItemToken.mint(target, token1ID, "hash1");

            assert.equal(await vuItemToken.ownerOf(token1ID), target);
            assert.equal(await vuItemToken.balanceOf(target), 1);
        })

        it('shouldn\'t mint token if caller is non-owner', async () => {
            const stranger = accounts[1];
            const target = accounts[2];
            const token1ID = 1;

            assert.equal(await vuItemToken.balanceOf(target), 0);

            try {
                await vuItemToken.mint(target, token1ID, 0x1, {from: stranger});
                assert.isTrue(false);
            } catch (error) {
                utils.ensureException(error);
            }

            assert.equal(await vuItemToken.balanceOf(target), 0);
        })
    });

    context("Burn", async () => {
        it('should burn token if caller is owner', async () => {
            const target = accounts[1];
            const token1ID = 1;

            assert.equal(await vuItemToken.balanceOf(target), 0);

            await vuItemToken.massMint(target, [token1ID], ["hash1"]);

            assert.equal(await vuItemToken.ownerOf(token1ID), target);
            assert.equal(await vuItemToken.balanceOf(target), 1);

            await vuItemToken.burn(token1ID, {from: target});

            assert.equal(await vuItemToken.balanceOf(target), 0);
            assert.isFalse(await vuItemToken.exists(token1ID));
        })

        it('shouldn\'t burn token if caller is non-owner', async () => {
            const stranger = accounts[1];
            const target = accounts[2];
            const token1ID = 1;

            assert.equal(await vuItemToken.balanceOf(target), 0);

            await vuItemToken.mint(target, token1ID, "hash1");

            assert.equal(await vuItemToken.ownerOf(token1ID), target);
            assert.equal(await vuItemToken.balanceOf(target), 1);

            try {
                await vuItemToken.burn(token1ID, {from: stranger});
                assert.isTrue(false);
            } catch (error) {
                utils.ensureException(error);
            }

            assert.equal(await vuItemToken.ownerOf(token1ID), target);
            assert.equal(await vuItemToken.balanceOf(target), 1);
        })
    });
});
