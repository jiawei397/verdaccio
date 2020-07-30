import redis from 'redis';
import util from 'util';

const client = redis.createClient(6379, '192.168.21.176');

/* eslint-disable @typescript-eslint/no-var-requires */
const LoggerApi = require('./logger');

client.on('connect', function () {
    const logger = LoggerApi.logger.child({ sub: 'db' });
    logger.info(`redis connected!`);
});

export default {
    get: util.promisify(client.get).bind(client),
    set: util.promisify(client.set).bind(client)
}