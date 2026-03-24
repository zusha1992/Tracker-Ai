import sqlite3
import json
from pathlib import Path

DB_PATH = Path(__file__).parent / 'data' / 'tracker.db'


def get_conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_conn() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS hands (
                hand_id   TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                stakes    TEXT NOT NULL,
                date      TEXT NOT NULL,
                data      TEXT NOT NULL
            )
        ''')
        conn.commit()


def insert_hands(hands: list[dict]) -> int:
    """Insert hands, skip duplicates by hand_id. Returns number of new hands inserted."""
    inserted = 0
    with get_conn() as conn:
        for hand in hands:
            date = hand['timestamp'][:10]  # YYYY-MM-DD
            try:
                conn.execute(
                    'INSERT INTO hands (hand_id, timestamp, stakes, date, data) VALUES (?, ?, ?, ?, ?)',
                    (hand['handId'], hand['timestamp'], hand['stakes'], date, json.dumps(hand))
                )
                inserted += 1
            except sqlite3.IntegrityError:
                pass  # duplicate — skip
        conn.commit()
    return inserted


def get_all_hands() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute('SELECT data FROM hands ORDER BY timestamp ASC').fetchall()
    return [json.loads(row['data']) for row in rows]


def get_sessions() -> list[dict]:
    """Return sessions grouped by date + stakes, newest first."""
    with get_conn() as conn:
        rows = conn.execute('''
            SELECT date, stakes, COUNT(*) as hand_count
            FROM hands
            GROUP BY date, stakes
            ORDER BY date DESC
        ''').fetchall()
    return [dict(row) for row in rows]


def delete_session(date: str) -> int:
    """Delete all hands from a specific date. Returns count deleted."""
    with get_conn() as conn:
        cursor = conn.execute('DELETE FROM hands WHERE date = ?', (date,))
        conn.commit()
        return cursor.rowcount


def delete_all_hands() -> int:
    with get_conn() as conn:
        cursor = conn.execute('DELETE FROM hands')
        conn.commit()
        return cursor.rowcount
