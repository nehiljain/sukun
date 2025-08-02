import logging
from os import path
from typing import Any, Dict, List

from dotenv import load_dotenv
from e2b_code_interpreter import Sandbox

from .schemas import Action, GuideCodeRecipeLLM

logger = logging.getLogger(__name__)

load_dotenv()

WORK_DIR = "/home/user"


def run_code_recipe(
    guide_code_recipe: GuideCodeRecipeLLM, code_interpreter: Sandbox
) -> List[Dict[str, Any]]:
    logger.info(f"Running code recipe: {guide_code_recipe.title}")
    output = []
    for action in guide_code_recipe.actions:
        logger.info(f"Running action: {action.entrypoint}...")
        output.append(run_code_action(action, code_interpreter))
        logger.info(f"Action output: {output}")
    return output


def run_code_action(action: Action, code_interpreter: Sandbox) -> Dict[str, Any]:
    logger.info(f"Hostname E2B: {code_interpreter.getHost()}")
    for code_file in action.code_content:
        code_interpreter.filesystem.make_dir(
            f"{WORK_DIR}/{path.dirname(code_file.filepath)}"
        )
        logger.info(f"Writing code file: {code_file.filepath}")
        code_interpreter.files.write(
            f"{WORK_DIR}/{code_file.filepath}", code_file.content
        )

    result = code_interpreter.commands.run(
        f"cd {WORK_DIR} && export $(grep -v '^#' .env | xargs) && {action.entrypoint}"
    )

    return {
        "stdout": result.stdout if hasattr(result, "stdout") else "",
        "stderr": result.stderr if hasattr(result, "stderr") else "",
        "exit_code": result.exit_code if hasattr(result, "exit_code") else 0,
        "code_interpreter_hostname": code_interpreter.getHost(),
    }


def run_lint_code(code: str, code_interpreter: Sandbox) -> Dict[str, Any]:
    result = code_interpreter.commands.run(f"cd {WORK_DIR} && flake8 {code}")
    return {
        "stdout": result.stdout if hasattr(result, "stdout") else "",
        "stderr": result.stderr if hasattr(result, "stderr") else "",
        "exit_code": result.exit_code if hasattr(result, "exit_code") else 0,
        "code_interpreter_hostname": code_interpreter.getHost(),
    }
