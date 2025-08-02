from blogchecker.models import CodeRecipe, CodeAction
from blogchecker_service.schemas import (
    LanguageEnum,
    GuideCodeRecipeLLM as CodeRecipeLLM,
    CodeFile,
)
from typing import List
import re
import json


def translate_guide_code_recipe_to_llm(
    code_recipe: CodeRecipe,
) -> CodeRecipeLLM:
    """
    Translate a Django GuideCodeRecipe model instance to a CodeRecipe object.

    Args:
        guide_code_recipe (GuideCodeRecipe): The Django GuideCodeRecipe model instance to translate.

    Returns:
        CodeRecipe: A CodeRecipe object.
    """
    code_files: List[CodeFile] = []
    code_actions: List[CodeAction] = code_recipe.actions.all()
    for action in code_actions:
        for file in action.code_content:
            code_files.append(
                CodeFile(
                    filepath=file["filepath"],
                    content=file["content"],
                    language=LanguageEnum(code_recipe.language),
                )
            )

    return CodeRecipeLLM(
        title=code_recipe.title,
        published_at=code_recipe.published_at,
        description=code_recipe.description,
        language=code_recipe.language,
        actions=[
            {
                "is_long_running": action.is_long_running,
                "entrypoint": action.entrypoint,
                "code_content": code_files,
            }
            for action in code_actions
        ],
    )


def translate_code_blocks_to_code_actions(code_blocks: str) -> List[CodeAction]:
    pattern = r"```(.*?)\n(.*?)```"
    matches = re.findall(pattern, code_blocks, re.DOTALL)
    code_actions: List[CodeAction] = []

    for match in matches:
        language_and_flags = match[0].strip().split()
        code_content_str = match[1].strip()
        language = language_and_flags[0]
        # action_type = language_and_flags[1] if len(language_and_flags) > 1 else "edit"

        code_content = {
            "language": language,
            "code": code_content_str,
            "is_long_running": False,
        }

        code_action = CodeAction(
            is_long_running=False,
            code_content=json.dumps(code_content),
            code_recipe=None,
        )
        code_actions.append(code_action)

    return code_actions
