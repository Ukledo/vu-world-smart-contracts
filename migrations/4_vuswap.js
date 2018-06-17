var VUSwap = artifacts.require("VUSwap")
var VUToken = artifacts.require("VUTokenMock")
var VUItemToken = artifacts.require("VUItemToken")

module.exports = (deployer, network) => {
	deployer.then(async () => {
		await deployer.deploy(VUSwap, VUToken.address, VUItemToken.address)
	})
}
