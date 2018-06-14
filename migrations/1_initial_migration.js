var Migrations = artifacts.require("Migrations")

module.exports = (deployer, network) => {
	deployer.then(async () => {
		await deployer.deploy(Migrations)
	})
}
