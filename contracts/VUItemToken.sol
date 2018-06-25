pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721Token.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./lib/Strings.sol";


///
/// @title VUItemToken
contract VUItemToken is ERC721Token, Ownable {
    constructor()
    public
    ERC721Token("VUItem", "VUI")
    { }

    function mint(address _to, uint _tokenId, bytes32 _uri)
    public
    onlyOwner
    {
        super._mint(_to, _tokenId);
        super._setTokenURI(_tokenId, Strings.bytes32ToString(_uri));
    }

    function massMint(address _to, uint[] _tokenId, bytes32[] _uri)
    public
    onlyOwner
    {
        require(_tokenId.length == _uri.length);
        for(uint i =0; i < _tokenId.length; i++) {
            mint(_to, _tokenId[i], _uri[i]);
        }
    }

    function burn(uint _tokenId)
    public
    onlyOwnerOf(_tokenId)
    {
        super._burn(ownerOf(_tokenId), _tokenId);
    }
}
