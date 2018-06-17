const VUItemToken = artifacts.require("VUItemToken");
const VUSwap = artifacts.require("VUSwap");
const VUToken = artifacts.require("VUToken");

const utils = require('./helpers/utils');
const Reverter = require('./helpers/reverter');
const BigNumber = require('bignumber.js');
const ABI = require('ethereumjs-abi');
const util = require("ethereumjs-util");

contract('VUSwap', function (accounts) {
    const reverter = new Reverter(web3);

    const owner = accounts[0];
    const middleware = accounts[1];
    const user1 = accounts[2];
    const user2 = accounts[3];
    const stranger = accounts[4];
    const wallet = accounts[5]

    let vuItemToken;
    let vuToken;
    let vuSwap;

    let order = {};

    before('before', async () => {
        vuItemToken = await VUItemToken.deployed();
        vuSwap = await VUSwap.deployed();
        vuToken = await VUToken.deployed();

        await reverter.snapshot()
    })

    after("after", async () => {
    })

    context("VU Item Token Crowdsale (VU -> VUItem):", async () => {
        const item1ID = 1;
        const item2ID = 2;
        const VU_TOKEN_AMOUNT = 100;

        before(async () => {
            await vuToken.transfer(user1, VU_TOKEN_AMOUNT);
        })

        it("Owner should mint VUItemTokens to Middleware", async () => {
            await vuItemToken.massMint(middleware, [item1ID, item2ID], ["uri1", "uri2"]);

            assert.equal(await vuItemToken.ownerOf(item1ID), middleware);
            assert.equal(await vuItemToken.ownerOf(item2ID), middleware);
        })

        it("Middleware should give `Exchange` an unlimited approval / Enable trading", async () => {
            await vuItemToken.setApprovalForAll(vuSwap.address, true, {from: middleware});

            assert.isTrue(await vuItemToken.isApprovedForAll(middleware, vuSwap.address));
        })

        it("Middleware should generate an order information for user1", async () => {
            order.maker = middleware;
            order.makerToken = vuItemToken.address;
            order.makerReceiver = wallet;
            order.makerValues = [item1ID, item2ID];
            order.taker = user1;
            order.takerToken = vuToken.address;
            order.takerValues = [VU_TOKEN_AMOUNT];
            order.expiration = new Date().getTime() + 60000;
            order.nonce = 1;

            const { v, r, s } = await signature(order, order.maker);

            let addresses = [order.maker, order.makerToken, order.makerReceiver, order.taker, order.takerToken];
            let validateResult = await vuSwap.validate(addresses,
                                  order.makerValues,
                                  order.takerValues,
                                  order.expiration,
                                  order.nonce,
                                  v, util.bufferToHex(r), util.bufferToHex(s), {from: order.taker})

            assert.equal(await orderHash(order), validateResult[1]);
        })

        it("User should approve Exchange to spend his VU tokens", async () => {
            assert.isTrue((await vuToken.balanceOf(user1)).gte(VU_TOKEN_AMOUNT));

            await vuToken.approve(vuSwap.address, VU_TOKEN_AMOUNT, {from: user1});
            assert.isTrue((await vuToken.allowance(user1, vuSwap.address)).eq(VU_TOKEN_AMOUNT));
        })

        it(`Exchange should be permitted to spend user's ${VU_TOKEN_AMOUNT} VU tokens`, async () => {
            assert.isTrue(await vuToken.transferFrom.call(user1, owner, VU_TOKEN_AMOUNT, {from: vuSwap.address}));
        })

        it(`Exchange should be permitted to spend middleware's VUItem tokens with [${item1ID}, ${item2ID}] ids`, async () => {
            await vuItemToken.transferFrom.call(middleware, user1, item1ID, {from: vuSwap.address});
            await vuItemToken.transferFrom.call(middleware, user1, item2ID, {from: vuSwap.address});
        })

        it(`User should fill an order`, async () => {
            const { v, r, s } = await signature(order, order.maker);
            let addresses = [order.maker, order.makerToken, order.makerReceiver, order.taker, order.takerToken];
            await vuSwap.fill(addresses,
                              order.makerValues,
                              order.takerValues,
                              order.expiration,
                              order.nonce,
                              v, util.bufferToHex(r), util.bufferToHex(s), {from: user1});
        })

        it(`User should be an owner of [${item1ID}, ${item2ID}] VU Items`, async () => {
            assert.equal(await vuItemToken.ownerOf(item1ID), user1);
            assert.equal(await vuItemToken.ownerOf(item2ID), user1);

            assert.isTrue((await vuToken.balanceOf(user1)).isZero());
        })

        it(`Wallet's balance of VU should be equal ${VU_TOKEN_AMOUNT}`, async () => {
            assert.isTrue((await vuToken.balanceOf(wallet)).eq(VU_TOKEN_AMOUNT));
        })

        after(async () => {
            await reverter.revert()
        })
    });

    context("User1 (as a buyer) should buy VU Item (VU -> VUItem)", async () => {
        const item1ID = 1;
        const item2ID = 2;
        const VU_TOKEN_AMOUNT = 100;

        before(async () => {
            await vuToken.transfer(user1, VU_TOKEN_AMOUNT);
            await vuToken.approve(vuSwap.address, VU_TOKEN_AMOUNT, {from: user1});

            await vuItemToken.massMint(user2, [item1ID, item2ID], ["uri1", "uri2"]);
            await vuItemToken.setApprovalForAll(vuSwap.address, true, {from: user2});
        })

        it(`User1's balance of VU should be equal ${VU_TOKEN_AMOUNT}`, async () => {
            assert.isTrue((await vuToken.balanceOf(user1)).gte(VU_TOKEN_AMOUNT));
        })

        it(`User2 should be an owner of [${item1ID}, ${item2ID}] VU Items`, async () => {
            assert.equal(await vuItemToken.ownerOf(item1ID), user2);
            assert.equal(await vuItemToken.ownerOf(item2ID), user2);
        })

        it(`User1 should fill an order`, async () => {
            let order = {};

            order.maker = user2;
            order.makerToken = vuItemToken.address;
            order.makerReceiver = user2;
            order.makerValues = [item1ID, item2ID];
            order.taker = user1;
            order.takerToken = vuToken.address;
            order.takerValues = [VU_TOKEN_AMOUNT];
            order.expiration = new Date().getTime() + 60000;
            order.nonce = 1;

            const { v, r, s } = await signature(order, user2);
            let addresses = [order.maker, order.makerToken, order.makerReceiver, order.taker, order.takerToken];
            await vuSwap.fill(addresses,
                              order.makerValues,
                              order.takerValues,
                              order.expiration,
                              order.nonce,
                              v, util.bufferToHex(r), util.bufferToHex(s), {from: user1});
        })

        it(`User1 should be an owner of [${item1ID}, ${item2ID}] VU Items`, async () => {
            assert.equal(await vuItemToken.ownerOf(item1ID), user1);
            assert.equal(await vuItemToken.ownerOf(item2ID), user1);

            assert.isTrue((await vuToken.balanceOf(user1)).isZero());
        })

        it(`User2's balance of VU should be equal ${VU_TOKEN_AMOUNT}`, async () => {
            assert.isTrue((await vuToken.balanceOf(user2)).eq(VU_TOKEN_AMOUNT));
        })

        after(async () => {
            await reverter.revert()
        })
    });

    context("User1 (as a seller) should sell VU Item (VUItem -> VU)", async () => {
        const item1ID = 1;
        const item2ID = 2;
        const VU_TOKEN_AMOUNT = 100;

        before(async () => {
            await vuToken.transfer(user2, VU_TOKEN_AMOUNT);
            await vuToken.approve(vuSwap.address, VU_TOKEN_AMOUNT, {from: user2});

            await vuItemToken.massMint(user1, [item1ID, item2ID], ["uri1", "uri2"]);
            await vuItemToken.setApprovalForAll(vuSwap.address, true, {from: user1});
        })

        it(`User1 should be an owner of [${item1ID}, ${item2ID}] VU Items`, async () => {
            assert.equal(await vuItemToken.ownerOf(item1ID), user1);
            assert.equal(await vuItemToken.ownerOf(item2ID), user1);
        })

        it(`User2's balance of VU should be equal ${VU_TOKEN_AMOUNT}`, async () => {
            assert.isTrue((await vuToken.balanceOf(user2)).gte(VU_TOKEN_AMOUNT));
        })

        it(`User1 should fill an order`, async () => {
            let order = {};

            order.maker = user2;
            order.makerToken = vuToken.address;
            order.makerReceiver = user2;
            order.makerValues = [VU_TOKEN_AMOUNT];
            order.taker = user1;
            order.takerToken = vuItemToken.address;
            order.takerValues = [item1ID, item2ID];
            order.expiration = new Date().getTime() + 60000;
            order.nonce = 1;

            const { v, r, s } = await signature(order, user2);
            let addresses = [order.maker, order.makerToken, order.makerReceiver, order.taker, order.takerToken];
            await vuSwap.fill(addresses,
                              order.makerValues,
                              order.takerValues,
                              order.expiration,
                              order.nonce,
                              v, util.bufferToHex(r), util.bufferToHex(s), {from: user1});
        })

        it(`User1's balance of VU should be equal ${VU_TOKEN_AMOUNT}`, async () => {
            assert.isTrue((await vuToken.balanceOf(user1)).eq(VU_TOKEN_AMOUNT));
        })

        it(`User2 should be an owner of [${item1ID}, ${item2ID}] VU Items`, async () => {
            assert.equal(await vuItemToken.ownerOf(item1ID), user2);
            assert.equal(await vuItemToken.ownerOf(item2ID), user2);

            assert.isTrue((await vuToken.balanceOf(user2)).isZero());
        })

        after(async () => {
            await reverter.revert()
        })
    });

    let signature = async (order, signer) => {
        const msg = await orderHash(order);
        const sig = web3.eth.sign(signer, util.bufferToHex(msg));

        return util.fromRpcSig(sig);
    }

    let orderHash = async (order) => {
        // const args = [maker, makerReceiver, vuItemIds, taker, takerAmount, takerToken, expiration, nonce];
        // const argTypes = ['address', 'address', 'uint256[2]', 'address', 'uint256', 'address', 'uint256', 'uint256'];
        //

        // const msg = ABI.soliditySHA3(argTypes, args); // TODO: bug in ABI?

        let addresses = [order.maker, order.makerToken, order.makerReceiver, order.taker, order.takerToken];
        return await vuSwap.hash(addresses,
                                 order.makerValues,
                                 order.takerValues,
                                 order.expiration,
                                 order.nonce);
    }
});
