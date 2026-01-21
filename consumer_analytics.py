import os
import json
from dotenv import load_dotenv
from kafka import KafkaConsumer
from pymongo import MongoClient

# Load environment variables
load_dotenv()

# Configuration
KAFKA_BROKERS = os.getenv("KAFKA_BROKERS", "localhost:9092").split(",")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/college_platform")

# Database Connection (for saving stats)
mongo_client = MongoClient(MONGO_URI)
db = mongo_client.get_database()
stats_collection = db.analytics_stats

print(f"✅ Analytics Worker Started. Listening to: user-events, post-events")

# Initialize Kafka Consumer
consumer = KafkaConsumer(
    'user-events', 'post-events', 'complaint-events',
    bootstrap_servers=KAFKA_BROKERS,
    value_deserializer=lambda x: json.loads(x.decode('utf-8')),
    auto_offset_reset='earliest' # Start from beginning if missed
)

# Processing Loop
for msg in consumer:
    try:
        event = msg.value
        event_type = event.get('type')
        print(f"Received event: {event_type}")

        if event_type == 'UserSignedUp':
            stats_collection.update_one(
                {'metric': 'total_users'}, {'$inc': {'count': 1}}, upsert=True
            )
            # Track role specific breakdown
            role = event.get('role', 'Unknown')
            stats_collection.update_one(
                {'metric': f'users_{role}'}, {'$inc': {'count': 1}}, upsert=True
            )

        elif event_type == 'PostCreated':
            stats_collection.update_one(
                {'metric': 'total_posts'}, {'$inc': {'count': 1}}, upsert=True
            )
            
        elif event_type == 'ComplaintFiled':
             stats_collection.update_one(
                {'metric': 'active_complaints'}, {'$inc': {'count': 1}}, upsert=True
            )

    except Exception as e:
        print(f"❌ Error processing message: {e}")