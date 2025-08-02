import uuid

from django.contrib.auth.signals import user_logged_in
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

# Create your models here.


class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    created_by = models.ForeignKey("releases.AppUser", on_delete=models.CASCADE)
    members = models.ManyToManyField(
        "releases.AppUser", related_name="organizations", through="Membership"
    )

    def __str__(self):
        return self.name


class Membership(models.Model):
    user = models.ForeignKey("releases.AppUser", on_delete=models.CASCADE)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    ROLE_CHOICES = [
        ("read_only", "Read Only"),
        ("member", "Member"),
        ("owner", "Owner"),
    ]
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default="member")


class Workspace(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="projects"
    )
    user = models.ForeignKey(
        "releases.AppUser", on_delete=models.CASCADE, related_name="projects"
    )
    inputs = models.JSONField(null=True, blank=True)

    def clean(self):
        # Check if this is a new project (no ID yet)
        if not self.pk:
            project_count = Workspace.objects.filter(
                organization=self.organization
            ).count()
            if project_count >= 256:
                raise ValidationError(
                    "Organization cannot have more than 256 workspaces."
                )
        super().clean()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    class Meta:
        # You might want to add a regular unique constraint if needed
        pass

    def __str__(self):
        return f"{self.name}- {self.organization.name}"


class AnonymousSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session_key = models.CharField(max_length=64, unique=True)
    email = models.EmailField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        indexes = [models.Index(fields=["session_key"])]


def ensure_user_has_organization(user):
    # First check if the user is an AppUser

    # if not hasattr(user, 'appuser'):
    #     print("returning None")
    #     return None

    # Check if user has any organization where they are an owner
    has_org = Membership.objects.filter(user=user, role="owner").exists()

    if not has_org:
        # Create new organization for user
        org = Organization.objects.create(name=f"{user.name}'s Org", created_by=user)
        # Add the user as an owner
        Membership.objects.create(user=user, organization=org, role="owner")
        # Create default project
        Workspace.objects.create(name="Default Project", organization=org)
        return org
    return None


@receiver(post_save, sender="releases.AppUser")
def create_default_organization(sender, instance, created, **kwargs):
    # ensure_user_has_organization(instance)
    pass


@receiver(user_logged_in)
def handle_user_login(sender, request, user, **kwargs):
    print("handle_user_login", user)
    from releases.models import AppUser

    try:
        u = AppUser.objects.get(user=user)
        ensure_user_has_organization(u)
    except AppUser.DoesNotExist:
        pass
