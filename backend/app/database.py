import psycopg2
from psycopg2 import pool
from contextlib import contextmanager
import os
from sshtunnel import SSHTunnelForwarder
import getpass
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# SSH and Database configuration from environment variables
SSH_HOST = os.getenv("SSH_HOST", "10.5.18.102")
SSH_USER = os.getenv("SSH_USER", "23CS10051")
SSH_PORT = int(os.getenv("SSH_PORT", "22"))

DB_USER = os.getenv("DB_USER", "23CS10051")
DB_PASS = os.getenv("DB_PASS", "23CS10051")
DB_NAME = os.getenv("DB_NAME", "23CS10051")

# Database configuration
DB_CONFIG = {
    "host": "127.0.0.1",
    "database": DB_NAME,
    "user": DB_USER,
    "password": DB_PASS,
    "port": None  # Will be set after tunnel starts
}

# Connection pool
connection_pool = None

_tunnel = None

def start_ssh_tunnel():
    global _tunnel
    if _tunnel is None:
        ssh_password = getpass.getpass("Enter SSH password: ")
        _tunnel = SSHTunnelForwarder(
            (SSH_HOST, SSH_PORT),
            ssh_username=SSH_USER,
            ssh_password=ssh_password,
            remote_bind_address=("127.0.0.1", 5432),
            local_bind_address=("127.0.0.1", 0)
        )
        _tunnel.start()
    return _tunnel

def init_db_pool(minconn=1, maxconn=10):
    """Initialize the database connection pool"""
    global connection_pool
    tunnel = start_ssh_tunnel()
    DB_CONFIG["port"] = tunnel.local_bind_port
    try:
        connection_pool = psycopg2.pool.SimpleConnectionPool(
            minconn,
            maxconn,
            **DB_CONFIG
        )
        print("Database connection pool created successfully")
    except Exception as e:
        print(f"Error creating connection pool: {e}")
        raise

def close_db_pool():
    """Close all connections in the pool"""
    global connection_pool
    if connection_pool:
        connection_pool.closeall()
        print("Database connection pool closed")

@contextmanager
def get_db_connection():
    """Context manager to get a database connection from the pool"""
    global connection_pool
    if connection_pool is None:
        init_db_pool()
    
    conn = connection_pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        connection_pool.putconn(conn)

@contextmanager
def get_db_cursor(commit=True):
    """Context manager to get a database cursor"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        try:
            yield cursor
            if commit:
                conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()

def execute_query(query, params=None, fetch=False):
    """Execute a query and optionally fetch results"""
    with get_db_cursor() as cursor:
        cursor.execute(query, params)
        if fetch:
            return cursor.fetchall()
        return cursor.rowcount

def execute_query_one(query, params=None):
    """Execute a query and fetch one result"""
    with get_db_cursor() as cursor:
        cursor.execute(query, params)
        return cursor.fetchone()
