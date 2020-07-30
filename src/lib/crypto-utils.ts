import { createDecipher, createCipher, createHash, pseudoRandomBytes, Hash } from 'crypto';

import jwt from 'jsonwebtoken';
import { JWTSignOptions, RemoteUser } from '@verdaccio/types';

import db from './db';

export const defaultAlgorithm = 'aes192';
export const defaultTarballHashAlgorithm = 'sha1';

export function aesEncrypt(buf: Buffer, secret: string): Buffer {
  // deprecated (it will be migrated in Verdaccio 5), it is a breaking change
  // https://nodejs.org/api/crypto.html#crypto_crypto_createcipher_algorithm_password_options
  // https://www.grainger.xyz/changing-from-cipher-to-cipheriv/
  const c = createCipher(defaultAlgorithm, secret);
  const b1 = c.update(buf);
  const b2 = c.final();
  return Buffer.concat([b1, b2]);
}

export function aesDecrypt(buf: Buffer, secret: string): Buffer {
  try {
    // deprecated (it will be migrated in Verdaccio 5), it is a breaking change
    // https://nodejs.org/api/crypto.html#crypto_crypto_createdecipher_algorithm_password_options
    // https://www.grainger.xyz/changing-from-cipher-to-cipheriv/
    const c = createDecipher(defaultAlgorithm, secret);
    const b1 = c.update(buf);
    const b2 = c.final();
    return Buffer.concat([b1, b2]);
  } catch (_) {
    return new Buffer(0);
  }
}

export function createTarballHash(): Hash {
  return createHash(defaultTarballHashAlgorithm);
}

/**
 * Express doesn't do ETAGS with requests <= 1024b
 * we use md5 here, it works well on 1k+ bytes, but sucks with fewer data
 * could improve performance using crc32 after benchmarks.
 * @param {Object} data
 * @return {String}
 */
export function stringToMD5(data: Buffer | string): string {
  return createHash('md5')
    .update(data)
    .digest('hex');
}

export function generateRandomHexString(length = 8): string {
  return pseudoRandomBytes(length).toString('hex');
}

export async function signToken(tk: string, secretOrPrivateKey: string, options: JWTSignOptions): Promise<string> {
  return new Promise(function (resolve, reject): Promise<string> {
    return jwt.sign(
      {tk},
      secretOrPrivateKey,
      {
        notBefore: '1', // Make sure the time will not rollback :)
        ...options,
      },
      (error, token) => {
        if (error) {
          reject(error)
        } else {
          resolve(token);
        }
      }
    );
  });
}

export async function signPayload(payload: RemoteUser, secretOrPrivateKey: string, options: JWTSignOptions): Promise<string> {
  return new Promise(function (resolve, reject): Promise<string> {
    return jwt.sign(
      payload,
      secretOrPrivateKey,
      {
        notBefore: '1', // Make sure the time will not rollback :)
        ...options,
      },
      async (error, token) => {
        if (error) {
          reject(error)
        } else {
          // const hash = stringToMD5(token);
          const md5Tk: string = stringToMD5(token);
          const finalToken: string = await signToken(md5Tk, secretOrPrivateKey, options);
          // console.log(finalToken);
          // console.log(finalToken.length);
          await db.set(finalToken, token);
          // resolve(token);
          resolve(finalToken);
        }
      }
    );
  });
}

export async function verifyPayload(finalToken: string, secretOrPrivateKey: string): RemoteUser {
  // console.log("-------verify-------", finalToken)
  const token = await db.get(finalToken);
  if (!token) {
    throw new Error('未找到token by ' + finalToken);
  }
  // console.log("-------verify-------", token)
  // const md5Tk = jwt.verify(token, secretOrPrivateKey);
  return jwt.verify(token, secretOrPrivateKey);
}
