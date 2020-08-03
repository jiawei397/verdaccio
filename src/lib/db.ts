import redis from 'redis';
import util from 'util';
import ms from 'ms';

/* eslint-disable @typescript-eslint/no-var-requires */
const LoggerApi = require('./logger');
let client;
let logger;

const getLogger = function () {
    if (!logger) {
        logger = LoggerApi.logger.child({ sub: 'db' });
    }
    return logger;
};

export const connectDb = function (host: string, port: number, password?: any) {
    // console.log(host, '-------', port, '--------', password)
    client = redis.createClient(port, host, password === undefined ? undefined : {
        auth_pass: password
    });
    client.on('connect', function () {
        getLogger().info(`redis connected!`);
    });

    client.on('error', function (err: Error) {
        getLogger().fatal(`redis error! ${err.message}`);
        process.exit(1);
    });
}

const getSeconds = function (time: string): number | undefined {
    const milliseconds = ms(time);
    if (milliseconds !== undefined) { // 如果为undefined，说明time非法
        return Math.floor(milliseconds / 1000);
    }
};

export default {
    get(...args) {
        return util.promisify(client.get).apply(client, args);
    },
    async set(key: string, value: string, expires?: number | string) {
        await util.promisify(client.set).apply(client, [key, value]);
        // 设置过期
        if (expires) {
            if (typeof expires === 'string') { // 代表是3d、2m之类
                const seconds = getSeconds(expires);
                if (seconds) {
                    client.expire(key, seconds);
                }
            } else {
                client.expire(key, expires);
            }
        }
    }
}