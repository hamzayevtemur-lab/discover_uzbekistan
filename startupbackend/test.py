"""
Standalone SMTP test — isolates whether the problem is your Gmail
credentials/network, or something inside the FastAPI app.

Run directly:
    export SMTP_USER="hamzaevtemurbek@gmail.com"
    export SMTP_PASS="your-app-password"
    python3 test_smtp.py your-real-test-email@example.com
"""

import os
import smtplib
import ssl
import sys
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import certifi

SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")

if not SMTP_USER or not SMTP_PASS:
    print("ERROR: set SMTP_USER and SMTP_PASS env vars first.")
    sys.exit(1)

if len(sys.argv) != 2:
    print("Usage: python3 test_smtp.py <recipient-email>")
    sys.exit(1)

to_email = sys.argv[1]

msg = MIMEMultipart("alternative")
msg["Subject"] = "SMTP test — Discover Uzbekistan"
msg["From"] = SMTP_USER
msg["To"] = to_email
msg.attach(MIMEText("<p>If you got this, SMTP works.</p>", "html"))

try:
    context = ssl.create_default_context(cafile=certifi.where())
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_USER, to_email, msg.as_string())
    print(f"SUCCESS — sent to {to_email}")
except Exception as e:
    print(f"FAILED: {type(e).__name__}: {e}")