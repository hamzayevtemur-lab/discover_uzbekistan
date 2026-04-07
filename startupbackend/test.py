
import sys
sys.path.insert(0, '/Users/mac/Desktop/startup/startupbackend')
from dotenv import load_dotenv
load_dotenv()
from database import get_db
from models.restaurant import Restaurant
import hashlib

db = next(get_db())
r = db.query(Restaurant).filter(Restaurant.partner_email == 'otamurodsuvonqulov22@gmail.com').first()
print('Stored hash:', r.partner_password)

test_pw = input('Paste the password from the email: ')
test_hash = hashlib.sha256(test_pw.encode()).hexdigest()
print('Computed hash:', test_hash)
print('Match:', r.partner_password == test_hash)
