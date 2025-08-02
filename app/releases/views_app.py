from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.shortcuts import render


@login_required
def app_page(request):
    print("app", request.user)
    return render(request, "web/app.html", {"debug": settings.DEBUG})


def app_noauth_page(request, *args, **kwargs):
    print("app_noauth", request.user, request.path)
    return render(request, "web/app.html", {"debug": settings.DEBUG})
