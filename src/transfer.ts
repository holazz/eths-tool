import 'dotenv/config'
import { JsonRpcProvider, Wallet, parseEther } from 'ethers'
import c from 'picocolors'
import prompts from 'prompts'
import { getEthscriptionsByAddress, getTransactionFee } from './api'
import { retry } from './utils'
import { EXPLORER_URL, RPC_URL } from './constants'

interface Token {
  hash: string
  p: string
  tick: string
  id: string
  amt: string
}

async function getAllTokens(address: string) {
  const ethscriptions = []
  let page = 1
  while (true) {
    const res = await retry(getEthscriptionsByAddress, Number.MAX_SAFE_INTEGER)(
      address,
      page,
    )
    if (res.length === 0) break
    ethscriptions.push(...res)
    page++
  }
  const tokenReg =
    /data:,{"p":"(.+)","op":"mint","tick":"(.+)","id":"(\d+)","amt":"(\d+)"}/
  const tokens: Token[] = ethscriptions
    .filter((ethscription) => {
      return ethscription.content_uri.match(tokenReg)
    })
    .map((ethscription) => {
      const match = ethscription.content_uri.match(tokenReg)
      const [, p, tick, id, amt] = match!
      return {
        hash: ethscription.transaction_hash,
        p,
        tick,
        id,
        amt,
      }
    })
  return tokens
}

function formatTokens(tokens: Token[]) {
  const formattedTokens = []
  const tokenMap = new Map()

  for (const token of tokens) {
    const { p, tick, id, hash } = token
    const key = `${p},${tick}`
    if (tokenMap.has(key)) {
      tokenMap.get(key).push({ id, hash })
    } else {
      tokenMap.set(key, [{ id, hash }])
    }
  }

  for (const [key, value] of tokenMap) {
    const [p, tick] = key.split(',')
    formattedTokens.push({ p, tick, list: value })
  }

  return formattedTokens
}

const provider = new JsonRpcProvider(RPC_URL)
const signer = new Wallet(process.env.PRIVATE_KEY!, provider)

async function run() {
  const tokens = await getAllTokens(signer.address)
  const formattedTokens = formatTokens(tokens)

  const balance = await provider.getBalance(signer.address)
  console.log(
    `钱包: ${c.yellow(signer.address)} (余额: ${c.green(
      `${Number(balance) / 1e18} ETH`,
    )})\n`,
  )

  const { list } = await prompts({
    type: 'select',
    name: 'list',
    message: '请选择要转移的铭文',
    choices: formattedTokens.map((token) => ({
      title: `${c.yellow(`${token.p}`)} ${token.tick} ${c.green(
        `(余额: ${token.list.length})`,
      )}`,
      value: token.list,
    })),
  })

  const { count } = await prompts({
    type: 'number',
    name: 'count',
    message: `请输入要转移的数量 (最大: ${c.green(`${list.length}`)})`,
    validate: (value) => {
      if (value < 1) {
        return '转移数量最少为 1'
      }
      if (value > list.length) {
        return `转移数量不能大于 ${list.length}`
      }
      return true
    },
  })

  const { address } = await prompts({
    type: 'text',
    name: 'address',
    message: '请输入接收铭文的地址',
  })

  const transferList = list.slice(0, count)
  const data = `0x${transferList.map((t: any) => t.hash.slice(2)).join('')}`

  const txFee = await getTransactionFee(provider, signer, {
    to: signer.address,
    value: parseEther('0'),
    data,
  })
  const { value: confirm } = await prompts({
    type: 'confirm',
    name: 'value',
    message: `预估手续费: ${c.yellow(`$${txFee}`)}, 确认转移吗?`,
    initial: true,
  })

  if (!confirm) return

  console.log('\n开始转移...\n')

  const tx = await signer.sendTransaction({
    to: address,
    value: parseEther('0'),
    data,
  })

  console.log(`${EXPLORER_URL}/tx/${tx.hash}`)
  console.log(transferList.map((t: any) => t.id))
}

run()
