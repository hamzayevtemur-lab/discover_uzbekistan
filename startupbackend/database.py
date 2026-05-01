# database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base


def get_database_url() -> str:
    """
    Builds the database URL from environment variables.

    Local development  → uses DB_* variables from .env
    Railway production → uses MYSQL* variables Railway injects automatically
    """

    # ── Railway provides these automatically ──────────────────
    if os.environ.get("MYSQLHOST"):
        host     = os.environ.get("MYSQLHOST")
        port     = os.environ.get("MYSQLPORT",     "3306")
        user     = os.environ.get("MYSQLUSER")
        password = os.environ.get("MYSQLPASSWORD", "")
        database = os.environ.get("MYSQLDATABASE")
        return f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}"

    # ── Local development — reads from .env ───────────────────
    host     = os.environ.get("DB_HOST",     "localhost")
    port     = os.environ.get("DB_PORT",     "3306")
    user     = os.environ.get("DB_USER",     "root")
    password = os.environ.get("DB_PASSWORD", "")
    database = os.environ.get("DB_NAME",     "discover_uzbekistan")
    return f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}"


DATABASE_URL = get_database_url()

engine = create_engine(DATABASE_URL, echo=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()