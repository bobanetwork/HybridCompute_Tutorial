import sys
import json
from calculator import lambda_handler

# print("stringified ", json.loads(sys.argv[1]), json.dumps(json.loads(sys.argv[1])))
print(json.dumps(lambda_handler(json.loads(sys.argv[1]), None)))