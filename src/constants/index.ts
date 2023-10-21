import 'dotenv/config'

export const RPC_URL =
  process.env.NETWORK === 'mainnet'
    ? `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`
    : `https://goerli.infura.io/v3/${process.env.INFURA_API_KEY}`

export const EXPLORER_URL =
  process.env.NETWORK === 'mainnet'
    ? 'https://etherscan.io'
    : 'https://goerli.etherscan.io'

export const ETHSCRIPTION_API_URL =
  process.env.NETWORK === 'mainnet'
    ? 'https://api.ethscriptions.com/api'
    : 'https://goerli-api.ethscriptions.com/api'
