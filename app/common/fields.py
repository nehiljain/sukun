import uuid

from django.db import models


class PrefixedUUIDField(models.CharField):
    """
    A field that generates a shortened UUID with a prefix.
    The format is: prefix_{shortened_uuid}
    """

    description = "A UUID field with a prefix"

    def __init__(self, prefix, *args, **kwargs):
        self.prefix = prefix
        kwargs["max_length"] = 50  # Reduced length for prefix + shortened UUID
        kwargs["unique"] = kwargs.get("unique", True)
        kwargs["editable"] = kwargs.get("editable", False)
        super().__init__(*args, **kwargs)

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        # Include the prefix in the args for reconstruction
        args = [self.prefix] + list(args)
        # Remove default values to keep migrations clean
        if kwargs.get("max_length") == 50:
            del kwargs["max_length"]
        if kwargs.get("unique") is True:
            del kwargs["unique"]
        if kwargs.get("editable") is False:
            del kwargs["editable"]
        return name, path, args, kwargs

    def get_prep_value(self, value):
        if value is None:
            return None
        if not isinstance(value, str) or not value.startswith(f"{self.prefix}_"):
            # Generate a shortened UUID (12 chars max)
            short_uuid = str(uuid.uuid4()).replace("-", "")[:12]
            value = f"{self.prefix}_{short_uuid}"
        return value

    def pre_save(self, model_instance, add):
        value = getattr(model_instance, self.attname, None)
        if value is None or value == "":
            # Generate a shortened UUID (12 chars max)
            short_uuid = str(uuid.uuid4()).replace("-", "")[:12]
            value = f"{self.prefix}_{short_uuid}"
            setattr(model_instance, self.attname, value)
        return value
