from datetime import date, datetime


def json_serial(obj):
    """JSON serializer for objects not serializable by default json code"""

    for field in obj:
        if isinstance(obj[field], (datetime, date)):
            obj[field] = obj[field].isoformat()
    return obj
