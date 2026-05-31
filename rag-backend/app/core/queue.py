import redis as redis
import redis.asyncio as redis_async
from rq import Queue

from app.config.config import REDIS_URL

redis_conn = redis.from_url(REDIS_URL)
redis_async_conn = redis_async.from_url(REDIS_URL)

ingestion_queue = Queue(
    "ingestion",
    connection=redis_conn,
    default_timeout=60 * 60,
)

query_kb_queue = Queue(
    "query_kb",
    connection=redis_conn,
    default_timeout=60 * 5
)

query_kb_test = Queue(
    "query_test",
    connection=redis_conn,
    default_timeout=60 * 5
)