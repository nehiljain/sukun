# ruff: noqa: F821, F401
import concurrent.futures
import json
import logging
from collections import OrderedDict
from datetime import datetime, timedelta, timezone
from typing import List
from urllib.parse import unquote, urlparse

from github import Github, GithubException, UnknownObjectException
from pydantic import BaseModel
from release_manager.github_pr_process import (
    get_pull_request_description,
    improve_release_notes,
)
from release_manager.schemas import PullRequest

logger = logging.getLogger(__name__)


class PydanticJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, BaseModel):
            return obj.dict()
        if isinstance(obj, datetime):
            return obj.isoformat(timespec="seconds") + "Z"
        return super().default(obj)


# @persistent_cache
# def fetch_issues_from_repo(repo_name):
#     g = Github(GITHUB_TOKEN)
#     repo = g.get_repo(repo_name)
#     issues = repo.get_issues(state="all")
#     return [
#         {"id": issue.id, "title": issue.title, "body": issue.body} for issue in issues
#     ]


# @persistent_cache
# def fetch_pull_requests(
#     repo_name: str,
#     start_date: datetime,
#     end_date: Optional[datetime] = None,
#     state: str = "all",
# ) -> List[PullRequest]:
#     print(f"Fetching PRs for {repo_name} from {start_date} to {end_date}")
#     g = Github(GITHUB_TOKEN)
#     repo = g.get_repo(repo_name)

#     if end_date is None:
#         end_date = datetime.now(timezone.utc)

#     pull_requests = repo.get_pulls(state=state, sort="created", direction="desc")

#     def process_pr(pr):
#         if start_date <= pr.created_at <= end_date:
#             pr_description = get_pull_request_description(pr)
#             authors = list({commit.author.login for commit in pr.get_commits()})
#             return PullRequest(
#                 id=pr.id,
#                 number=pr.number,
#                 title=pr.title,
#                 body=pr.body or "",
#                 state=pr.state,
#                 created_at=pr.created_at.replace(tzinfo=timezone.utc),
#                 updated_at=pr.updated_at.replace(tzinfo=timezone.utc),
#                 closed_at=(
#                     pr.closed_at.replace(tzinfo=timezone.utc) if pr.closed_at else None
#                 ),
#                 merged_at=(
#                     pr.merged_at.replace(tzinfo=timezone.utc) if pr.merged_at else None
#                 ),
#                 user=pr.user.login,
#                 changed_files=pr.changed_files,
#                 additions=pr.additions,
#                 deletions=pr.deletions,
#                 mergeable=pr.mergeable,
#                 merged=pr.merged,
#                 merge_commit_sha=pr.merge_commit_sha,
#                 generated_description=pr_description.description,
#                 generated_title=pr_description.title,
#                 _raw=pr,
#                 author=authors,
#                 issue_number=pr.number,
#             )
#         elif pr.created_at < start_date:
#             return None

#     with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
#         future_to_pr = {executor.submit(process_pr, pr): pr for pr in pull_requests}
#         filtered_prs = [
#             future.result()
#             for future in concurrent.futures.as_completed(future_to_pr)
#             if future.result()
#         ]

#     return filtered_prs


# @persistent_cache
# def fetch_releases(repo_name: str) -> List[Release]:
#     g = Github(GITHUB_TOKEN)
#     repo = g.get_repo(repo_name)
#     releases = repo.get_releases()
#     return [
#         Release(
#             id=release.id,
#             tag_name=release.tag_name,
#             title=release.title,
#             body=release.body,
#             draft=release.draft,
#             prerelease=release.prerelease,
#             created_at=release.created_at.replace(tzinfo=timezone.utc),
#             published_at=(
#                 release.published_at.replace(tzinfo=timezone.utc)
#                 if release.published_at
#                 else None
#             ),
#             url=release.html_url,
#         )
#         for release in releases
#     ]


