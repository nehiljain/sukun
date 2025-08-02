from rest_framework import permissions

from releases.models import AppUser


class IsAppUser(permissions.BasePermission):
    message = "user not mapped to AppUser"

    def has_permission(self, request, view):
        is_app_user = AppUser.objects.filter(user=request.user).exists()
        return is_app_user
