from django.middleware.csrf import CsrfViewMiddleware
from rest_framework import permissions
from rest_framework.authentication import TokenAuthentication
from rest_framework.generics import ListAPIView, ListCreateAPIView


class ConditionalCsrfMiddleware(CsrfViewMiddleware):
    def process_view(self, request, callback, callback_args, callback_kwargs):
        # Check for token authentication
        token_auth = TokenAuthentication()
        try:
            auth_result = token_auth.authenticate(request)
            if auth_result is not None:
                # Skip CSRF for token authenticated requests
                return None
        except:  # noqa: E722
            pass

        # Otherwise apply CSRF protection
        return super().process_view(request, callback, callback_args, callback_kwargs)


class IsAuthenticatedOrPublicReadOnly(permissions.BasePermission):
    """
    Custom permission to allow public access to video projects marked as public.
    """

    def has_permission(self, request, view):
        # Allow any read-only request
        if request.method in permissions.SAFE_METHODS:
            return True
        # Write permissions are only allowed for authenticated users
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Allow read-only access to public projects
        if request.method in permissions.SAFE_METHODS and obj.is_public:
            return True
        # Write permissions and read for private objects are only for authenticated users
        return (
            request.user
            and request.user.is_authenticated
            and obj.org == request.user.appuser.active_org
        )


class AnonymousOrAuthenticated(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS + ("LIST",):
            return True
        if view.action in ["create", "retrieve", "run"]:
            return True
        # Require authentication for other actions
        return request.user.is_authenticated


class AnonymousReadOnlyOrAuthenticated(permissions.BasePermission):
    def has_permission(self, request, view):
        # Allow anonymous access for specific actions
        if request.method in permissions.SAFE_METHODS + ("LIST",):
            return True
        # Require authentication for other actions
        return request.user.is_authenticated


class AnonymousGetNonListPermission(permissions.BasePermission):
    """
    Custom permission class that:
    - Allows authenticated users full access
    - Allows anonymous users to access GET requests for non-list views only
    - Denies anonymous users access to list views and non-GET requests
    """

    def has_permission(self, request, view):
        # Allow authenticated users full access
        if request.user and request.user.is_authenticated:
            return True

        # Handle anonymous users
        if not request.user.is_authenticated:
            # Allow GET requests for non-list views
            if request.method == "GET":
                # Check if the view is a list view
                is_list_view = isinstance(
                    view, (ListAPIView, ListCreateAPIView)
                ) or self._is_list_view_by_name(view)
                if not is_list_view:
                    return True
            # Deny access for list views and non-GET requests
            return False

        return False

    def _is_list_view_by_name(self, view):
        """
        Helper method to identify list views based on view name or action.
        """
        # Get the view's action or view name
        action = getattr(view, "action", None)
        view_name = getattr(view, "__class__", None).__name__.lower()

        # Common indicators for list views
        list_indicators = ["list", "all", "index"]

        # Check action (for ViewSets) or view name
        if action and action in list_indicators:
            return True
        if view_name and any(indicator in view_name for indicator in list_indicators):
            return True

        return False
