const mqtt = require('mqtt');

const log = require('./log');

module.exports = async () => {
    const serverUrl = `mqtt://${ process.env.MQTT_HOST || 'test.mosquitto.org' }`;

    log(`Connecting to "${serverUrl}" ...`);

    const client = mqtt.connect(serverUrl);
    await new Promise(resolve => {
        client.on('connect', () => {
            log(`Connected to "${serverUrl}"`);

            return resolve();
        });
    });

    return client;
}
