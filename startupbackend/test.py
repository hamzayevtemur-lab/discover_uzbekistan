import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# ══════════════════════════════════════════════
#  PASTE YOUR VALUES HERE (same as in partner_applications.py)
# ══════════════════════════════════════════════

SMTP_USER   = "hamzaevtemurbek@gmail.com"        # ← your Gmail
SMTP_PASS   = "rcjhdzfjpyxdbqbz"            # ← 16-char App Password (no spaces)
SEND_TO     = "hamzayevtemur@gmail.com"        # ← where to send the test (can be same address)

# ══════════════════════════════════════════════

def test_email():
    print("\n📧 Testing Gmail SMTP connection...")
    print(f"   From : {SMTP_USER}")
    print(f"   To   : {SEND_TO}")
    print(f"   Pass : {SMTP_PASS[:4]}{'*' * (len(SMTP_PASS)-4)}\n")  # show only first 4 chars

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "✅ Test Email — Discover Uzbekistan"
    msg["From"]    = f"Discover Uzbekistan <{SMTP_USER}>"
    msg["To"]      = SEND_TO

    html = """
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:40px;background:#fff;border-radius:12px;border:1px solid #e2e8f0">
        <h2 style="color:#6366f1">✅ Email is working!</h2>
        <p>Your Gmail SMTP setup for <strong>Discover Uzbekistan</strong> is configured correctly.</p>
        <p style="color:#64748b;font-size:14px">Verification emails, admin notifications, and credential emails will all be delivered successfully.</p>
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin-top:20px">
            <p style="margin:0;color:#166534;font-size:14px">🎉 You can now go live with partner signups.</p>
        </div>
    </div>
    """

    msg.attach(MIMEText(html, "html"))

    try:
        print("   Step 1/3 — Connecting to smtp.gmail.com:587 ...")
        server = smtplib.SMTP("smtp.gmail.com", 587)

        print("   Step 2/3 — Starting TLS encryption ...")
        server.ehlo()
        server.starttls()

        print("   Step 3/3 — Logging in and sending ...")
        server.login(SMTP_USER, SMTP_PASS)
        server.sendmail(SMTP_USER, SEND_TO, msg.as_string())
        server.quit()

        print(f"\n✅ SUCCESS! Test email sent to {SEND_TO}")
        print("   → Check your inbox (and spam folder just in case)\n")

    except smtplib.SMTPAuthenticationError:
        print("\n❌ AUTHENTICATION FAILED")
        print("   Most likely causes:")
        print("   1. You used your regular Gmail password instead of the App Password")
        print("   2. The App Password was copied with spaces — remove all spaces")
        print("   3. 2-Step Verification is not enabled on your Google account")
        print("   → Go to: myaccount.google.com/apppasswords to create a new one\n")

    except smtplib.SMTPConnectError:
        print("\n❌ CONNECTION FAILED")
        print("   Cannot reach smtp.gmail.com:587")
        print("   → Check your internet connection")
        print("   → Your network/firewall might be blocking port 587\n")

    except Exception as e:
        print(f"\n❌ FAILED — {type(e).__name__}: {e}\n")


if __name__ == "__main__":
    test_email()