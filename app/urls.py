"""
URL configuration for releases project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('guides/', include('guides.urls'))
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from user_org.views_app import app_noauth_page
from user_org.views_auth import app_logout, google_auth, google_callback

# Group related URLs
auth_patterns = [
    path("logout", app_logout, name="app_logout"),
    path("auth/google", google_auth, name="auth"),
    path("auth/google/callback", google_callback, name="auth_callback"),
]


urlpatterns = []
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
if settings.EXPOSE_BROWSABLE_API:
    urlpatterns += [
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path(
            "api/schema/swagger/",
            SpectacularSwaggerView.as_view(url_name="schema"),
            name="swagger",
        ),
        path(
            "api/schema/redoc/",
            SpectacularRedocView.as_view(url_name="schema"),
            name="redoc",
        ),
    ]

# urlpatterns += [
#     path("labs/", include("tourify.urls")),
# ]

urlpatterns += [
    path("admin/", admin.site.urls),
    # Include grouped URL patterns
    path("", include(auth_patterns)),
    # Include app-specific URLs
    # path("", include("releases.urls")),
    path("", include("video_gen.urls")),
    # path("", include("sound_gen.urls")),
    path("", include("user_org.urls")),
    # Catch-all route - must be last
    re_path(r".*", app_noauth_page, name="app"),
]
