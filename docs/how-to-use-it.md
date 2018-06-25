# How to use it:
## Step 1:
Setup, open ganache in one terminal, open another terminal and deploy the contracts.
Login to truffle console.

Steps to reproduce it, run these commands in the console
```
$ ganache-cli
$ truffle migrate --development
$ truffle console --development
```
[Video recorded Step 1](https://www.useloom.com/share/f0ef046a4639481a98c14d8c202e38f7)

## Step 2:
Minting items for one address and tokens for another address.

Steps to reproduce it, run these commands in the truffle console
```
$ VUItemToken.at(VUItemToken.address).mint.call(web3.eth.accounts[4], 1, "hash1")
$ VUItemToken.at(VUItemToken.address).mint.call(web3.eth.accounts[4], 2, "hash2")
```

[Video recorded Step 2](https://www.useloom.com/share/f2acc12130f24e2b8bc465bb6c12376e)

## Step 3:
Make the "approvals".

Steps to reproduce it, run these commands in the truffle console

```
$ web3.eth.accounts
$ VUItemToken.at(VUItemToken.address).setApprovalForAll.call(VUSwap.address, true, {from: web3.eth.accounts[3]})
$ VUTokenMock.at(VUTokenMock.address).approve.call(web3.eth.accounts[2], 5, {from: web3.eth.accounts[4]})
```

[Video recorded Step 3](https://www.useloom.com/share/83b46b006e104ed08f86af1854cfaea5)

## Step 4:
Create the order and sign the order.
Create a transaction from the buyer.
Show the VUToken balance before and after the transfer in each of the users.

Steps to reproduce it, you must execute this file in the truffle console.

How to execute it? Put the code in a file called 'index.js', the command to execute it is the following:
```
$ exec ./docs/scripts/index.js
```
The video is at the end.

### Code example

#### index.js
```
const contract = require('truffle-contract')
const Web3 = require('web3')
const utils = require('./utils')
const util = require("ethereumjs-util");
const assert = require('assert')
const BigNumber = require('bignumber.js')
const item1ID = 1
const item2ID = 2
const VU_TOKEN_AMOUNT = 200
const VU_TOKEN_AMOUNT_TRANSACTION = 100

module.exports = async function (callback) {

    try {
        const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'))

        web3.currentProvider.sendAsync = function () {
            return web3.currentProvider.send.apply(web3.currentProvider, arguments)
        };

        let accounts = await web3.eth.getAccounts()
        const [owner, middleware, user1, user2, stranger, wallet] = accounts

        const vuItemToken = require('../build/contracts/VUItemToken.json')
        const vuTokenMock = require('../build/contracts/VUTokenMock.json')
        const vuSwap = require('../build/contracts/VUSwap.json')

        // Deploy contracts
        let VUItem = contract(vuItemToken)
        let VUToken = contract(vuTokenMock)
        let VUSwap = contract(vuSwap)

        VUItem.setProvider(web3.currentProvider)
        VUToken.setProvider(web3.currentProvider)
        VUSwap.setProvider(web3.currentProvider)

        const VUItemTokenContract = await VUItem.deployed()
        console.log(`- Deploy VUItemToken Contract - Address: ${VUItemTokenContract.address}`)
        const VUTokenContract = await VUToken.deployed()
        console.log(`- Deploy VUToken Contract - Address: ${VUTokenContract.address}`)
        const VUSwapContract = await VUSwap.deployed()
        console.log(`- Deploy VUItemToken Contract - Address: ${VUSwapContract.address}`)

        await utils.sleep(8000)

        // Make the initial transfer, mass mint and the approval
        await VUTokenContract.transfer(user1, VU_TOKEN_AMOUNT, {from: owner})
        await VUTokenContract.transfer(user2, VU_TOKEN_AMOUNT, {from: owner})
        console.log(`- Transfer ${VU_TOKEN_AMOUNT} VUTokens to user1: OK`)
        console.log(`- Transfer ${VU_TOKEN_AMOUNT} VUTokens to user2: OK`)

        await VUTokenContract.approve(VUSwapContract.address, VU_TOKEN_AMOUNT, {from: user1})

        await VUItemTokenContract.massMint(user2, [item1ID, item2ID], ["uri1", "uri2"], {from: owner, gas: 3000000})
        console.log(`- Give item1 and item2 to user2: OK`)

        await VUItemTokenContract.setApprovalForAll(VUSwapContract.address, true, {from: user2})

        // Check item ownership
        let item1Owner = await VUItemTokenContract.ownerOf(item1ID);
        assert.strictEqual(item1Owner.toUpperCase(), user2.toUpperCase())
        let item2Owner = await VUItemTokenContract.ownerOf(item2ID);
        assert.strictEqual(item2Owner.toUpperCase(), user2.toUpperCase())
        console.log(`- Check item1 and item2 belong to user2: OK`)

        // Check balance
        assert.ok((await VUTokenContract.balanceOf(user1)).gte(VU_TOKEN_AMOUNT));
        console.log(`- User1's balance of VU should be equal ${VU_TOKEN_AMOUNT}: OK`)
        assert.ok((await VUTokenContract.balanceOf(user2)).gte(VU_TOKEN_AMOUNT));
        console.log(`- User2's balance of VU should be equal ${VU_TOKEN_AMOUNT}: OK`)


        // Fill order
        let order = {};

        order.maker = user2;
        order.makerToken = VUItemTokenContract.address;
        order.makerReceiver = user2;
        order.makerValues = [item1ID, item2ID];
        order.taker = user1;
        order.takerToken = VUTokenContract.address;
        order.takerValues = [VU_TOKEN_AMOUNT_TRANSACTION];
        order.expiration = (new Date().getTime() + 60000) / 1000;
        order.nonce = 1;

        let orderHash = async (order) => {
            let addresses = [order.maker, order.makerToken, order.makerReceiver, order.taker, order.takerToken]
            return await VUSwapContract.hash(addresses,
                order.makerValues,
                order.takerValues,
                order.expiration,
                order.nonce)
        }

        let signature = async (order, signer) => {
            const msg = await orderHash(order)
            const sig = await web3.eth.sign(util.bufferToHex(msg), signer)
            return util.fromRpcSig(sig);
        }

        // Generate order hash and signing
        const { v, r, s } = await signature(order, user2)

        console.log(`- User2 start transaction of VU Items: OK`)
        // Fill transaction
        let addresses = [order.maker, order.makerToken, order.makerReceiver, order.taker, order.takerToken]
        let response = await VUSwapContract.fill(addresses,
             order.makerValues,
             order.takerValues,
             order.expiration,
             order.nonce,
             v, util.bufferToHex(r), util.bufferToHex(s), {from: user1, gas: 3000000})

        await utils.sleep(2000)

        // Check transaction
        let balanceUser1 = await VUTokenContract.balanceOf(user1)
        let vuTokenAmount1 = new BigNumber(VU_TOKEN_AMOUNT_TRANSACTION)
        assert.strictEqual(balanceUser1.toNumber(), vuTokenAmount1.toNumber());
        console.log(`- User1's balance of VU should be equal ${balanceUser1.toNumber()}: OK`)

        let balanceUser2 = await VUTokenContract.balanceOf(user2)
        let vuTokenAmount2 = new BigNumber(VU_TOKEN_AMOUNT + VU_TOKEN_AMOUNT_TRANSACTION)
        assert.strictEqual(balanceUser2.toNumber(), vuTokenAmount2.toNumber());
        console.log(`- User2's balance of VU should be equal ${balanceUser2.toNumber()}: OK`)


        let item1NewOwner = await VUItemTokenContract.ownerOf(item1ID)
        assert.strictEqual(item1NewOwner.toUpperCase(), user1.toUpperCase())

        let item2NewOwner = await VUItemTokenContract.ownerOf(item2ID)
        assert.strictEqual(item2NewOwner.toUpperCase(), user1.toUpperCase())
        console.log(`- User2 should be an owner of [${item1ID}, ${item2ID}] VU Items: OK`)

    } catch (err) {
        console.log(err)

        console.log(err.msg || 'Sorry, there is a problem with the script')
    }
}
```
#### utils.js
```
module.exports.sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms))
}
```

[Video recorded Step 4](https://www.useloom.com/share/2b216c50b9d34d999fb5c106cb231f5e)