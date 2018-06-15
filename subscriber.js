const fs = require('fs');
const now = require('performance-now');

const log = require('./utils/log');
const connect = require('./utils/connect');


// config
const resultJsonPath = 'results/results_subscriber.json';
const resumeLastTest = false;

async function init() {
  const client = await connect();

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
      log(`test started`);
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
      log(`test done`);
    }
  }, 100);
}

init();
