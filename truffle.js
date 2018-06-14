module.exports = {
networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*', // Match any network id
      gas: 5700000
    }
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  migrations_directory: './migrations'
}