def get_previous_release(current_release, list_of_releases):
    # Extract package name and version from the current release
    current_package, current_version = (
        current_release.tag_name.rsplit("@", 1)
        if "@" in current_release.tag_name
        else (
            current_release.tag_name.rsplit("==", 1)
            if "==" in current_release.tag_name
            else ("", current_release.tag_name)
        )
    )

    # Filter releases with the same package name (if applicable) and sort them by creation date
    relevant_releases = sorted(
        [rel for rel in list_of_releases if rel.tag_name.startswith(current_package)],
        key=lambda x: x.created_at,
        reverse=True,
    )

    # Find the previous release
    for rel in relevant_releases:
        if rel.created_at < current_release.created_at:
            # For versioned releases (e.g., v0.4.0)
            if rel.tag_name.startswith("v") and current_release.tag_name.startswith(
                "v"
            ):
                if rel.tag_name < current_release.tag_name:
                    return rel
            # For package releases (e.g., @copilotkit/shared@1.3.1 or langchain-core==0.3.0)
            elif ("@" in rel.tag_name and "@" in current_release.tag_name) or (
                "==" in rel.tag_name and "==" in current_release.tag_name
            ):
                rel_package, rel_version = (
                    rel.tag_name.rsplit("@", 1)
                    if "@" in rel.tag_name
                    else rel.tag_name.rsplit("==", 1)
                )
                if rel_package == current_package and rel_version < current_version:
                    return rel
            # For other cases, return the first release created before the current one
            else:
                return rel

    return None


def get_pull_requests_for_release(repo_name, release_tag_name, github_token):
    try:
        logger.info(
            f"Getting PRs for release: {release_tag_name} for repo: {repo_name}"
        )
        # Log only the first few characters of the token for security
        logger.info(f"Token (first 10 chars): {github_token[:10]}...")

        g = Github(github_token)
        logger.info(f"Fetching PRs for {repo_name} from {release_tag_name}")
        repo = g.get_repo(repo_name)
        releases = list(repo.get_releases())
        release = repo.get_release(release_tag_name)

        previous_release = next(
            (rel for rel in releases if rel.created_at < release.created_at), None
        )
        logger.info(f"Previous release: {previous_release}")

        if not previous_release:
            # If no previous release, set a date limit of 2 months before the current release
            two_months_ago = release.created_at - timedelta(days=60)
            logger.debug(
                "No previous release found. Using commits from the last 2 months."
            )
            commits = repo.get_commits(since=two_months_ago, until=release.created_at)
        else:
            tag1_commit_sha = previous_release.tag_name
            tag2_commit_sha = release.tag_name
            commit1 = repo.get_commit(sha=tag1_commit_sha)
            commit2 = repo.get_commit(sha=tag2_commit_sha)
            date1 = commit1.commit.author.date
            date2 = commit2.commit.author.date

            base, head = (
                (tag1_commit_sha, tag2_commit_sha)
                if date1 < date2
                else (tag2_commit_sha, tag1_commit_sha)
            )
            comparison = repo.compare(base, head)
            commits = comparison.commits

        commit_shas = [
            commit.sha for commit in commits[:50]
        ]  # TODO: Fix this. For now adding hard upper limit of 50 for unpaid people

        def process_commit_sha(commit_sha):
            full_commit = repo.get_commit(commit_sha)
            prs = list(set(full_commit.get_pulls()))
            return prs

        def process_pr(pr):
            if pr.number not in pull_requests:
                generated_pr_report = get_pull_request_description(pr)
                authors = list(
                    {
                        commit.author.login if commit.author else "Unknown"
                        for commit in pr.get_commits()
                        if commit.author is not None
                    }
                )

                return PullRequest(
                    id=pr.id,
                    number=pr.number,
                    title=pr.title,
                    body=pr.body or "",
                    state=pr.state,
                    created_at=pr.created_at.replace(tzinfo=timezone.utc),
                    updated_at=pr.updated_at.replace(tzinfo=timezone.utc),
                    closed_at=(
                        pr.closed_at.replace(tzinfo=timezone.utc)
                        if pr.closed_at
                        else None
                    ),
                    merged_at=(
                        pr.merged_at.replace(tzinfo=timezone.utc)
                        if pr.merged_at
                        else None
                    ),
                    user=pr.user.login if pr.user else "Unknown",
                    changed_files=pr.changed_files,
                    additions=pr.additions,
                    deletions=pr.deletions,
                    mergeable=pr.mergeable,
                    merged=pr.merged,
                    merge_commit_sha=pr.merge_commit_sha,
                    generated_description=generated_pr_report.description,
                    generated_title=generated_pr_report.title,
                    _raw=pr,
                    author=authors,
                    issue_number=pr.number,
                )

        pull_requests = {}
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            future_to_commit_sha = {
                executor.submit(process_commit_sha, sha): sha for sha in commit_shas
            }
            for future in concurrent.futures.as_completed(future_to_commit_sha):
                prs = future.result()
                with concurrent.futures.ThreadPoolExecutor(
                    max_workers=10
                ) as pr_executor:
                    future_to_pr = {
                        pr_executor.submit(process_pr, pr): pr for pr in prs
                    }
                    for pr_future in concurrent.futures.as_completed(future_to_pr):
                        pr_model = pr_future.result()
                        if pr_model:
                            pull_requests[pr_model.number] = pr_model

        return pull_requests, release

    except GithubException as e:
        logger.error(f"GitHub API error: {e}")
        raise ValueError(f"Error fetching data from GitHub: {e}") from e
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise


