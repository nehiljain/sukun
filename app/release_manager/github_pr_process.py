from thefuzz import fuzz

from release_manager.ai.llm_utils import get_openai_model, MODEL_4OMINI, MODEL_4O
from github.PullRequest import PullRequest
from release_manager.caching_utils import persistent_cache
from release_manager.ai.prompts import (
    Tweet,
    code_change_summary_prompt,
    summary_of_summary_prompt,
    commit_statement_prompt,
    generate_pr_description_prompt,
    detect_change_type_prompt,
    change_type_parser,
    generate_pr_report_prompt,
    pr_report_parser,
    improve_release_notes_prompt,
    generate_tweet_prompt,
    ImprovedReleaseNotes,
    PRReport,
)
from release_manager.pr_templates import (
    feature_pr_template,
    fix_pr_template,
    documentation_pr_template,
    refactor_pr_template,
    other_pr_template,
)
import logging
import time

logger = logging.getLogger(__name__)


@persistent_cache
def get_file_changes(pull_request: PullRequest) -> str:
    """Get file changes from a pull request.

    Args:
        pull_request (PullRequest): The pull request object.

    Returns:
        str: The markdown formatted file changes.
    """
    dependency_files = [
        # Python
        "requirements.txt",
        "requirements.in",
        "requirements-dev.txt",
        "Pipfile",
        "Pipfile.lock",
        "poetry.lock",
        "setup.py",
        "setup.cfg",
        "environment.yml",
        "conda.yml",
        "buildout.cfg",
        "constraints.txt",
        # JavaScript / Node.js / TypeScript
        "package.json",
        "package-lock.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        "npm-shrinkwrap.json",
        "tsconfig.json",
        "deno.json",
        "deno.lock",
        # Java
        "pom.xml",
        "build.gradle",
        "build.gradle.kts",
        "settings.gradle",
        "settings.gradle.kts",
        "build.sbt",
        "ivy.xml",
        "module-info.java",
        # C#
        "*.csproj",
        "*.vbproj",
        "packages.config",
        "packages.lock.json",
        "project.assets.json",
        "project.json",
        "nuget.config",
        "paket.dependencies",
        "paket.lock",
        # Ruby
        "Gemfile",
        "Gemfile.lock",
        "gems.rb",
        "gems.locked",
        "*.gemspec",
        # PHP
        "composer.json",
        "composer.lock",
        # Rust
        "Cargo.toml",
        "Cargo.lock",
        # Go
        "go.mod",
        "go.sum",
        # Haskell
        "stack.yaml",
        "package.yaml",
        "*.cabal",
        # Elixir
        "mix.exs",
        "mix.lock",
        # Erlang
        "rebar.config",
        "rebar.lock",
        # Scala
        "build.sbt",
        # Dart
        "pubspec.yaml",
        "pubspec.lock",
        # Swift / Objective-C
        "Podfile",
        "Podfile.lock",
        "Cartfile",
        "Cartfile.resolved",
        "Package.swift",
        "Package.resolved",
        # R
        "DESCRIPTION",
        "Packrat.lock",
        "renv.lock",
        # Julia
        "Project.toml",
        "Manifest.toml",
        # C/C++
        "CMakeLists.txt",
        "Makefile",
        "configure.ac",
        "configure.in",
        "vcpkg.json",
        "conanfile.txt",
        "conanfile.py",
        # Perl
        "cpanfile",
        "Makefile.PL",
        "Build.PL",
        # Lua
        "*.rockspec",
        "manifest",
        # Clojure
        "project.clj",
        "deps.edn",
        "build.boot",
        # F#
        "*.fsproj",
        "paket.dependencies",
        "paket.lock",
        # OCaml
        "dune",
        "dune-project",
        "opam",
        # Racket
        "info.rkt",
        # Elm
        "elm.json",
        # Crystal
        "shard.yml",
        "shard.lock",
        # Nim
        "*.nimble",
        # Zig
        "build.zig",
        # D
        "dub.json",
        "dub.sdl",
        # Nix
        "default.nix",
        "shell.nix",
        "flake.nix",
        # Build Tools / General
        "SConstruct",
        "SConscript",
        "meson.build",
        "meson_options.txt",
        "BUCK",
        "BUILD",
        "WORKSPACE",
        "Brewfile",
        "Vagrantfile",
        "Vagrantfile.rb",
        "Dockerfile",
        "docker-compose.yml",
        "docker-compose.yaml",
        "gradlew",
        "gradlew.bat",
        "gradle.properties",
        "gradle-wrapper.properties",
        "modulefile",
        "build.ninja",
    ]

    start_time = time.time()  # Start timing

    summary_of_changes_chain = (
        code_change_summary_prompt
        | get_openai_model(MODEL_4OMINI)
        | summary_of_summary_prompt
        | get_openai_model(MODEL_4OMINI)
    )

    diffs = [
        {"diff": f"**File {i}: {file.filename}**\n{file.patch}\n\n"}
        for i, file in enumerate(pull_request.get_files(), 1)
    ]

    def is_dependency_file(filename: str, dependency_files: list) -> bool:
        for dep_file in dependency_files:
            if (
                fuzz.ratio(filename, dep_file) > 90
            ):  # Using a threshold of 90 for fuzzy matching
                return True
        return False

    filtered_diffs = [
        diff
        for diff in diffs
        if not is_dependency_file(diff["diff"].split(":")[1].strip(), dependency_files)
    ]

    filtered_diffs = diffs

    end_time = time.time()  # End timing
    logger.debug(f"Time taken to filter diffs: {end_time - start_time} seconds")

    summaries = summary_of_changes_chain.batch(filtered_diffs)
    markdown_output = "\n\n".join(
        [
            f"**File {i}: {file.filename}**\n{summary.content}"
            for i, (file, summary) in enumerate(
                zip(pull_request.get_files(), summaries), 1
            )
        ]
    )
    end_time = time.time()  # End timing
    logger.debug(f"Time taken to summarize diffs: {end_time - start_time} seconds")
    return markdown_output.strip()


