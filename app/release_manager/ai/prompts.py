from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from langchain_core.output_parsers import PydanticOutputParser

code_change_summary_prompt = ChatPromptTemplate.from_template(
    """
You are an expert code reviewer tasked with summarizing code changes from a git diff.

**Instructions:**

1. **Analyze** the provided git diff and list of changed file names **step by step**, considering the following attributes:
   - **Files Modified**: List the files that have been changed.
   - **Functions/Classes Affected**: Identify any functions, methods, or classes that were added, modified, or removed.
   - **Features Added/Enhanced**: Note any new features introduced or existing features improved.
   - **Bugs Fixed**: Describe any bugs or issues that have been resolved.
   - **Refactoring**: Mention any code refactoring or architectural changes.
   - **Dependencies Updated**: Highlight any changes to dependencies or external libraries.
   - **Performance Improvements**: Point out any optimizations made.
   - **Documentation Changes**: Include updates to documentation, comments, or docstrings.
   - **Tests Added/Modified**: Indicate any changes to test cases or coverage.

2. **Summarize** your analysis into a concise and dense summary, capturing all significant details.

3. **Format** the output in **markdown**, using bullet points or headings as appropriate for clarity.

4. **Limit** the final output to **no more than 300 tokens**.

---

{diff}
"""
)
summary_of_summary_prompt = ChatPromptTemplate.from_template(
    """
Be a product manager at a startup and summarize this information in a concise information dense precise way so that you can convey the meaning to the reader without really going too much into the detail. Make sure there's no redundancy and make sure the answer is as short and concise as possible.

You can just convert it into bullet points, combining different sections, removing the sections which says no change, etc. Remember the goal is to make it really short.

**summary**:
{summary}

Make sure you take the view of a product manager not an engineer. low level code details are not that important. you want to think about what is the impact to the user or the business. Keep the answers concise and short bullets. Remove repetition between bullets.
Just return the bullets, no yapping or explanation.
"""
)

commit_statement_prompt = ChatPromptTemplate.from_template(
    """You are an expert software engineer.
Review the provided context and diffs which are about to be committed to a git repo.
Review the diffs carefully.
Generate a commit message for those changes.
The commit message MUST use the imperative tense.

If the commit message has fix in it. Then you should use the type as fix.
If the commit message has docs in it. Then you should use the type as docs.

The commit message should be structured as follows: <type>: <description>
Use these for <type>: fix, feat, build, chore, ci, docs, refactor, perf, test
If the commit is simple bump, update of dependencies without significant meaning then categorize them as chore.
Reply with JUST the commit message, without quotes, comments, questions, etc!
Reply with one line only!

{diff}

## Commit Messages
{commit_messages}
"""
)


class ChangeType(BaseModel):
    type: str = Field(
        ...,
        description="The type of change that the PR is making.",
        enum=["feature", "fix", "documentation", "refactor", "other"],
    )


change_type_parser = PydanticOutputParser(pydantic_object=ChangeType)

detect_change_type_prompt = ChatPromptTemplate.from_template(
    template=(
        """
You are an expert software engineer.
Review the provided context and diffs of a Pull Request.
Review carefully:
- the diffs and summaries
- the commit messages


Some guidelines to follow:

1. If the diff is adding new feature, then it is a feature.
2. If the diff is improving performance, making code more maintainable or cleaner, better error handling, enhance clarity, flexibility, etc. then it is a refactor.
3. If the diff is updating docs/ipynb/md/code comments, then it is a documentation change.
4. Think critically and chose the type that reflects the majority or highest impact type of commits/changes.
5. If the commit/pr title has mention of fixing something in it. Then you should use the type as fix.
6. If the commit/pr title has mention of docs in it. Then you should use the type as docs.



Your task is to detect the type of change that the PR is making.

There are the possible types:
1. feature
2. fix
3. documentation
4. refactor
5. other

{format_instructions}
---

# Context:

###  Original PR Title
{pr_title}


#### File Changes
{file_changes}

#### Commit Messages
{commit_messages}

#### PR Comments
{pr_comments}


You need to output a json with the following format. No Yapping:

type: <type>
"""
    ),
    partial_variables={
        "format_instructions": change_type_parser.get_format_instructions()
    },
)


