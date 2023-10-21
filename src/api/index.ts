import sha256 from 'crypto-js/sha256'
import axios from 'axios'
import { generateScription } from '../utils'
import { ETHSCRIPTION_API_URL } from '../constants'

import type { JsonRpcProvider, TransactionRequest, Wallet } from 'ethers'

export async function getTransactionFee(
  provider: JsonRpcProvider,
  signer: Wallet,
  tx: TransactionRequest,
) {
  const res = await axios.get(
    `https://api.etherscan.io/api?module=stats&action=ethprice&apikey=${process.env.ETHERSCAN_API_KEY}`,
  )
  const { ethusd } = res.data.result
  const { gasPrice } = await provider.getFeeData()
  const estimateGas = await signer.estimateGas(tx)
  return Number(
    (Number(ethusd) * Number(gasPrice) * Number(estimateGas) * 1e-18).toFixed(
      2,
    ),
  )
}

export async function getEthscription(id: number | string) {
  const scription = generateScription(id)
  const sha = sha256(scription).toString()
  return axios.get(`${ETHSCRIPTION_API_URL}/ethscriptions/exists/${sha}`)
}

export async function getEthscriptionsByAddress(address: string, page = 1) {
  const res = await axios.get(
    `${ETHSCRIPTION_API_URL}/ethscriptions/owned_by/${address}`,
    {
      params: {
        per_page: 100,
        page,
      },
    },
  )
  return res.data
}

export async function getAllEthscriptions(page = 1) {
  const res = await axios.get(`${ETHSCRIPTION_API_URL}/ethscriptions`, {
    params: {
      per_page: 100,
      page,
    },
  })
  return res.data
}
