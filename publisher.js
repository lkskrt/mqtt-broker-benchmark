const crypto = require('crypto');
const mqtt = require('mqtt');
const NanoTimer = require('nanotimer');
const now = require('performance-now');
const fs = require('fs');

// config
const resultJsonPath = 'results.json';
const paramsJsonPath = 'params.json';
const testDurationInSeconds = 10;
const payloadSizeInByte = {
    start: 0,
    end: 1024,
    stepSize: 100,
};
const messagesPerSecond = {
    start: 1000,
    end: 40000,
    stepSize: 4000,
};
const bytePerSecondCap = Math.pow(1024, 2); // 1MB/s


const serverUrl = `mqtt://${ process.env.MQTT_HOST || 'test.mosquitto.org' }`;


async function init () {
    let params = [];
    if (fs.existsSync(paramsJsonPath)) {
        params = JSON.parse(fs.readFileSync(paramsJsonPath));
    } else {
        params = generateParams();
        fs.writeFileSync(paramsJsonPath, JSON.stringify(params));
    }
    const paramsToTest = params.filter(param => !param.done);

    console.log(`Total execution will take at least: ${paramsToTest.length * testDurationInSeconds} seconds`);

    let results = [];
    if (fs.existsSync(resultJsonPath)) {
        results = JSON.parse(fs.readFileSync(resultJsonPath));
    }

    for (let param of paramsToTest) {
        const result = await runTest(param.payloadSizeInByte, param.messagesPerSecond);
        results.push(result);
        param.done = true;
        fs.writeFileSync(resultJsonPath, JSON.stringify(results));
        fs.writeFileSync(paramsJsonPath, JSON.stringify(params));
    }
}

async function runTest (currentPayloadSizeInByte, currentMessagesPerSecond) {
    console.log(`${(new Date()).toISOString()} | Starting test: ${currentPayloadSizeInByte} | ${currentMessagesPerSecond}`);
    const messageCount = Math.ceil(testDurationInSeconds * currentMessagesPerSecond);
    const intervalInMilliseconds = 1000 / currentMessagesPerSecond;

    let start = now();
    // generate test data
    const data = Array(messageCount).fill().map(() => crypto.randomBytes(currentPayloadSizeInByte));
    const dataGenerationInMs = now() - start;

    const client = mqtt.connect(serverUrl);
    await new Promise(resolve => {
        client.on('connect', () => {
            return resolve();
        });
    });

    const timer = new NanoTimer();

    start = now();
    await new Promise((resolve) => {
        let counter = 0;
        const sendData = () => {
            client.publish('data', data[counter], {
                qos: 0,
            });
            counter++;
        };
        sendData();
        timer.setInterval(() => {
            if (counter >= data.length) {
                timer.clearInterval();
                return resolve();
            }
            sendData();
        }, '', `${intervalInMilliseconds}m`);
    });
    const executionInMs = now() - start;

    // mqttjs stores incoming and outgoing messages in stores and sending is deferred
    await new Promise(resolve => {
        client.end(false, resolve);
    });
    const allSentInMs = now() - start;

    return {
        payloadSizeInByte: currentPayloadSizeInByte,
        messagesPerSecond: currentMessagesPerSecond,
        dataGenerationInMs,
        executionInMs,
        allSentInMs,
    };
}

function generateParams () {
    const params = [];
    for (let i = messagesPerSecond.start; i < messagesPerSecond.end; i += messagesPerSecond.stepSize) {
        for (let j = payloadSizeInByte.start; j < payloadSizeInByte.end; j += payloadSizeInByte.stepSize) {
            const bytesPerSecond = i * j;
            if (bytesPerSecond > bytePerSecondCap) {
                continue;
            }
            params.push({
                payloadSizeInByte: j,
                messagesPerSecond: i,
            });
        }
    }

    return params;
}

init();
