const fs = require('fs');
const mqtt = require('mqtt');
const now = require('performance-now');

// config
const resultJsonPath = 'results/results_subscriber.json';
const resumeLastTest = false;

const serverUrl = `mqtt://${ process.env.MQTT_HOST || 'test.mosquitto.org' }`;

async function init() {
  console.log(`${(new Date()).toISOString()} | connecting to ${serverUrl} ..`);
  const client = mqtt.connect(serverUrl);
  await new Promise(resolve => {
    client.on('connect', () => {
      console.log(`${(new Date()).toISOString()} | connected to ${serverUrl}`);
      return resolve();
    });
  });

  let results = [];
  if (resumeLastTest && fs.existsSync(resultJsonPath)) {
    results = JSON.parse(fs.readFileSync(resultJsonPath));
  }

  client.subscribe('data');

  let messageCount = 0;
  let oldMessageCount = 0;
  let start = null;
  client.on('message', (topic, message) => {
    // do nothing
    messageCount += 1;
    if (!start) {
      start = now();
      console.log(`${(new Date()).toISOString()} | test started`);
    }
  });

  setInterval(() => {
    const diff = messageCount - oldMessageCount;
    oldMessageCount = messageCount;
    if (diff === 0 && start) {
      const allReceivedInMs = now() - start;
      start = null;
      results.push({
        allReceivedInMs,
        messagesPerSecondReceived: messageCount / (allReceivedInMs / 1000),
      });
      fs.writeFileSync(resultJsonPath, JSON.stringify(results));
      messageCount = 0;
      oldMessageCount = 0;
      console.log(`${(new Date()).toISOString()} | test done`);
    }
  }, 100);
}

init();
