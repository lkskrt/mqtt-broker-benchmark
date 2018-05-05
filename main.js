const crypto = require('crypto');
const mqtt = require('mqtt');
const NanoTimer = require('nanotimer');
const now = require('performance-now');

const payloadSizeInByte = 8;
const messagesPerSecond = 1000;
const testDurationInSeconds = 10;
const serverUrl = 'mqtt://test.mosquitto.org';

const messageCount = Math.ceil(testDurationInSeconds * messagesPerSecond);
const intervalInMilliseconds = 1000 / messagesPerSecond;

console.log(`${(new Date()).toISOString()} | payloadSizeInByte: ${payloadSizeInByte}`);
console.log(`${(new Date()).toISOString()} | messagesPerSecond: ${messagesPerSecond}`);
console.log(`${(new Date()).toISOString()} | messageCount: ${messageCount}`);
console.log(`${(new Date()).toISOString()} | intervalInMilliseconds: ${intervalInMilliseconds}`);

async function init() {
  // generate test data
  console.log(`${(new Date()).toISOString()} | generating test data ..`);
  const data = Array(messageCount).fill().map(() => crypto.randomBytes(payloadSizeInByte));
  console.log(`${(new Date()).toISOString()} | generated test data`);

  console.log(`${(new Date()).toISOString()} | connecting to ${serverUrl} ..`);
  const client = mqtt.connect(serverUrl);
  await new Promise(resolve => {
    client.on('connect', () => {
      console.log(`${(new Date()).toISOString()} | connected to ${serverUrl}`);
      return resolve();
    });
  });

  const timer = new NanoTimer();

  const start = now();
  await new Promise((resolve) => {
    let counter = 0;
    const sendData = () => {
      if (counter % messagesPerSecond === 0) {
        console.log(`${(new Date()).toISOString()} | sending data #${counter} ..`);
      }
      client.publish('data', data[counter]);
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
  console.log(`${(new Date()).toISOString()} | execution took ${(now() - start)} milliseconds.`);
  // mqttjs stores incoming and outgoing messages in stores and sending is deferred
  client.end(false, () => {
    console.log(`${(new Date()).toISOString()} | all messages sent after ${(now() - start)} milliseconds.`);
  });
}

init();
