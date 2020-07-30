import redis from 'redis';
import util from 'util';

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

export const connectDb = function (host: string, port: number) {
    client = redis.createClient(port, host);
    client.on('connect', function () {
        getLogger().info(`redis connected!`);
    });

    client.on('error', function (err: Error) {
        getLogger().fatal(`redis error! ${err.message}`);
        process.exit(1);
    });
}

export default {
    get(...args) {
        return util.promisify(client.get).apply(client, args);
    },
    set(...args) {
        return util.promisify(client.set).apply(client, args);
    }
}