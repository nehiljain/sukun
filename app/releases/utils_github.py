from github import Github
import logging
from .models import SourceCodeAccount
import requests

logger = logging.getLogger(__name__)


class GithubClient:
    def __init__(self, version_control_account):
        self.version_control_account = version_control_account
        self.client = Github(self.version_control_account.info["access_token"])

    def get_user(self):
        return self.client.get_user()

    def get_repo(self, repo_name):
        return self.client.get_repo(repo_name)

    def get_user_repos(self, visibility="all"):
        return self.get_user().get_repos(visibility=visibility)

    def create_repo(self, name, description=None, private=False):
        return self.get_user().create_repo(
            name=name, description=description, private=private
        )

    def get_repo_commits(self, repo_name, branch="main", max_count=10):
        repo = self.get_repo(repo_name)
        return list(repo.get_commits(sha=branch))[:max_count]

    def get_repo_issues(self, repo_name, state="open", max_count=10):
        repo = self.get_repo(repo_name)
        return list(repo.get_issues(state=state))[:max_count]

    def create_issue(self, repo_name, title, body):
        repo = self.get_repo(repo_name)
        return repo.create_issue(title=title, body=body)

    def get_repo_pull_requests(self, repo_name, state="open", max_count=10):
        repo = self.get_repo(repo_name)
        return list(repo.get_pulls(state=state))[:max_count]

    def create_pull_request(self, repo_name, title, body, head, base="main"):
        repo = self.get_repo(repo_name)
        return repo.create_pull(title=title, body=body, head=head, base=base)


def get_github_credentials():
    github = SourceCodeAccount.objects.get(service_provider__alias="github")
    return github.info


def get_user_repositories(github_token):
    headers = {"Authorization": f"token {github_token}"}
    repos = []
    page = 1
    while True:
        response = requests.get(
            f"https://api.github.com/user/repos?page={page}&per_page=100",
            headers=headers,
        )
        if response.status_code == 200:
            page_repos = response.json()
            if not page_repos:
                break
            for repo in page_repos:
                # Get the latest release for each repository
                latest_release = get_latest_release(github_token, repo["full_name"])
                repos.append(
                    {
                        "id": repo["id"],
                        "name": repo["name"],
                        "full_name": repo["full_name"],
                        "description": repo["description"],
                        "html_url": repo["html_url"],
                        "stargazers_count": repo["stargazers_count"],
                        "forks_count": repo["forks_count"],
                        "latest_release": latest_release,
                    }
                )
            page += 1
        else:
            break
    return repos


def get_latest_release(github_token, repo_full_name):
    headers = {"Authorization": f"token {github_token}"}
    response = requests.get(
        f"https://api.github.com/repos/{repo_full_name}/releases/latest",
        headers=headers,
    )
    if response.status_code == 200:
        release = response.json()
        return {
            "tag_name": release["tag_name"],
            "name": release["name"],
            "published_at": release["published_at"],
            "html_url": release["html_url"],
        }
    return None
