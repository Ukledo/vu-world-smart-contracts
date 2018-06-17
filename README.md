# VU World Smart Contracts

## Intro
In the present article under consideration there are some vital user guidelines on compiling, deploying and managing the smart contracts of _VU Item Token_.

## VUItemToken

### General Overview
_VUItemToken_ is non-fungible token which implements _ERC721_ standard. It provides basic functionality to track and transfer unique items in _VU World_.
The main properties of _VUItemToken_ are:
- _id_ is unique numeric identifier,
- _Uniform Resource Identifier_ (URI), which points to unchangeable _VUItemToken's_ metadata.

Please, refer to [this](http://erc721.org) and [this](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-721.md) for more details.

### Metadata
VU Item's metadata is not stored in blockchain. Instead, each VU Item has URI which points to a JSON file that conforms to the _ERC721 Metadata JSON Schema_.

This is the _ERC721 Metadata JSON Schema_ referenced above.
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
_Standart_: ERC721
_Name_: VUItem
_Symbol_: VUI
|Network|Address |
|---|---|
|Mainnet|TBD|
|Rinkeby|TBD|
|Kovan|TBD|

### How to manage VUItemToken

#### Mint
To create a single VUItem, use `mint(address to, uint id, bytes32 uri)` function:
```
await vuItemToken.mint(to, token1ID, "hash1")
```
Note: use valid _URI_ instead of dummy `hash1`, only a contract owner is permitted to execute this function.

#### Minting
To create multiple VUItems in a single transaction, use `massMint(address to, uint[] ids, bytes32[] uris)` function:
```
await vuItemToken.massMint(to, [token1ID,token2ID], ["hash1", "hash2"])
```
Note: use valid _URIs_ instead of dummy `hash#`, only a contract owner is permitted to execute this function.

#### Transfer
To transfer _VUItem_, use `transferFrom(address from, address to, uint id)` function:
```
await vuItemToken.transferFrom(from, to, itemID)
```
Note: only a token's owner is permitted to perform this function.

## VUSwap
_VUSwap_ contract allows to trade _VUItems_. It is quite important that it is a pure _Decentralized Exchange_. It does not rely on a third party service to hold the customer's funds. Instead, trades occur directly between users (peer to peer) through an automated process.

_VUSwap_ allows to buy a bunch of _VUItems_ in a single transaction.

There is a basic trade workflow description, where `buyer` is a person who wants to buy _VUItems_, `seller` is a person who sells _VUItems_.

### 1. (Optional) Setup unlimited allowance
```
await vuItemToken.setApprovalForAll(vuSwap.address, true, {from: buyer})
await vuToken.approve(user1, UINX_MAX, {from: seller})
```
This step is optional, but strongly recommended. _Unlimited allowance_ simplifies trade workflow. Once performed, it decreases count of transactions needed for _swap_: only a single `buyer's` transaction should be performed to buy the tokens. `Seller` does not spend his ETH.

### 3. Agree on the terms of an order
Both, `seller` and `buyer` should agree on the terms of an order. It is off-chain computations, no gas required. Web site or/and desktop application could be used to help users make an agreement.

There is an order structure:
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

### 4. Sign
`Seller` should sign the order's data (off-chain, no gas required):
```
const { v, r, s } = await signature(order, seller);
```
Then, `seller` should share `{ v, r, s }` with `buyer`.

### 5. Trade
`Buyer` should fill the order (i.e. execute transaction, gas required):
```
let addresses = [order.maker, order.makerToken, order.makerReceiver, order.taker, order.takerToken];
let result = await vuSwap.fill(addresses,
                                order.makerValues,
                                order.takerValues,
                                order.expiration,
                                order.nonce,
                                v, util.bufferToHex(r), util.bufferToHex(s), {from: buyer});

```
### 6. Bingo!
Trade is done.

## Crowdsale
There is a basic crowdsale workflow description
1. `Owner` mints _VUItems_ to `middleware`. `Middleware` is an automated service (backend) which holds all _VUItems_ for sell, and generates `signs` if user wants to buy some _VUItems_.
2. `Middleware` should allow `Swap` contract to spend his tokens, see _unlimited allowance_. Only 1 transaction should be performed here. After this step, `Middleware` performs only off-chain computations, it may have zero balance.
3. `Middleware` generates `signs` when `buyer` wants to buy some _VUItems_ and sends an order details to `buyer`.
4. `Buyer` fills the order generated by `Middleware` via _VUSwap_ contract.
5. Done.

# Good luck!
