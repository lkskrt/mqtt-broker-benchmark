const crypto = require('crypto');
const NanoTimer = require('nanotimer');
const now = require('performance-now');
const fs = require('fs');

const log = require('./utils/log');
const connect = require('./utils/connect');


// config
const resultJsonPath = 'results/results.json';
const paramsJsonPath = 'params.json';
const resumeLastTest = false;
const testDurationInSeconds = 10;
const timeoutInMilliseconds = 5 * 60 * 1000;
const payloadSizeInByte = {
    start: 2,
    end: Math.pow(1024, 2),
    stepFactor: 8,
};
const messagesPerSecond = {
    start: 10000,
    end: 80000,
    stepSize: 10000,
};
const bytePerSecondCap = 50 * Math.pow(1024, 2);
// const bytePerSecondCap = Number.POSITIVE_INFINITY;

async function init() {
    let params = [];
    if (resumeLastTest && fs.existsSync(paramsJsonPath)) {
        params = JSON.parse(fs.readFileSync(paramsJsonPath));
    } else {
        params = generateParams();
        fs.writeFileSync(paramsJsonPath, JSON.stringify(params));
    }
    const paramsToTest = params.filter(param => !param.done);

    log(`Total execution will take at least: ${paramsToTest.length * testDurationInSeconds} seconds`);

    let results = [];
    if (resumeLastTest && fs.existsSync(resultJsonPath)) {
        results = JSON.parse(fs.readFileSync(resultJsonPath));
    }

    for (let param of paramsToTest) {
        const result = await runTest(param.payloadSizeInByte, param.messagesPerSecond);
        results.push(result);
        param.done = true;
        fs.writeFileSync(resultJsonPath, JSON.stringify(results));
        fs.writeFileSync(paramsJsonPath, JSON.stringify(params));
        await sleep(1); // so we can distinguish tests in the subscriber based on no messages received
    }
}

async function runTest(currentPayloadSizeInByte, currentMessagesPerSecond) {
    log(`Starting test with payload size ${currentPayloadSizeInByte} B and ${currentMessagesPerSecond} msg/s`);
    const messageCount = Math.ceil(testDurationInSeconds * currentMessagesPerSecond);
    const intervalInMilliseconds = 1000 / currentMessagesPerSecond;

    let start = now();
    log('Generating data');
    const data = Array(messageCount).fill().map(() => crypto.randomBytes(currentPayloadSizeInByte));
    const dataGenerationInMs = now() - start;

    const client = await connect();

    const timer = new NanoTimer();

    start = now();

    let hitTimeout = false;

    log('Start sending messages');
    
    await new Promise((resolve) => {
        let counter = 0;

        const sendData = () => {
            client.publish('data', data[counter], {
                qos: 0,
            });
            counter++;
        };

        sendData();

        timer.setInterval(
            () => {
                if (now() - start > timeoutInMilliseconds) {
                    log('Hit timeout, stop sending messages')
                    hitTimeout = true;
                }

                if (counter >= data.length || hitTimeout) {
                    timer.clearInterval();
                    return resolve();
                }
                sendData();
            },
            '',
            `${intervalInMilliseconds}m`
        );
    });
    const executionInMs = now() - start;

    log('Waiting for all messages to be sent');

    // mqttjs stores incoming and outgoing messages in stores and sending is deferred
    await new Promise(resolve => {
        const timeout = setTimeout(
            () => {
                hitTimeout = true;
                log('Hit timeout, force closing connection');

                client.end(true, resolve);
            },
            timeoutInMilliseconds
        );

        client.end(false, () => {
            clearTimeout(timeout);
            resolve();
        });
    });
    const allSentInMs = now() - start;

    return {
        payloadSizeInByte: currentPayloadSizeInByte,
        messagesPerSecond: currentMessagesPerSecond,
        dataGenerationInMs,
        executionInMs,
        allSentInMs,
        hitTimeout,
    };
}

function generateParams() {
    const params = [];
    for (let i = messagesPerSecond.start; i < messagesPerSecond.end; i += messagesPerSecond.stepSize) {
        for (let j = payloadSizeInByte.start; j < payloadSizeInByte.end; j *= payloadSizeInByte.stepFactor) {
            if (j * i > bytePerSecondCap) {
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

function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

init();
