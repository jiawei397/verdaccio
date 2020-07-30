import redis from 'redis';
import util from 'util';

/* eslint-disable @typescript-eslint/no-var-requires */
const LoggerApi = require('./logger');
const client = redis.createClient(6379, '192.168.21.176');

let logger;
const getLogger = function () {
    if (!logger) {
        logger = LoggerApi.logger.child({ sub: 'db' });
    }
    return logger;
};

client.on('connect', function () {
    getLogger().info(`redis connected!`);
});

client.on('error', function () {
    getLogger().error(`redis error!`);
});

export default {
    get: util.promisify(client.get).bind(client),
    set: util.promisify(client.set).bind(client)
}