import multiprocessing
multiprocessing.set_start_method("spawn", force=True)

from rq import SimpleWorker, Worker  # noqa: E402
from app.config.config import RQ_WORKER_MODE  # noqa: E402
from app.core.queue import redis_conn  # noqa: E402

def get_worker_class():
    mode = RQ_WORKER_MODE.lower()

    if mode == "fork":
        return Worker
    else:
        return SimpleWorker


if __name__ == "__main__":
    # Pré-chargement du modèle de Reranker dans le processus parent
    # afin que les processus enfants en héritent instantanément via fork Copy-On-Write
    try:
        from app.services.query_kb_processing import get_reranker
        print("Pré-chargement du modèle Reranker...")
        get_reranker()
        print("Modèle Reranker pré-chargé avec succès !")
    except Exception as e:
        print(f"Warning: Impossible de pré-charger le Reranker: {e}")

    worker_class = get_worker_class()

    worker = worker_class(
        ["query_kb", "ingestion", "query_test"],
        connection=redis_conn,
    )

    print(f"Starting {worker_class.__name__}...")
    worker.work()
