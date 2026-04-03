import smtplib, ssl, os
from dotenv import load_dotenv
load_dotenv()

user = os.environ.get('SMTP_USER')
pwd  = os.environ.get('SMTP_PASS')

try:
    context = ssl.create_default_context()
    with smtplib.SMTP_SSL('smtp.gmail.com', 465, context=context) as s:
        s.login(user, pwd)
        print('✅ Port 465 works!')
except Exception as e:
    print(f'❌ Failed: {e}')