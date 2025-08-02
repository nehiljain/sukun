import os
import pickle
from functools import wraps
from release_manager.config import ENABLE_CACHING, CACHE_FILE_PATH
import logging

logger = logging.getLogger(__name__)


def load_cache():
    if os.path.exists(CACHE_FILE_PATH):
        try:
            with open(CACHE_FILE_PATH, "rb") as f:
                return pickle.load(f)
        except (pickle.UnpicklingError, ImportError, AttributeError):
            logger.warning("Failed to load cache, creating a new one")
    return {}


def save_cache(cache):
    with open(CACHE_FILE_PATH, "wb") as f:
        pickle.dump(cache, f)


def persistent_cache(func):
    cache = load_cache()

    @wraps(func)
    def wrapper(*args, **kwargs):
        if not ENABLE_CACHING:
            return func(*args, **kwargs)

        key = (func.__name__, args, frozenset(kwargs.items()))
        if key in cache:
            return cache[key]

        result = func(*args, **kwargs)
        cache[key] = result
        save_cache(cache)
        return result

    return wrapper