@persistent_cache
def get_commit_message(pull_request: PullRequest) -> str:
    """Generate a commit message for a pull request.

    Args:
        pull_request (PullRequest): The pull request object.

    Returns:
        str: The generated commit message.
    """
    start_time = time.time()  # Start timing
    generate_commit_message_chain = commit_statement_prompt | get_openai_model(
        MODEL_4OMINI
    )
    commit_messages = [
        {"commit_messages": f"**Commit Message {i}: {commit_obj.commit.message}\n\n"}
        for i, commit_obj in enumerate(pull_request.get_commits(), 1)
    ]

    diffs = [
        {"diff": f"**File {i}: {file.filename}**\n{file.patch}\n\n"}
        for i, file in enumerate(pull_request.get_files(), 1)
    ]

    # Ensure both lists are of the same length by padding the shorter one with None
    max_length = max(len(diffs), len(commit_messages))
    diffs.extend([{"diff": None}] * (max_length - len(diffs)))
    commit_messages.extend(
        [{"commit_messages": None}] * (max_length - len(commit_messages))
    )

    context = [
        {"diff": diff["diff"], "commit_messages": commit_message["commit_messages"]}
        for diff, commit_message in zip(diffs, commit_messages)
    ]

    logger.debug(f"Context of commit messages and diffs: {context}")
    summaries = generate_commit_message_chain.batch(context)
    markdown_output = [f"\n - {summary.content}" for summary in summaries]
    end_time = time.time()  # End timing
    logger.debug(
        f"Time taken to generate commit messages: {end_time - start_time} seconds"
    )
    return "".join(markdown_output)


