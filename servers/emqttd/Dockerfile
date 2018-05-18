FROM ubuntu:16.04

RUN apt-get update && apt-get install -y wget lksctp-tools \
    && wget http://emqtt.com/downloads/latest/ubuntu16_04-deb \
    && dpkg -i ubuntu16_04-deb

CMD emqttd foreground

# 1883	MQTT Port
# 8883	MQTT/SSL Port
# 8083	MQTT/WebSocket Port
# 8084	MQTT/WebSocket/SSL Port
# 8080	HTTP Management API Port
# 18083	Web Dashboard Port
EXPOSE 1883 8883 8083 8084 8080 18083