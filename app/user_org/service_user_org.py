from django.contrib.auth import get_user_model
from django.db.models import Q
from typing import Optional, List

User = get_user_model()


class UserService:
    @staticmethod
    def get_user(user_id: int) -> Optional[User]:
        """
        Retrieve a user by their ID.

        Args:
            user_id: The ID of the user to retrieve

        Returns:
            User object if found, None otherwise
        """
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None

    @staticmethod
    def create_user(
        email: str,
        password: str,
        first_name: str = "",
        last_name: str = "",
        **extra_fields,
    ) -> User:
        """
        Create a new user with the given details.

        Args:
            email: User's email address
            password: User's password
            first_name: User's first name (optional)
            last_name: User's last name (optional)
            **extra_fields: Additional fields for the user model

        Returns:
            Newly created User object

        Raises:
            ValueError: If email is invalid or required fields are missing
        """
        if not email:
            raise ValueError("Email address is required")

        user = User.objects.create_user(
            email=email.lower(),
            password=password,
            first_name=first_name,
            last_name=last_name,
            **extra_fields,
        )
        return user

    @staticmethod
    def get_all_users(active_only: bool = True, search_query: str = None) -> List[User]:
        """
        Retrieve all users with optional filtering.

        Args:
            active_only: If True, returns only active users
            search_query: Optional search string to filter users by name or email

        Returns:
            List of User objects matching the criteria
        """
        queryset = User.objects.all()

        if active_only:
            queryset = queryset.filter(is_active=True)

        if search_query:
            queryset = queryset.filter(
                Q(email__icontains=search_query)
                | Q(first_name__icontains=search_query)
                | Q(last_name__icontains=search_query)
            )

        return list(queryset)