@persistent_cache
def get_all_pull_request_comments(pull_request: PullRequest) -> str:
    """Get all comments from a pull request.

    Args:
        pull_request (PullRequest): The pull request object.

    Returns:
        str: The markdown formatted comments.
    """
    markdown_output = ""
    start_time = time.time()  # Start timing
    # Get issue comments
    for i, comment in enumerate(pull_request.get_issue_comments(), 1):
        markdown_output += f"**Issue comment {i}**:\n{comment.body}\n\n"

    # Get review comments
    for i, comment in enumerate(pull_request.get_review_comments(), 1):
        markdown_output += f"**Review comment {i}**:\n{comment.body}\n\n"

    # Get general comments
    for i, comment in enumerate(pull_request.get_comments(), 1):
        markdown_output += f"**General comment {i}**:\n{comment.body}\n\n"
    end_time = time.time()  # End timing
    logger.debug(
        f"Time taken to get all pull request comments: {end_time - start_time} seconds"
    )
    return markdown_output.strip()


def improve_release_notes(release_notes: str, release_body: str) -> str:
    """Improve the release notes with the release body.

    Args:
        release_notes (str): The release notes.
        release_body (str): The release body.

    Returns:
        str: The improved release notes.
    """
    structured_model4o = get_openai_model(MODEL_4O).with_structured_output(
        ImprovedReleaseNotes
    )
    improve_release_notes_chain = improve_release_notes_prompt | structured_model4o
    improved_release_notes = improve_release_notes_chain.invoke(
        {
            "improved_release_notes": release_notes,
            "engineering_release_notes": release_body,
        }
    )

    return improved_release_notes.improved_release_notes


def generate_tweet(markdown_output: str) -> str:
    """Generate a 140-character tweet from a full markdown output of a semantic release.

    Args:
        markdown_output (str): The full markdown output of a semantic release.

    Returns:
        str: A 140-character tweet summarizing the release.
    """
    structured_model4o = get_openai_model(MODEL_4O).with_structured_output(Tweet)
    generate_tweet_chain = generate_tweet_prompt | structured_model4o

    tweet_output = generate_tweet_chain.invoke(
        {
            "markdown_output": markdown_output,
        }
    )

    return tweet_output.tweet


def get_pull_request_description(pull_request: PullRequest) -> PRReport:
    """Generate a pull request description.

    Args:
        pull_request (PullRequest): The pull request object.

    Returns:
        PRReport: The generated pull request description.
    """
    start_time = time.time()  # Start timing
    file_changes = get_file_changes(pull_request)
    commit_messages = get_commit_message(pull_request)

    pull_request_comments = get_all_pull_request_comments(pull_request)
    detect_change_type_chain = (
        detect_change_type_prompt | get_openai_model(MODEL_4O) | change_type_parser
    )

    change_type = detect_change_type_chain.invoke(
        {
            "pr_title": pull_request.title,
            "file_changes": file_changes,
            "commit_messages": commit_messages,
            "pr_comments": pull_request_comments,
        }
    )

    generate_pr_description_chain = (
        generate_pr_description_prompt
        | get_openai_model(MODEL_4O)
        | generate_pr_report_prompt
        | get_openai_model(MODEL_4O)
        | pr_report_parser
    )
    pr_description_template_dict = {
        "feature": feature_pr_template,
        "fix": fix_pr_template,
        "documentation": documentation_pr_template,
        "refactor": refactor_pr_template,
        "other": other_pr_template,
    }

    pr_report_result = generate_pr_description_chain.invoke(
        {
            "template": pr_description_template_dict[change_type.type],
            "file_changes": file_changes,
            "commit_messages": commit_messages,
            "pr_comments": pull_request_comments,
            "author": pull_request.user.login,  # Add author
            "issue_number": pull_request.number,  # Add issue number
        }
    )

    end_time = time.time()  # End timing
    logger.debug(
        f"Time taken to generate pull request description: {end_time - start_time} seconds"
    )
    return pr_report_result