def generate_release_notes(
    pull_requests: List[PullRequest], repo_name: str, release_body: str
) -> tuple:
    logger.info(
        f"Generating Release Notes for {repo_name} with release body: {release_body}"
    )
    first_level_grouping = OrderedDict(
        [
            ("feat", []),
            ("style", []),
            ("fix", []),
            ("refactor", []),
            ("docs", []),
            ("chore", []),
            ("perf", []),
            ("test", []),
            ("build", []),
            ("ci", []),
            ("other", []),
        ]
    )

    for pr in pull_requests:
        title_parts = pr.generated_title.split(": ", 1)
        pr_type = (
            title_parts[0].lower()
            if len(title_parts) == 2 and title_parts[0].lower() in first_level_grouping
            else "other"
        )
        authors_str = ", ".join(
            f"[@{author}](https://github.com/{author}/)" for author in pr.author
        )
        release_message = f"- {title_parts[-1]}. PR [(#{pr.issue_number})](https://github.com/{repo_name}/pull/{pr.number}) by {authors_str}"
        first_level_grouping[pr_type].append(release_message)

    second_level_mapping = {
        "Features": ["feat", "style"],
        "Docs": ["docs"],
        "Refactors": ["refactor"],
        "Fixes": ["fix"],
        "Internals": ["perf", "ci", "build", "other", "chore", "test"],
    }

    second_level_grouping = OrderedDict((key, []) for key in second_level_mapping)
    for second_level, first_level_types in second_level_mapping.items():
        for pr_type in first_level_types:
            second_level_grouping[second_level].extend(first_level_grouping[pr_type])

    markdown_output = "\n\n".join(
        f"## {group}\n\n" + "\n".join(titles)
        for group, titles in second_level_grouping.items()
        if titles
    )

    new_release_notes = markdown_output.strip(), second_level_grouping
    logger.info(f"New Release Notes: {new_release_notes}")

    improved_release_notes = improve_release_notes(new_release_notes, release_body)
    logger.info(f"Improved Release Notes: {improved_release_notes}")
    return improved_release_notes, new_release_notes


def extract_repo_and_tag(url):
    parsed = urlparse(url)
    path = parsed.path.strip("/")
    parts = path.split("/")

    if len(parts) >= 5 and parts[2] == "releases" and parts[3] == "tag":
        owner = parts[0]
        repo = parts[1]
        tag_encoded = "/".join(parts[4:])
        tag_name = unquote(tag_encoded)
        repo_name = f"{owner}/{repo}"
        return repo_name, tag_name
    else:
        raise ValueError("Invalid GitHub releases URL format.")


def get_github_repositories(github_token):
    g = Github(github_token)
    repositories = g.get_user().get_repos()
    repositories_data = []
    for repo in repositories:
        try:
            latest_release = {
                "tag_name": repo.get_latest_release().tag_name,
                "title": repo.get_latest_release().title,
                "published_at": repo.get_latest_release().published_at,
                "html_url": repo.get_latest_release().html_url,
                "body": repo.get_latest_release().body,
            }
        except UnknownObjectException as e:
            logger.error(f"Error getting latest release for {repo.full_name}: {e}")
            latest_release = None
        repositories_data.append(
            {
                "id": repo.id,
                "name": repo.name,
                "full_name": repo.full_name,
                "description": repo.description,
                "html_url": repo.html_url,
                "stargazers_count": repo.stargazers_count,
                "forks_count": repo.forks_count,
                "latest_release": latest_release,
            }
        )
    return repositories_data
