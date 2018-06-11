# MQTT Broker Benchmark

This projects implements a *simple* benchmark for multiple open source MQTT brokers.

The following brokers were considered to be included in the benchmark:

| Name            | Link                                        | Stars | Contributors |
|-----------------|---------------------------------------------|-------|--------------|
| RabbitMQ        | https://github.com/rabbitmq/rabbitmq-server | 4001  | 71           |
| emqttd          | https://github.com/emqtt/emqttd             | 2961  | 27           |
| mosca           | https://github.com/mcollina/mosca           | 2289  | 55           |
| mosquitto       | https://github.com/eclipse/mosquitto        | 1516  | 31           |
| VerneMQ         | https://github.com/erlio/vernemq            | 1246  | 16           |
| emitter         | https://github.com/emitter-io/emitter       | 1153  | 6            |
| Apache ActiveMQ | https://github.com/apache/activemq          | 1104  | 68           |
| moquette        | https://github.com/andsel/moquette          | 870   | 26           |
| HBMQTT          | https://github.com/beerfactory/hbmqtt       | 310   | 22           |
| MQTTnet         | https://github.com/chkr1011/MQTTnet         | 260   | 10           |
| Apache Apollo   | https://github.com/apache/activemq-apollo   | 107   | 10           |
| GnatMQ          | https://github.com/gnatmq/gnatmq            | 91    | 7            |
| RSMB            | https://github.com/MichalFoksa/rsmb         | 31    | 3            |
| Mongoose        | https://github.com/mongoose-os-libs/mqtt    | 7     | 3            |
| Trafero Tstack  | https://github.com/trafero/tstack           | 3     | 1            |
| JoramMQ         | https://gitlab.ow2.org/joram/joram          | 1     | 1            |

As a first step it was decided to only include the 4 most popular projects, using GitHub
stars as a metric for popularity. The number in the above table were recorded on 2018-05-04. The selection is based on this list: https://github.com/mqtt/mqtt.github.io/wiki/server-support

New brokers can be added easily by providing a service configuration for [docker-compose.yml].


## Usage

### Locally

**Prerequisites**:
* [Docker](https://www.docker.com/)
* [Docker Compose](https://docs.docker.com/compose/overview/)
* AWS IAM user with EC2 access

Export the name of the broker you want to test. E.g.:

    export MQTT_HOST=rabbitmq

Then start up the broker using:

    docker-compose up -d ${MQTT_HOST}

Now you can run the publisher to send data:

    docker-compose run --rm publisher

The results will be recorded into `results/results.json`. To view this file you can start up a webserver by executing `docker-compose up -d nginx`. The results will then be available at `http://localhost?live`.

You can omit `?live` to view the data inside the `results/BROKER_results.json` files.


### AWS with Ansible

**Prerequisites**:
* [Ansible](https://www.ansible.com/)
* [Python Boto](https://github.com/boto/boto)
* AWS IAM user with EC2 access

`cd` into the `ansible` directory.

First you have to install dependencies:

    ansible-galaxy install -r requirements.yaml

Create a file called `hosts` with the following contents to specify AWS credentials:

    localhost   ansible_connection=local   aws_access_key=XXX   aws_secret_key=XXX

Then you can execute the playbook:

    ansible-playbook -i hosts playbook.yaml

The Ansible playbook will automatically create 2 `m4.large` instances and install docker.
One is used for the broker and one for the publisher.

The playbook will now clone this repository on the instances and execute the specified tests 
sequentially for each broker. This can take quite a long time.

To check up on the current status of the test you can have a look at the live data by going to
`http://${PUBLISHER_IP}?live`.

The results for each broker will be copied back to your machine into the `results` directory.

You can view them using `index.html` (see above).


## Design

Brokers were only tested using their default configuration. Whenever possible an existing,
official Docker image was used.

The publisher is written in JavaScript to be run using [Node.js](https://nodejs.org).
It utilizes the [MQTT.js](https://github.com/mqttjs/MQTT.js) client library.


## Results

The interactive chart can be viewed at: https://lukaskorte.github.io/mqtt-performance-test/