generate_pr_description_prompt = ChatPromptTemplate.from_template(
    """
You are an expert Product Manager with a previous background in CS.
Review the provided context and diffs of a Pull Request.
Review carefully:
- the diffs and summaries
- the commit messages
- the comments on the PR

Create a PR description using the provided template.

You will be penalized for any extra words or complicated language. The goal is to be concise, short and non-repretitive. Make a high information density, technical summary of the work done. bolding **important key terms**.

# Template:

{template}


# Context:

{file_changes}

{commit_messages}

{pr_comments}

Your output should be markdown string like show in the template.
"""
)


class PRReport(BaseModel):
    title: str = Field(
        ...,
        description="The title of the PR.",
    )
    description: str = Field(
        ...,
        description="The markdown content of the PR.",
    )


pr_report_parser = PydanticOutputParser(pydantic_object=PRReport)

generate_pr_report_prompt = ChatPromptTemplate.from_template(
    """
Carefully review the provided PR description in markdown format.

Rewrite the title to be a concise, descriptive, and self-sufficient title for a Pull Request (PR) based on its details.

Instructions:

Given the Pull Request description, generate a clear and informative title.

Guidelines:

- Be clear: Use simple language and avoid technical jargon.
- Include context: Mention any specific components or areas of the application that are impacted.
- Tone: Maintain a professional yet friendly tone.
- Avoid vague phrases; be specific and informative.
- MUST use the imperative tense.
- Should be structured as follows: <type>: <description>.
- Use these for <type>: Fix, Feat, Build, Chore, CI, Docs, Refactor, Perf, Test
- If the change is related to simple bump, update of dependencies without significant meaning then categorize them as chore.


Your task is to output a json with the following format. No Yapping

{format_instructions}

# PR Description

{pr_description}

""",
    partial_variables={
        "format_instructions": pr_report_parser.get_format_instructions()
    },
)


improve_release_notes_prompt = ChatPromptTemplate.from_template(
    """
You are an Senior Product Manager.
Review the provided release notes engineering version and improved version.

Rewwrite the final improved release notes with the following guidelines:
1. Keep the output as close as possible to original improved release notes
2. Verify that all breaking changes from engineering version. These are always obvious and often missing in improved version.
3. Keep the user friendly tone but make sure the content is precise and no repetition between sections.
4. Watch for over use of the word 'Enhance' and other words that are vague.
5. Verify there aren't contradictory statements. For eg: fix: Added xyz feature. If its a fix then it shouldn't say addeed a feature.
6. The final version should be in markdown format.
7. Include any images from both eng and user version in appropriate sections.
8. Keep the word count per update as low as possible. Write crisp and information dense sentences.
8. Generally the sections of the output should be one or more of the following. Nothing outside this.
    - Features
    - Docs
    - Fixes
    - Refactors
    - Breaking Changes
    - New Contributors
9. If engineering release notes has New Contributors section then you should add it to the improved release notes as 1 bullet point. "🎉 A wild welcome to our awesome new contributors: list of [@<author>](https://github.com/<author>/). Your code-fu has leveled up our project. High fives and virtual hugs all around! 🚀🙌"
# Engineering Release Notes
{engineering_release_notes}

# Improved Release Notes
{improved_release_notes}

Only respond with the final version of the release notes in markdown format. NO YAPPING.
"""
)


class ImprovedReleaseNotes(BaseModel):
    improved_release_notes: str = Field(
        ...,
        description="The improved release notes markdown.",
    )


improved_release_notes_parser = PydanticOutputParser(
    pydantic_object=ImprovedReleaseNotes
)


generate_tweet_prompt = ChatPromptTemplate.from_template(
    """
You are an AI assistant tasked with generating concise and engaging tweets.

Generate a 140-character tweet summarizing the key points of this semantic release. Focus on the most important changes and improvements.No Yapping. Here's the full markdown output:

{markdown_output}
"""
)


class Tweet(BaseModel):
    tweet: str = Field(
        ...,
        description="The tweet.",
    )


tweet_parser = PydanticOutputParser(pydantic_object=Tweet)
