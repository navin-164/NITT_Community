# quick check_env.py
from dotenv import load_dotenv
import os
load_dotenv()
print("NEO4J_URI:", os.getenv("NEO4J_URI"))
print("NEO4J_USER:", os.getenv("NEO4J_USER"))
print("NEO4J_PASSWORD:", os.getenv("NEO4J_PASSWORD") and "****")
