const mqtt = require('mqtt');

const serverUrl = 'mqtt://test.mosquitto.org';

async function init () {
    console.log(`${(new Date()).toISOString()} | connecting to ${serverUrl} ..`);
    const client = mqtt.connect(serverUrl);
    await new Promise(resolve => {
        client.on('connect', () => {
            console.log(`${(new Date()).toISOString()} | connected to ${serverUrl}`);
            return resolve();
        });
    });

    client.subscribe('data');

    client.on('message', (topic, message) => {
        // do nothing
    });
}

init();
