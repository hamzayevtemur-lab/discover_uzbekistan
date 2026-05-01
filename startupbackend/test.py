
from dotenv import load_dotenv
load_dotenv()
import smtplib, ssl, os, certifi

user = os.environ.get('SMTP_USER')
pwd  = os.environ.get('SMTP_PASS')

try:
    ctx = ssl.create_default_context(cafile=certifi.where())
    with smtplib.SMTP_SSL('smtp.gmail.com', 465, context=ctx) as s:
        s.login(user, pwd)
        print('✅ Port 465 works!')
except Exception as e:
    print('❌ 465 failed:', e)

try:
    with smtplib.SMTP('smtp.gmail.com', 587, timeout=10) as s:
        s.ehlo()
        s.starttls()
        s.login(user, pwd)
        print('✅ Port 587 works!')
except Exception as e:
    print('❌ 587 failed:', e)