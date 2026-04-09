from dotenv import load_dotenv
load_dotenv()
from database import get_db
from sqlalchemy import text
db = next(get_db())

print('=== partner_applications columns ===')
result = db.execute(text('DESCRIBE partner_applications'))
for row in result:
    print(row)

print()
print('=== restaurants columns ===')
result = db.execute(text('DESCRIBE restaurants'))
for row in result:
    print(row)

print()
print('=== hotels columns ===')
result = db.execute(text('DESCRIBE hotels'))
for row in result:
    print(row)
