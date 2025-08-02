import re
from datetime import datetime
from enum import Enum
from typing import Any, List, Union

from pydantic import BaseModel, Field, computed_field


class LanguageEnum(str, Enum):
    BASH = "bash"
    BROWSER = "browser"
    GO = "go"
    RUST = "rust"
    SHELL = "shell"
    PYTHON = "python"
    JAVASCRIPT = "javascript"
    TYPESCRIPT = "typescript"
    OTHER = "other"


class IsBlogPostTechnical(BaseModel):
    is_technical: bool = Field(..., description="Whether the guide is technical.")
    is_code_recipe: bool = Field(..., description="Whether the guide is a code recipe.")
    language: str = Field(..., description="The language of the technical guide.")


class CodeFile(BaseModel):
    filepath: str = Field(
        ..., description="The full path to the file containing the code."
    )
    content: str = Field(..., description="The code of the technical guide.")
    language: LanguageEnum = Field(..., description="The language of the file.")


class Action(BaseModel):
    is_long_running: bool = Field(
        ..., description="Whether the action is long running."
    )
    entrypoint: str = Field(..., description="The entrypoint of the action.")
    code_content: List[CodeFile] = Field(
        ..., description="The code of the technical guide."
    )


class CodeRecipeDescription(BaseModel):
    title: str = Field(..., description="The title of the Code Recipe")
    description: str = Field(
        ...,
        description="Short description of the code recipe which is information dense, succinct and captures as much detail as possible in fewest words.",
    )

    def __str__(self):
        return f"### {self.title}\n\n{self.description}"


class CodeRecipeDescriptions(BaseModel):
    recipes: List[CodeRecipeDescription] = Field(
        ..., description="All the code recipes in the technical guide"
    )

    def __str__(self):
        return "\n\n".join(str(recipe) for recipe in self.recipes)


class GuideCodeRecipeLLM(BaseModel):
    title: str = Field(..., description="The title of an individual code recipe")
    published_at: datetime = Field(
        ..., description="The published at of the technical guide."
    )
    description: str = Field(..., description="The description of the technical guide.")
    language: str = Field(..., description="The language of the file.")
    actions: List[Action] = Field(
        ..., description="The actions of the technical guide."
    )


class SummaryOutput(BaseModel):
    url: str = Field(..., description="The url of the article")
    summary: str = Field(..., description="The summary of the article")
    language: str = Field(..., description="The programming language of the guide")


class DependenciesOutput(BaseModel):
    dependencies_description: str = Field(
        ...,
        description="A bullet list of all the dependencies or or steps that the developer should do before running the guide in the article",
    )
    url: str = Field(..., description="The url of the article")


class HighLevelStepsOutput(BaseModel):
    steps: List[str] = Field(
        ...,
        description="A list of all the high level steps for the guide in plain english.",
    )


class WebLinkInput(BaseModel):
    article_url: str = Field(..., description="The URL of the article")
    tool_name: str = Field(..., description="The name of the tool")
    tool_description: str = Field(..., description="A description of the tool")


class CodeRecipeLLMOutput(BaseModel):
    input: WebLinkInput = Field(..., description="The input to the crew")
    goal: str = Field(..., description="The goal of the guide")
    summary: SummaryOutput = Field(..., description="The summary of the guide")
    dependencies: DependenciesOutput = Field(
        ..., description="The dependencies of the guide"
    )
    high_level_steps: HighLevelStepsOutput = Field(
        ..., description="The high level steps of the guide"
    )
    code_blocks: str = Field(..., description="The code blocks of the guide")

    @computed_field
    @property
    def language(self) -> str:
        return self.summary.language


class CodeRecipe(BaseModel):
    title: str = Field(..., description="The title of the Code Recipe")
    description: str = Field(..., description="The description of the Code Recipe")
    language: LanguageEnum = Field(
        ...,
        description="The language of the Code Recipe in lowercase. For eg. python, bash, shell, etc.",
    )
    actions: List[Action] = Field(..., description="The actions of the Code Recipe")


class RefinedCodeRecipeLLMOutput(BaseModel):
    crew_results: List[CodeRecipeLLMOutput] = Field(...)
    goal: str = Field(...)
    summary: str = Field(...)
    steps: Union[List[str], str] = Field(...)
    code_blocks: Union[List[str], str] = Field(...)

    @computed_field
    @property
    def language(self) -> str:
        return self.crew_results[0].language.lower()

    @computed_field
    @property
    def code_actions(self) -> List[Action]:
        """Translates code blocks into Action objects"""
        pattern = r"```(.*?)\n(.*?)```"
        matches = re.findall(pattern, str(self.code_blocks), re.DOTALL)
        actions: List[Action] = []

        for match in matches:
            language_and_flags = match[0].strip().split()
            code_content_str = match[1].strip()
            language = language_and_flags[0]
            action_type = (
                language_and_flags[1] if len(language_and_flags) > 1 else "edit"
            )

            code_file = CodeFile(
                filepath="main.py",  # Default filepath
                content=code_content_str,
                language=LanguageEnum(language),
            )

            action = Action(
                is_long_running=False,
                entrypoint="python main.py",  # Default entrypoint
                code_content=[code_file],  # Pass the CodeFile object directly, not JSON
                action_type=action_type,
            )
            actions.append(action)

        return actions

    @computed_field
    @property
    def code_recipe(self) -> CodeRecipe:
        return CodeRecipe(
            title=self.goal,
            description=self.summary,
            language=self.language,
            actions=self.code_actions,
        )


class CheckOutput(BaseModel):
    link: str
    success: bool
    output: dict[str, Any] | str | list[dict[str, Any]] | None = None
    friendly_name: str | None = None
    checker_name: str | None = None
    output_format: str | None = None


class ReportV2Payload(BaseModel):
    url: str
    version: str = "2.0.0"
    metadata: dict[str, Any]
    recommendations: list[str]
