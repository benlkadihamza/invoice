import os
from datetime import timedelta

basedir = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = os.path.join(basedir, 'uploads')
    REPORT_FOLDER = os.path.join(basedir, 'reports')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
    PERMANENT_SESSION_LIFETIME = timedelta(hours=24)
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "pool_timeout": 30,
        "pool_size": 5,
        "max_overflow": 10,
    }


class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(basedir, 'database', 'app.db')


class ProductionConfig(Config):
    DEBUG = False
    db_url = os.environ.get('DATABASE_URL', '')
    if db_url.startswith('postgres://'):
        db_url = db_url.replace('postgres://', 'postgresql://', 1)

    # Prefer psycopg (v3, pure-Python) over psycopg2 (C binary).
    # psycopg2 is unavailable in Cloudflare Workers Python; psycopg v3 is used instead.
    if db_url.startswith('postgresql://') and '+' not in db_url.split('://')[0]:
        db_url = db_url.replace('postgresql://', 'postgresql+psycopg://', 1)

    SQLALCHEMY_DATABASE_URI = db_url or ('sqlite:///' + os.path.join(basedir, 'database', 'app.db'))


class CloudflareConfig(ProductionConfig):
    """
    Config for Cloudflare Workers + Hyperdrive.

    Hyperdrive maintains its own connection pool in front of Supabase, so
    SQLAlchemy's pool must be disabled to avoid double-pooling and stale
    connections across serverless invocations.
    """
    DEBUG = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        # NullPool: no persistent connections — each request gets a fresh one
        # from Hyperdrive's pool.
        "poolclass": __import__("sqlalchemy.pool", fromlist=["NullPool"]).NullPool,
        "pool_pre_ping": True,
    }


config = {
    "development": DevelopmentConfig,
    "production":  ProductionConfig,
    "cloudflare":  CloudflareConfig,
    "default":     ProductionConfig if os.environ.get("DATABASE_URL") else DevelopmentConfig,
}
