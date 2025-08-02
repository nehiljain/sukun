import hashlib
import json
import logging
import os
from typing import Any, Dict, List

import tiktoken
from dotenv import load_dotenv
from e2b_code_interpreter import Sandbox
from langchain_community.document_loaders import FireCrawlLoader
from langchain_core.documents import Document

from .e2b_runner import run_code_recipe
from .llm_utils import MODEL_4O, get_openai_model
from .prompts import (
    extract_all_code_recipes_prompt,
    extract_code_metadata_prompt,
    extract_is_blog_post_technical_prompt,
)
from .schemas import CodeRecipeDescriptions, GuideCodeRecipeLLM, IsBlogPostTechnical

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
load_dotenv()


def num_tokens_from_string(string: str, model_name: str) -> int:
    """Calculate the number of tokens in a string based on the model's encoding.

    Args:
        string (str): The input text to be tokenized.
        model_name (str): The name of the OpenAI model to determine the encoding.

    Returns:
        int: The number of tokens in the input string.
    """
    encoding = tiktoken.encoding_for_model(model_name)
    num_tokens = len(encoding.encode(string))
    return num_tokens


def get_hashed_filename(url: str) -> str:
    """Generate a hashed filename for the given URL.

    Args:
        url (str): The URL to be hashed.

    Returns:
        str: The hashed filename.
    """
    return hashlib.md5(url.encode()).hexdigest() + ".json"


def load_docs_from_cache_or_scrape(url: str) -> List[Document]:
    """Load documents from cache if available, otherwise scrape using FireCrawlLoader and save to cache.
    Adds token count as metadata to each document.

    Args:
        url (str): The URL to scrape.
        cache_folder (str): The folder to store cached JSON files.
        model_name (str): The name of the OpenAI model to determine the encoding.

    Returns:
        List[Document]: The loaded documents with token count metadata.
    """
    model_name: str = "gpt-4o"
    cache_folder = "./data/cache"
    os.makedirs(cache_folder, exist_ok=True)
    hashed_filename = get_hashed_filename(url)
    cache_file_path = os.path.join(cache_folder, hashed_filename)

    if os.path.exists(cache_file_path) and os.getenv("USE_FC_CACHE") == "true":
        logger.info(f"Loading documents from cache: {cache_file_path}")
        with open(cache_file_path, "r") as f:
            raw_file_data = json.load(f)
            docs = [Document(**doc) for doc in raw_file_data]
    else:
        logger.info(f"Scraping documents from URL: {url}")
        loader = FireCrawlLoader(url=url, mode="scrape")
        docs = loader.load()
        with open(cache_file_path, "w") as f:
            json.dump([doc.dict() for doc in docs], f)

    for doc in docs:
        token_count = num_tokens_from_string(doc.page_content, model_name)
        doc.metadata["token_count"] = token_count

    return docs


def update_env_file(guide_code_recipe: GuideCodeRecipeLLM, env_content: str) -> None:
    """Update the .env file content in the guide code recipe with the provided environment content.

    Args:
        guide_code_recipe (GuideCodeRecipe): The guide code recipe containing the .env file.
        env_content (str): The environment content to update the .env file with.
    """
    env_dict: Dict[str, str] = {}
    for line in env_content.strip().split("\n"):
        if "=" in line:
            key, value = line.split("=", 1)
            env_dict[key.strip()] = value.strip()
        else:
            logger.warning(f"Skipping invalid env line: {line}")

    for action in guide_code_recipe.actions:
        for code_file in action.code_content:
            if code_file.filepath == ".env":
                env_lines = code_file.content.split("\n")
                updated_env_lines = []
                existing_keys = set()
                for line in env_lines:
                    if line.strip() and "=" in line:
                        key, _ = line.split("=", 1)
                        existing_keys.add(key)
                        if key in env_dict:
                            updated_env_lines.append(f"{key}={env_dict[key]}")
                        else:
                            updated_env_lines.append(line)
                    else:
                        updated_env_lines.append(line)

                for key, value in env_dict.items():
                    if key not in existing_keys:
                        updated_env_lines.append(f"{key}={value}")

                code_file.content = "\n".join(updated_env_lines)
                break


def get_guide_code_recipes_with_ai(guide_content: str) -> List[GuideCodeRecipeLLM]:
    """Extract code recipes from a guide using AI models.

    Args:
        guide_content (str): The content of the guide.

    Returns:
        List[GuideCodeRecipe]: The extracted code recipes.
    """
    extract_tech_deets_model = get_openai_model(MODEL_4O).with_structured_output(
        IsBlogPostTechnical
    )
    extract_code_deets_model = get_openai_model(MODEL_4O).with_structured_output(
        GuideCodeRecipeLLM
    )
    first_pass_details_chain = (
        extract_is_blog_post_technical_prompt | extract_tech_deets_model
    )

    extract_code_recipes_chain = extract_code_metadata_prompt | extract_code_deets_model

    _ = first_pass_details_chain.invoke({"guide": guide_content})

    extract_code_recipe_description_chain = (
        extract_all_code_recipes_prompt
        | get_openai_model(MODEL_4O).with_structured_output(CodeRecipeDescriptions)
    )
    code_recipe_descriptions = extract_code_recipe_description_chain.invoke(
        {"guide": guide_content}
    )

    code_recipe_extraction_inputs = [
        {
            "code_recipe_description": str(code_recipe_description),
            "guide": guide_content,
        }
        for code_recipe_description in code_recipe_descriptions.recipes
    ]
    code_details = extract_code_recipes_chain.batch(code_recipe_extraction_inputs)

    return code_details


def get_env_keys_as_string(env_file_path: str) -> str:
    """Get the content of a .env file and return it as a string.

    Args:
        env_file_path (str): The path to the .env file.

    Returns:
        str: The content of the .env file as a string.
    """
    try:
        with open(env_file_path, "r") as file:
            env_content = file.read()
    except FileNotFoundError:
        env_content = ""
    return env_content


def check_code_recipe_with_e2b(
    input_code_recipe: GuideCodeRecipeLLM,
    env_content: str,
    code_interpreter: Sandbox,
) -> List[Dict[str, Any]]:
    """Check the code recipe by running it with e2b.

    Args:
        input_code_recipe (GuideCodeRecipe): The code recipe to check.
        env_content (str): The environment content to update the .env file with.
        code_interpreter (Sandbox): The e2b sandbox instance.

    Returns:
        List[Dict[str, Any]]: List of process outputs with hostname information.
    """
    update_env_file(input_code_recipe, env_content)
    logger.info(f"Running code project: {input_code_recipe.title}")

    results = run_code_recipe(input_code_recipe, code_interpreter)

    # Add hostname to each result
    for result in results:
        result["code_interpreter_hostname"] = code_interpreter.getHost()

    return results
