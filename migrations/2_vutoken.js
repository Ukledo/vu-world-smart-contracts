var VUToken = artifacts.require("VUTokenMock")

module.exports = (deployer, network) => {
	deployer.then(async () => {
		if (network === "development") {
			await deployer.deploy(VUToken)
		}
	})
}
