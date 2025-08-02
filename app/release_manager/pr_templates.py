# PR Templates

feature_pr_template = """
# Feature Addition PR

## Title

Generate 1 line title for the PR.
The title MUST use the imperative tense.
The title should be structured as follows: feat: <description>


## Summary

Briefly describe the feature being introduced. Not more than 3 sentences. More sentences are bad.

## Rationale

Explain the reasoning behind this feature and its benefits to the project.

## Design Documentation

Link to any design documents or diagrams relevant to this feature.

## Changes

List the major changes made in this pull request.

## Impact

Discuss any potential impacts this feature may have on existing functionalities.

## Testing

Describe how the feature has been tested, including both automated and manual testing strategies.


## Additional Notes

Any additional information or context relevant to this PR.

"""

fix_pr_template = """
# Bug Fix PR

## Title

Generate 1 line title for the PR.
The title MUST use the imperative tense.
The title should be structured as follows: fix: <description>

If there is a issue link available, then use the issue number in the title.

## Summary

Provide a concise description of the bug and the fix.

## Issue Link

Link to the issue being addressed.

## Root Cause Analysis

Detail the root cause of the bug and how it was identified.

## Changes

Outline the changes made to fix the bug.

## Impact

Describe any implications this fix may have on other parts of the application.

## Testing Strategy

Explain how the fix has been tested to ensure the bug is resolved without introducing new issues.

## Regression Risk

Assess the risk of regression caused by this fix and steps taken to mitigate it.

## Additional Notes

Any further information needed to understand the fix or its impact.
"""


documentation_pr_template = """
# Documentation Updtate PR

## Title

Generate 1 line title for the PR.
The title MUST use the imperative tense.
The title should be structured as follows: docs: <description>

## Summary

Brief description of the documentation update and its purpose.

## Areas Affected

List the sections or pages of the documentation that are updated.

## Details

Provide detailed information about the changes made to the documentation.

## Motivation

Explain why these documentation changes are necessary.

## Additional Notes

Any other information that might be helpful for reviewers.
"""

refactor_pr_template = """
# Refactor PR

## Title

Generate 1 line title for the PR.
The title MUST use the imperative tense.
The title should be structured as follows: refactor: <description>


## Summary

Briefly describe the feature being introduced. Not more than 3 sentences. More sentences are bad.

## Rationale

Explain the reasoning behind this feature and its benefits to the project.


## Changes

List the major changes made in this pull request.

## Impact

Discuss any potential impacts this feature may have on existing functionalities.

## Testing

Describe how the feature has been tested, including both automated and manual testing strategies.


## Additional Notes

Any additional information or context relevant to this PR.
"""


other_pr_template = """
# Other PR

## Title

Generate 1 line title for the PR.
The title MUST use the imperative tense.
The title should be structured as follows: refactor: <description>


## Summary

Briefly describe the feature being introduced. Not more than 3 sentences. More sentences are bad.

## Rationale

Explain the reasoning behind this feature and its benefits to the project.


## Changes

List the major changes made in this pull request.

## Impact

Discuss any potential impacts this feature may have on existing functionalities.

## Testing

Describe how the feature has been tested, including both automated and manual testing strategies.


## Additional Notes

Any additional information or context relevant to this PR.
"""
