import 'dotenv/config'
import utf8 from 'crypto-js/enc-utf8'
import base64 from 'crypto-js/enc-base64'

export function utf8ToBase64(data: string) {
  return base64.stringify(utf8.parse(data))
}

export function base64ToUtf8(data: string) {
  try {
    return utf8.stringify(base64.parse(data))
  } catch (err) {
    return ''
  }
}

export function utf8ToHex(data: string) {
  return utf8.parse(data).toString()
}

export function generateScription(id: number | string) {
  return process.env.ETHSCRIPTION_TEMPLATE?.replace(/\${id}/, `${id}`) ?? ''
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function retry<T>(
  fn: (...args: any[]) => Promise<T>,
  times = 0,
  delay = 0,
) {
  return (...args: any[]): Promise<T> =>
    new Promise((resolve, reject) => {
      const attempt = async () => {
        try {
          resolve(await fn(...args))
        } catch (err) {
          if (times-- <= 0) {
            reject(err)
          } else {
            setTimeout(attempt, delay)
          }
        }
      }
      attempt()
    })
}

export function isPrime(num: number) {
  if (num <= 1) {
    return false
  }
  for (let i = 2; i <= Math.sqrt(num); i++) {
    if (num % i === 0) {
      return false
    }
  }
  return true
}
