var VUToken = artifacts.require("VUToken")

module.exports = (deployer, network) => {
	deployer.then(async () => {
		if (network === "development") {
			await deployer.deploy(VUToken)
		}
	})
}
