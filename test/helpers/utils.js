function isException(error) {
    let strError = error.toString();
    return strError.includes('invalid opcode') || strError.includes('invalid JUMP') || strError.includes('revert') ;
}

module.exports = {
    zeroAddress: '0x0000000000000000000000000000000000000000',
    isException: isException
};
