var VUItemToken = artifacts.require("VUItemToken")

module.exports = (deployer, network) => {
	deployer.then(async () => {
		await deployer.deploy(VUItemToken)
	})
}
