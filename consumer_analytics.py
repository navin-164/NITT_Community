# at top of script
import os
from dotenv import load_dotenv
from kafka import KafkaConsumer
import json
counts = {'signups':0, 'posts':0, 'complaints':0}
consumer = KafkaConsumer('user-events', 'post-events', 'complaint-events', bootstrap_servers=[...])
for msg in consumer:
    event = json.loads(msg.value)
    if event['type']=='UserSignedUp': counts['signups'] += 1
    elif event['type']=='PostCreated': counts['posts'] += 1
    elif event['type']=='ComplaintFiled': counts['complaints'] += 1
    #Update dashboard data store (e.g. write to DB or push via websocket)

load_dotenv()  # will read python_consumers/.env if working dir is python_consumers/
KAFKA_BROKERS = os.getenv("KAFKA_BROKERS").split(",")
MYSQL_URI = os.getenv("MYSQL_URI")
MONGO_URI = os.getenv("MONGO_URI")
NEO4J_URI = os.getenv("NEO4J_URI")
