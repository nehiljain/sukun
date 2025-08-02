from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from releases.models import AppUser
from user_org.models import Membership, Organization, Workspace


class Command(BaseCommand):
    help = "Seed database with source code providers"

    def handle(self, *args, **options):
        # Create DemoDrive user
        demo_user, created = User.objects.get_or_create(
            username="DemoDrive",
            email="founders@demodrive.tech",
            defaults={
                "is_staff": True,
                "is_superuser": False,
                "first_name": "Demo",
                "last_name": "Drive",
            },
        )

        if created:
            self.stdout.write(self.style.SUCCESS(f"Created User: {demo_user.username}"))
        else:
            self.stdout.write(
                self.style.WARNING(f"User {demo_user.username} already exists")
            )

        # Create or get AppUser for DemoDrive
        demo_app_user, app_user_created = AppUser.objects.get_or_create(
            user=demo_user,
        )

        if app_user_created:
            self.stdout.write(
                self.style.SUCCESS(f"Created AppUser for: {demo_user.username}")
            )
        else:
            self.stdout.write(
                self.style.WARNING(f"AppUser for {demo_user.username} already exists")
            )

        # Create DemoDrive Organization
        demo_org, org_created = Organization.objects.get_or_create(
            name="DemoDrive",
            defaults={
                "created_by": demo_app_user,
            },
        )

        if org_created:
            self.stdout.write(
                self.style.SUCCESS(f"Created Organization: {demo_org.name}")
            )
        else:
            self.stdout.write(
                self.style.WARNING(f"Organization {demo_org.name} already exists")
            )

        # Add DemoDrive user as owner through Membership model
        Membership.objects.get_or_create(
            user=demo_app_user, organization=demo_org, defaults={"role": "owner"}
        )

        # Create DemoDrive default workspace
        demo_workspace, workspace_created = Workspace.objects.get_or_create(
            name="Default",
            organization=demo_org,
            defaults={"user": demo_app_user, "inputs": None},
        )

        if workspace_created:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created Workspace: {demo_workspace.name} for {demo_org.name}"
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(f"Workspace {demo_workspace.name} already exists")
            )

        # Create Anonymous Organization
        anon_org, anon_org_created = Organization.objects.get_or_create(
            name="Anonymous",
            defaults={
                "created_by": demo_app_user,  # Using demo_app_user as creator since we need one
            },
        )

        if anon_org_created:
            self.stdout.write(
                self.style.SUCCESS(f"Created Organization: {anon_org.name}")
            )
        else:
            self.stdout.write(
                self.style.WARNING(f"Organization {anon_org.name} already exists")
            )

        # Create Anonymous workspace
        anon_workspace, anon_workspace_created = Workspace.objects.get_or_create(
            name="Anonymous",
            organization=anon_org,
            defaults={
                "user": demo_app_user,  # Using demo_app_user since user is required
                "inputs": None,
            },
        )

        if anon_workspace_created:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created Workspace: {anon_workspace.name} for {anon_org.name}"
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING(f"Workspace {anon_workspace.name} already exists")
            )
