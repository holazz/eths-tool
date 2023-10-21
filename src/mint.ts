import 'dotenv/config'
import c from 'picocolors'
import prompts from 'prompts'
import pLimit from 'p-limit'
import { JsonRpcProvider, Wallet, parseEther } from 'ethers'
import { getEthscription, getTransactionFee } from './api'
import { generateScription, retry, utf8ToHex } from './utils'
import { EXPLORER_URL, RPC_URL } from './constants'

const provider = new JsonRpcProvider(RPC_URL)
const signer = new Wallet(process.env.PRIVATE_KEY!, provider)

async function filterScription(id: number) {
  const res = await getEthscription(id)
  const { result, ethscription } = res.data

  if (!result) {
    console.log(`${id}: ${c.green(utf8ToHex(generateScription(id)))}`)
    return id
  } else {
    console.log(
      `${c.dim(id)}: ${c.dim(
        `${ethscription.creator} -> ${ethscription.current_owner}`,
      )}`,
    )
  }
}

async function getAvailableIds(
  message = '请输入 ID 查询范围 (用空格分隔, 如: 1 100)',
) {
  const { range } = await prompts({
    type: 'text',
    name: 'range',
    message,
    format: (value) => value.split(' ').slice(0, 2).map(Number),
    validate: (value) => {
      const [startId, endId] = value.split(' ').slice(0, 2).map(Number)
      if (isNaN(startId) || isNaN(endId)) {
        return '请输入范围数字'
      }
      if (startId > endId) {
        return '结束查询 ID 不能小于起始查询 ID'
      }
      return true
    },
  })
  const [startId, endId] = range
  const ids = Array.from({ length: endId - startId + 1 }, (_, i) => i + startId)
  const limit = pLimit(100)
  const promises = ids.map((id) =>
    limit(() => retry(filterScription, Number.MAX_SAFE_INTEGER)(id)),
  )
  const availableIds = (await Promise.all(promises)).filter(Boolean) as number[]
  return availableIds
}

async function mint(ids: number[], nonce: number, address = signer.address) {
  const promises = ids.map((id, index) =>
    signer.sendTransaction({
      to: address,
      value: parseEther('0'),
      data: `0x${utf8ToHex(generateScription(id))}`,
      nonce: nonce + index,
    }),
  )
  return Promise.all(promises)
}

async function run() {
  const receiverAddress = process.env.RECEIVER_ADDRESS || signer.address
  const balance = await provider.getBalance(signer.address)
  console.log(`${c.bgBlue(process.env.ETHSCRIPTION_TEMPLATE)}\n`)
  console.log(
    `付款钱包: ${c.yellow(signer.address)} (余额: ${c.green(
      `${Number(balance) / 1e18} ETH`,
    )})`,
  )
  console.log(`收币钱包: ${c.yellow(receiverAddress)}\n`)
  let availableIds = await getAvailableIds()
  while (availableIds.length === 0) {
    availableIds = await getAvailableIds(
      '没有可用 ID, 请重新输入查询范围 (用空格分隔, 如: 1 100)',
    )
  }
  console.log('\n可用 ID: ', availableIds, '\n')

  const { count } = await prompts({
    type: 'number',
    name: 'count',
    message: `请输入要 Mint 的数量 (最大: ${c.green(
      `${availableIds.length}`,
    )})`,
    validate: (value) => {
      if (value < 1) {
        return 'Mint 数量最少为 1'
      }
      if (value > availableIds.length) {
        return `Mint 数量不能大于 ${availableIds.length}`
      }
      return true
    },
  })

  const nonce = await provider.getTransactionCount(signer.address)

  const txFee = await getTransactionFee(provider, signer, {
    to: signer.address,
    value: parseEther('0'),
    data: `0x${utf8ToHex(generateScription(1))}`,
  })

  const { value: confirm } = await prompts({
    type: 'confirm',
    name: 'value',
    message: `预估手续费: ${c.yellow(`$${txFee}`)}, 确认交易吗?`,
    initial: true,
  })

  if (!confirm) return

  console.log('\n开始 Mint...\n')

  const mintIds = availableIds.slice(0, count)
  const receipts = await mint(mintIds, nonce, receiverAddress)
  console.log(
    receipts.map((receipt, index) => ({
      id: mintIds[index],
      tx: `${EXPLORER_URL}/tx/${receipt.hash}`,
    })),
  )
}

run()
