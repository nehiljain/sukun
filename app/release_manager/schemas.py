from mongoengine import (
    Document,
    DynamicDocument,
    StringField,
    DateTimeField,
    ListField,
    DictField,
    BooleanField,
    URLField,
    ObjectIdField,
    ReferenceField,
)
from datetime import datetime


class PyObjectId(ObjectIdField):
    pass


class RepositoryBase:
    name = StringField(required=True)


# class RepositoryCreate(RepositoryBase):
#     pass


class Repository(RepositoryBase):
    id = StringField(primary_key=True)
    added_at = DateTimeField(default=datetime.utcnow)
    objects = []


class PullRequest(Document):
    id = StringField(primary_key=True)
    number = StringField(required=True)
    title = StringField(required=True)
    body = StringField(required=False)  # Allow None values for the body field
    state = StringField(required=True)
    author = ListField(StringField())  # Change this to List[str]
    issue_number = StringField(required=True)  # Ensure this is included
    created_at = DateTimeField(default=datetime.utcnow)
    updated_at = DateTimeField(default=datetime.utcnow)
    closed_at = DateTimeField(required=False)
    merged_at = DateTimeField(required=False)
    user = StringField(required=True)
    changed_files = StringField(required=True)
    additions = StringField(required=True)
    deletions = StringField(required=True)
    mergeable = BooleanField(required=False)
    merged = BooleanField(required=True)
    merge_commit_sha = StringField(required=False)
    generated_description = StringField(required=False)  # Ensure this is a string
    generated_title = StringField(required=False)  # Add this line
    _raw = DictField()  # Add this line to hold the raw PullRequest object


class Commit(Document):
    message = StringField(required=True)
    url = URLField(required=True)
    description = StringField(required=True)


class Changes(Document):
    file_paths = ListField(StringField())
    major_changes = ListField(StringField())
    minor_changes = ListField(StringField())


class ReviewComment(Document):
    reviewer = StringField(required=True)
    comment = StringField(required=True)
    addressed_in_commit = URLField(required=False)


class Release(Document):
    id = StringField(primary_key=True)
    tag_name = StringField(required=True)
    title = StringField(required=False)
    body = StringField(required=False)
    draft = BooleanField(required=True)
    prerelease = BooleanField(required=True)
    created_at = DateTimeField(default=datetime.utcnow)
    published_at = DateTimeField(required=False)
    url = URLField(required=True)


class FetchPRsForReleaseResponse(Document):
    generated_description = StringField(required=True)
    original_description = StringField(required=True)
    grouped_titles = DictField()
    pull_requests = ListField(ReferenceField(PullRequest))


class ReleaseInDB(DynamicDocument):
    _id = ObjectIdField()
    release_url = StringField(required=True, unique=True)
    repo_name = StringField(required=True)
    release_name = StringField(required=True)
    original_body = StringField(required=True)
    generated_body = StringField(required=True)
    generated_at = DateTimeField(default=datetime.utcnow)
    pull_requests = ListField()
    # pull_requests = ListField(ReferenceField(PullRequest))
    meta = {
        "collection": "intelligent-releases-dev"
    }  # Specify the collection name if different from the default
    carbon_image_url = StringField()
