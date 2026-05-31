import json

from app.core.queue import redis_conn

def publish_progress(
        job_id: str,
        type: str,
        status: str, 
        step: str, 
        progress: int, 
        message: str
    ):
    redis_conn.publish(
        f"job:{job_id}",
        json.dumps({
            "type": type,
            "status": status,
            "step": step,
            "progress": progress,
            "message": message
        })
    )