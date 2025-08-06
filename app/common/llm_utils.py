import logging
import os
from typing import Any, Dict, Optional

import tiktoken
from langchain.globals import set_llm_cache
from langchain_community.cache import SQLiteCache
from langchain_core.messages import HumanMessage
from langchain_fireworks import ChatFireworks
from langchain_openai import ChatOpenAI

set_llm_cache(SQLiteCache(database_path=".langchain.db"))


FIREFUNC_MODEL: str = "accounts/fireworks/models/firefunction-v2"
LLAMA_70B_MODEL: str = "accounts/fireworks/models/llama-v3p1-70b-instruct"


MODEL_4OMINI = "gpt-4o-mini"
MODEL_4O = "gpt-4o"


def get_openai_model(model_name: str) -> ChatOpenAI:
    return ChatOpenAI(model=model_name)


logger = logging.getLogger(__name__)


def count_tokens(text: str, model: str = "gpt-3.5-turbo") -> int:
    """Count the number of tokens in a text for a given model.

    Args:
        text (str): The text to count tokens for.
        model (str): The model to use for token counting.

    Returns:
        int: The number of tokens.
    """
    encoder = tiktoken.encoding_for_model(model)
    return len(encoder.encode(text))


def get_fireworks_llm(model_name: str) -> ChatFireworks:
    """Get a Fireworks LLM instance.

    Args:
        model_name (str): The model name.

    Returns:
        ChatFireworks: The Fireworks LLM instance.
    """
    return ChatFireworks(
        api_key=os.getenv("FIREWORKS_API_KEY"),
        model=model_name,
    )


def generate_response_gpt4omini(prompt: str) -> str:
    """Generate a response using GPT-4o-mini.

    Args:
        prompt (str): The prompt string.

    Returns:
        str: The generated response.
    """
    llm = ChatOpenAI(
        temperature=0.0,
        model="gpt-4o-mini",
    )
    output = llm.invoke([HumanMessage(content=prompt)])
    return output.content


def call_fireworks_api_no_structure(
    prompt: str, model: str, api_key: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """Call the Fireworks API without structured output.

    Args:
        prompt (str): The prompt to send to the API.
        model (str): The model to use for the API call.
        api_key (Optional[str]): The API key to use for authentication.

    Returns:
        Optional[Dict[str, Any]]: The output from the API call or an error message.
    """
    if api_key is None:
        api_key = os.getenv("FIREWORKS_API_KEY")
    fireworks_llm = ChatFireworks(model=model, api_key=api_key)
    try:
        output = fireworks_llm.invoke([HumanMessage(content=prompt)])
        return output.content
    except Exception as e:
        logger.error(f"API call failed: {e}")
        return None


def call_fireworks_api_with_structure(
    prompt: str, structured_class: Any, model: str, api_key: Optional[str] = None
) -> Any:
    """Call the Fireworks API with a structured output.

    Args:
        prompt (str): The prompt to send to the API.
        structured_class (Any): The structured class to use for the output.
        model (str): The model to use for the API call.
        api_key (Optional[str]): The API key to use for authentication.

    Returns:
        Any: The output from the API call.
    """
    if api_key is None:
        api_key = os.getenv("FIREWORKS_API_KEY")
    fireworks_llm = ChatFireworks(
        model=model,
        api_key=api_key,
        temperature=0.0,
    ).with_structured_output(structured_class, method="function_calling")
    try:
        output: structured_class = fireworks_llm.invoke([HumanMessage(content=prompt)])
        return output
    except Exception as e:
        logger.error(f"Error calling API: {e}")
        return structured_class().dict()


def call_openai_api_with_structure(
    prompt: str, structured_class: Any, model: str
) -> Optional[Dict[str, Any]]:
    """Call the GPT-4o-mini API with a structured output.

    Args:
        prompt (str): The prompt to send to the API.
        structured_class (Any): The structured class to use for the output.
        model (str): The model to use for the API call.

    Returns:
        Optional[Dict[str, Any]]: The output from the API call.
    """
    print(
        f"Calling OpenAI API with structured output: {structured_class}, method: function_calling"
    )
    llm = ChatOpenAI(
        model=model,
        temperature=0.0,
    ).with_structured_output(structured_class, method="function_calling")  # Change here
    try:
        output = llm.invoke([HumanMessage(content=prompt)])
        return output
    except Exception as e:
        logger.error(f"Error calling API: {e}")
        return None
