# VU World Smart Contracts [![Build Status](https://travis-ci.org/Ukledo/vu-world-smart-contracts.svg?branch=master)](https://travis-ci.org/Ukledo/vu-world-smart-contracts) [![Coverage Status](https://coveralls.io/repos/github/Ukledo/vu-world-smart-contracts/badge.svg?branch=master)](https://coveralls.io/github/Ukledo/vu-world-smart-contracts?branch=master)

## Intro
In this article I’ll cover vital user guidelines on compiling, deploying and managing the smart contracts of the VU Item Token.

## VUItemToken

### General Overview
_VUItemToken_ is non-fungible token which implements the _ERC721_ standard. It provides basic functionality for tracking and transferring unique items in _VU World_.

The main properties of VUItemToken are:
_id_: a unique numeric identifier
_Uniform Resource Identifier (URI)_: points to unchangeable VUItemToken's metadata.

Please, refer to [this](http://erc721.org) and [this](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-721.md) for more details.


### Metadata
VU Item's metadata is not stored on the blockchain. Instead, each _VU Item_ has a _URI_ which points to a JSON file that conforms to the below _ERC721 Metadata JSON Schema_:
```
{
    "title": "Asset Metadata",
    "type": "object",
    "properties": {
        "name": {
            "type": "string",
            "description": "Identifies the asset to which this NFT represents",
        },
        "description": {
            "type": "string",
            "description": "Describes the asset to which this NFT represents",
        },
        "image": {
            "type": "string",
            "description": "A URI pointing to a resource with mime type image/* representing the asset to which this NFT represents. Consider making any images at a width between 320 and 1080 pixels and aspect ratio between 1.91:1 and 4:5 inclusive.",
        }
    }
}
```

### VUItemToken Details
Standart: ERC721
* Name: VUItem
* Symbol: VUI

|Network|Address|
|---|---|
|Mainnet|TBD|
|Rinkeby|TBD|
|Kovan|TBD|

### How to manage VUItemToken
#### Mint
To create a single _VUItem_, use the `mint(address to, uint id, bytes32 uri)` function:
```
await vuItemToken.mint(to, token1ID, "hash1")
```
Note: use a valid URI instead of dummy `hash1`. Only a contract owner is permitted to execute this function.

#### Minting
To create multiple `VUItems` in a single transaction, use the `massMint(address to, uint[] ids, bytes32[] uris)` function:
```
await vuItemToken.massMint(to, [token1ID,token2ID], ["hash1", "hash2"])
```
Note: use valid URIs instead of dummy `hash#`. Only a contract owner is permitted to execute this function.

#### Transfer
To transfer a `VUItem`, use the `transferFrom(address from, address to, uint id)` function:
```
await vuItemToken.transferFrom(from, to, itemID)
```
Note: only a token's owner is permitted to perform this function.

## VUSwap
The `VUSwap` contract allows the trading of `VUItems` over a purely `Decentralized Exchange`. `VU` does not rely on a third party service to hold the customer's funds. Instead, trades occur directly between users (peer to peer) through an automated process.
VUSwap allows to buy a bunch of `VUItems` in a single transaction.

There is a basic trade workflow description, where buyer is a person who wants to buy `VUItems`, and seller is a person who sells `VUItems`.

#### 1. (Optional) Setup unlimited allowance
```
await vuItemToken.setApprovalForAll(vuSwap.address, true, {from: buyer})
await vuToken.approve(user1, UINX_MAX, {from: seller})
```
This step is optional, but strongly recommended. `Unlimited allowance` simplifies your trade workflow. Once executed, it decreases the number of transactions needed for swap. Only a single `buyer's` transaction should be performed to buy the tokens. `Seller` does not spend his `ETH`.

#### 2. Agree on the terms of an order
Both `seller` and `buyer` should agree on the terms of an order outside of actions performed on the `VU Exchange`. Websites and/or desktop applications could be used to help users make an agreement.

Below is an example `order` structure:
```
order.maker = seller; // seller address
order.makerToken = vuItemToken.address; // address of VUItem Token
order.makerReceiver = seller; // seller will receive VUTokens
order.makerValues = [item1ID, item2ID]; // ids of VUItems, will be transferred to buyer
order.taker = buyer; // who wants to buy VUItems
order.takerToken = vuToken.address; // usually it is VUToken's address
order.takerValues = [VU_TOKEN_AMOUNT]; // amount of takerToken which will be transferred to seller
order.expiration = new Date().getTime() + 60000; // expiration date
order.nonce = 1; // nonce, should be incremented
```

#### 3. Sign
`Seller` should sign the order's data (off-chain, no gas required):
```
const { v, r, s } = await signature(order, seller);
```
Then, `seller` should share { v, r, s } with `buyer`.

#### 4. Trade
`Buyer` should fill the `order` (i.e. execute transaction, gas required):
```
let addresses = [order.maker, order.makerToken, order.makerReceiver, order.taker, order.takerToken];
let result = await vuSwap.fill(addresses,
                                order.makerValues,
                                order.takerValues,
                                order.expiration,
                                order.nonce,
                                v, util.bufferToHex(r), util.bufferToHex(s), {from: buyer});
```

#### 5. Bingo!
Trade is done.

## Crowdsale
There is also a basic crowdsale workflow, which I’ve outlined below:
- Owner mints `VUItems` to `middleware`. `Middleware` is an automated service (backend) which holds all `VUItems` for sell, and generates signs if user wants to buy some `VUItems`.
- `Middleware` should allow `VUSwap contract` to spend his tokens, see `unlimited allowance`. Only 1 transaction should be performed here. After this step, `Middleware` performs only off-chain computations, it may have zero balance.
- `Middleware` generates signs when `buyer` wants to buy some `VUItems` and sends an order details to `buyer`.
- `Buyer` fills the order generated by `Middleware` via `VUSwap contract`.
- Done.

## More

Example with videos available [here](docs/how-to-use-it.md).
