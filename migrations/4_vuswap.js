var VUSwap = artifacts.require("VUSwap")
var VUToken = artifacts.require("VUTokenMock")
var VUItemToken = artifacts.require("VUItemToken")

module.exports = (deployer, network) => {
	deployer.then(async () => {
		if (network === "main") {
			// TODO
		} else if (network === "rinkeby") {
			await deployer.deploy(VUSwap, "0x5ab8e9d1c34b0be1ce6d59281265315e6bca78f7", VUItemToken.address)
		} else {
			await deployer.deploy(VUSwap, VUToken.address, VUItemToken.address)
		}
	})
}
