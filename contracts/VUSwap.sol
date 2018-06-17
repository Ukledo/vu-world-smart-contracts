pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC721/ERC721.sol";
import "openzeppelin-solidity/contracts/ownership/HasNoEther.sol";
import "openzeppelin-solidity/contracts/ownership/HasNoTokens.sol";

/// @title VUSwap exchange contract.
/// Assumes makers and takers have approved this contract to access their balances.
contract VUSwap is HasNoEther, HasNoTokens {
    /// @dev OK
    uint constant OK = 1;
    /// @dev The makeAddress and takerAddress must be different
    uint constant ERROR_INVALID_ADDRESS = 1001;
    /// @dev If token is VUToken, values.len == 1
    uint constant ERROR_INVALID_VALUES = 1002;
    /// @dev Invalid signs
    uint constant ERROR_INVALID_SIGN = 1003;
    /// @dev The order has expired
    uint constant ERROR_EXPIRED = 1004;
    /// @dev Invalid taker address, only taker is permitted to execute 'trade'
    uint constant ERROR_INVALID_TAKER = 1005;
    /// @dev Invalid maker address, only maker is permitted to execute 'trade'
    uint constant ERROR_INVALID_MAKER = 1006;
    /// @dev Order has already been cancelled or filled
    uint constant ERROR_INVALID_FILL = 1007;

    /// @dev Mapping of order hash to bool (true = already filled).
    mapping (bytes32 => bool) public fills;

    /// @dev The VU Item Token address
    ERC721 public vuItemToken;

    /// @dev The VU Token address
    ERC20 public vuToken;

    ///@dev Event that is emitted when order is filled.
    event Filled(
        address indexed maker,
        address makerToken,
        address indexed makerReciever,
        address indexed taker,
        address takerToken);

    ///@dev Event that is emitted when order is cancelled.
    event Cancelled(
        address indexed maker,
        address makerToken,
        address indexed makerReciever,
        address indexed taker,
        address takerToken);

    ///@dev Event that is emitted when taker is failed to fill order.
    event Failed(
        uint error,
        address indexed maker,
        address indexed taker);

    /// @dev Constructor
    constructor(address _vu, address _vuItem)
    public
    {
        require(_vu != address(0));
        require(_vuItem != address(0));

        vuToken = ERC20(_vu);
        vuItemToken = ERC721(_vuItem);
    }

    /// addresses[0] = maker
    /// addresses[1] = makerToken
    /// addresses[2] = makerReceiver
    /// addresses[3] = taker
    /// addresses[4] = takerToken
    function fill(
        address[] addresses,
        uint[] makerValues,
        uint[] takerValues,
        uint expiration,
        uint nonce,
        uint8 v, bytes32 r, bytes32 s)
    public
    returns (uint)
    {
        // Only sender is permitted to fill an order
        if (addresses[3] /*taker*/ != msg.sender) {
            return ERROR_INVALID_TAKER;
        }

        bytes32 hashV;
        uint result;

        (result, hashV) = validate(addresses, makerValues, takerValues,
                                   expiration, nonce, v, r, s);

        if (result != OK) {
            emit Failed(result, addresses[0], addresses[3]);
            return result;
        }

        assert(result == OK);
        assert(hashV != bytes32(0));

        trade(addresses, makerValues, takerValues);

        fills[hashV] = true;
        emit Filled(addresses[0], addresses[1], addresses[2], addresses[3], addresses[4]);

        return OK;
    }

    function cancel(
        address[] addresses,
        uint[] makerValues,
        uint[] takerValues,
        uint expiration,
        uint nonce,
        uint8 v, bytes32 r, bytes32 s)
    public
    returns (uint)
    {
        // Only maker is permitted to fill an order
        if (addresses[0] /*taker*/ != msg.sender) {
            return ERROR_INVALID_MAKER;
        }

        bytes32 hashV;
        uint result;

        (result, hashV) = validate(addresses, makerValues, takerValues,
                                   expiration, nonce, v, r, s);

        if (result != OK) {
            emit Failed(result, addresses[0], addresses[3]);
            return result;
        }

        emit Cancelled(addresses[0], addresses[1], addresses[2], addresses[3], addresses[4]);
        fills[hashV] = true;

        return OK;
    }

    function validate(
        address[] addresses,
        uint[] makerValues,
        uint[] takerValues,
        uint256 expiration,
        uint256 nonce,
        uint8 v, bytes32 r, bytes32 s)
    public
    view
    returns (uint, bytes32)
    {
        // maker and taker sould not be the same
        if (addresses[0] /*maker*/ == addresses[3] /*taker*/) {
            return (ERROR_INVALID_ADDRESS, 0x0);
        }

        // order should not be expired
        if (expiration < now) {
            return (ERROR_EXPIRED, 0x0);
        }

        // VUItemToken should be either makerToken or takerToken
        if (addresses[1] != address(vuItemToken) && addresses[4] != address(vuItemToken)) {
            return (ERROR_INVALID_ADDRESS, 0x0);
        }

        // makerToken should be either VUItemToken or VUToken
        if (addresses[1] != address(vuItemToken) && addresses[1] != address(vuToken)) {
            return (ERROR_INVALID_ADDRESS, 0x0);
        }

        // takerToken should be either VUItemToken or VUToken
        if (addresses[4] != address(vuItemToken) && addresses[4] != address(vuToken)) {
            return (ERROR_INVALID_ADDRESS, 0x0);
        }

        bytes32 hashV = hash(addresses, makerValues, takerValues, expiration, nonce);

        // check if order is already filled or cancelled
        if (fills[hashV]) {
            return (ERROR_INVALID_FILL, 0x0);
        }

        // check signs
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedHash = keccak256(prefix, hashV);

        if (ecrecover(prefixedHash, v, r, s) != addresses[0]) {
            return (ERROR_INVALID_SIGN, 0x0);
        }

        // everything is correct
        return (OK, hashV);
    }

    function hash(
        address[] addresses,
        uint[] makerValues,
        uint[] takerValues,
        uint256 expiration,
        uint256 nonce)
    public
    pure
    returns (bytes32)
    {
        return keccak256(addresses[0], makerValues, addresses[1],
                         addresses[2],
                         addresses[3], takerValues, addresses[4],
                         expiration, nonce);
    }

    function trade(
        address[] addresses,
        uint[] makerValues,
        uint[] takerValues)
    private
    {
        address maker = addresses[0];
        address makerToken = addresses[1];
        address makerReceiver = addresses[2];
        address taker = addresses[3];
        address takerToken = addresses[4];

        transfer(takerToken, taker, makerReceiver, takerValues);
        transfer(makerToken, maker, taker, makerValues);
    }

    function transfer(address token, address from, address to, uint[] values)
    private
    {
        assert((token == address(vuItemToken) && values.length >= 1 )
                || (token == address(vuToken) && values.length == 1));

        if (token == address(vuItemToken)) {
            for (uint i = 0; i < values.length; i++) {
                ERC721(token).transferFrom(from, to, values[i]);
            }
        } else {
            require(ERC20(token).transferFrom(from, to, values[0]));
        }
    }
}
