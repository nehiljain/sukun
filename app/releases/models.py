from django.contrib.auth.models import User
from django.db import models


class AppUser(models.Model):
    COMPANY_ROLE_CHOICES = (
        ("marketing", "Marketing"),
        ("developer_relations", "Developer Relations"),
        ("sales", "Sales"),
        ("content_creator", "Content Creator"),
    )

    USAGE_REASON_CHOICES = (
        ("creating_videos", "Creating new videos"),
        ("editing_videos", "Editing videos"),
        ("screen_capture", "Screen capture"),
    )

    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True)
    name = models.CharField(max_length=100, blank=True)
    profile_url = models.URLField(blank=True)
    is_email_verified = models.BooleanField(default=False)
    verification_sent_at = models.DateTimeField(null=True, blank=True)
    verification_token = models.CharField(max_length=100, blank=True, null=True)
    company_role = models.CharField(
        max_length=50, choices=COMPANY_ROLE_CHOICES, blank=True, null=True
    )
    usage_reason = models.CharField(
        max_length=50, choices=USAGE_REASON_CHOICES, blank=True, null=True
    )
    stripe_customer_id = models.CharField(max_length=100, blank=True, null=True)
    stripe_price_id = models.CharField(max_length=100, blank=True, null=True)
    has_subscription_access = models.BooleanField(default=False)
    subscription_renewal_date = models.DateTimeField(null=True, blank=True)
    active_org = models.ForeignKey(
        "user_org.Organization", on_delete=models.CASCADE, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.user.username


class SourceCodeProvider(models.Model):
    alias = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=100, blank=True)
    info = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.alias


class SourceCodeAccount(models.Model):
    app_user = models.ForeignKey(AppUser, on_delete=models.CASCADE)
    service_provider = models.ForeignKey(SourceCodeProvider, on_delete=models.CASCADE)
    info = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.service_provider.alias}:{self.app_user.user.username}"

    class Meta:
        unique_together = (("app_user", "service_provider"),)


class Repository(models.Model):
    source_code_account = models.ForeignKey(SourceCodeAccount, on_delete=models.CASCADE)
    user = models.ForeignKey(AppUser, on_delete=models.CASCADE, default=None)
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.source_code_account.service_provider.alias}:{self.name}"


class Product(models.Model):
    name = models.CharField(max_length=255)
    user = models.ForeignKey(AppUser, on_delete=models.CASCADE, default=None)
    description = models.TextField(blank=True)
    repositories = models.ManyToManyField(Repository, through="ProductRepository")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class ProductRepository(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    user = models.ForeignKey(AppUser, on_delete=models.CASCADE, default=None)
    repository = models.ForeignKey(Repository, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = (("product", "repository"),)


class Release(models.Model):
    repository = models.ForeignKey(Repository, on_delete=models.CASCADE)
    user = models.ForeignKey(AppUser, on_delete=models.CASCADE, default=None)
    release_url = models.URLField(null=False)
    release_name = models.CharField(max_length=255, null=False)
    release_body = models.TextField()
    release_date = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = (("user", "release_url"),)

    def __str__(self):
        return f"{self.release_url}"


class SemanticRelease(models.Model):
    # product = models.ForeignKey(Product, on_delete=models.CASCADE)
    user = models.ForeignKey(AppUser, on_delete=models.CASCADE, default=None)
    header_image_url = models.URLField(null=True, blank=True)
    footer_image_url = models.URLField(null=True, blank=True)
    release_body = models.TextField(null=True, blank=True)
    release_summary = models.TextField(null=True, blank=True)
    release = models.ForeignKey(Release, on_delete=models.CASCADE, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return ""
