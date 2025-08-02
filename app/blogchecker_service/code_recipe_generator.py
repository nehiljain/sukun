import logging
from typing import List

from crewai import Agent, Crew, Process
from crewai.task import Task
from crewai_tools import SerperDevTool
from langchain_core.prompts import ChatPromptTemplate

from .ai_tools import MyWebScrapeTool
from .llm_utils import LLM_LLAMA_31_70B_MODEL
from .schemas import (
    CodeRecipeLLMOutput,
    DependenciesOutput,
    HighLevelStepsOutput,
    RefinedCodeRecipeLLMOutput,
    SummaryOutput,
    WebLinkInput,
)

logger = logging.getLogger(__name__)


# Define the agents
technical_writer_agent = Agent(
    role="Technical Writer",
    goal="Your goal is to generate the best insights, summaries, or long form technical articles and work. ",
    backstory="You have a lot of experience writing, developer content, and technical content for various companies building software. You maintained the documentation and technical blog for Google Search Engine for a long time. You have also worked at Varsal where you managed their examples and technical documentation. ",
    verbose=True,
    llm="gpt-4o",
    allow_delegation=False,
    tools=[SerperDevTool(), MyWebScrapeTool()],
)

senior_ai_engineer = Agent(
    role="Senior AI Engineer",
    goal="You do various tasks related to documented code and building applications for developer communication, evangelism and relationships. ",
    backstory="You are a senior AI engineer who studied at UC Berkeley and is very proficient with using LLMs and building applications on top of it. Your go-to tools are TypeScript, React, Markdown, and Python. ",
    verbose=True,
    llm="gpt-4o",
    allow_delegation=False,
    tools=[SerperDevTool(), MyWebScrapeTool()],
)

# senior_developer_relations_lead = Agent(
#     role="Senior Developer Relations Lead",
#     goal="You are a senior developer relations lead who is responsible for the developer evangelism and relationships for a company. You are a very experienced developer and you are very proficient with using LLMs and building applications on top of it. Your go-to tools are TypeScript, React, Markdown, and Python. ",
#     verbose=True,
#     llm="gpt-4o",
#     allow_delegation=True,

# )

superintelligent_ai_code_assistant = Agent(
    role="Superintelligent AI Code Assistant",
    goal="Generate complete, correct and accurate code blocks with rich comments",
    backstory="You are a very experienced senior developer. You are the 10X engineer that everyone talks about. Given some requirements you can very quickly write correct and complete code to achieve that.",
    verbose=True,
    allow_delegation=False,
    llm="gpt-4o",
)


summarize_article_task = Task(
    description="Summarize the technical article at {article_url} into a bullet list. This article is documentation or how to guide or a cookbook for {tool_name}. This tool {tool_name} is a {tool_description}. The summary should explain what is the article helping the user achieve and what features or aspects of the tool is it using to achieve that. Also, specify the programming language of the tutorial/guide/article.",
    expected_output="A bullet list of the key points the article is trying to communicate to the reader.",
    agent=technical_writer_agent,
    output_pydantic=SummaryOutput,
)

find_dependencies_task = Task(
    description="Find all the dependencies/prerequisites steps required to run through this technical article as a reader successfully. Assume the user doesn't have anything set up before this article. Usually you should be looking for any kind of setup, installations required and what are the details required and what are the details of those.  Article: {article_url} for {tool_name}. Use all the summary you got to understand what the article intends the user to do. ",
    expected_output="A bullet list of all the dependencies or or steps that the developer should do before running the guide in the article. The summary of what is in the article and the article you are up.  .",
    agent=senior_ai_engineer,
    output_pydantic=DependenciesOutput,
)

goal_definition_task = Task(
    description="Generate the goal for the guide in {article_url}. The goal should be a high level objective of what the guide is trying to achieve for the user. For example, Connect to my database, Do hybrid search, Summarize video content ",
    expected_output="A goal statement for the guide.",
    agent=technical_writer_agent,
    tools=[MyWebScrapeTool()],
)

extract_high_level_steps_task = Task(
    description="Extract all the high level steps like pseudocode for the guide in {article_url}. The steps should be a list of steps that the user should follow to achieve the goal of the guide.The user is technically proficient and each step should be a technical step they are doing. Examples of steps are installing something, copying a file, editing a file, moving a file, checking something in the terminal, checking something in the browser, etc. Pay attention to the prerequisites you get in context and include those at the beginning before you bring in the steps from the article itself. Usually the prerequisites are not clearly mentioned in the article but might be inferred, so make sure to pay attention to that.    ",
    expected_output="A list of all the high level steps for the guide in plain english.",
    agent=senior_ai_engineer,
    tools=[MyWebScrapeTool()],
    context=[find_dependencies_task],
    output_pydantic=HighLevelStepsOutput,
)

identify_unique_guides_task = Task(
    description="Identify all the unique guides from all links for {tool_name}. Guides are self-sufficient how-to-guides/tutorials/examples in the collection of documentation or blog posts. Guides could be multiple articles related and grouped together. Guides could also be a single article. Guides are not the API reference documentation. Guides are intended for technical users of this technical product to try it out or learn about the product. links_data: {links_data}",
    expected_output="A list of all the unique guides for the {tool_name} tool.",
    agent=technical_writer_agent,
)

categorize_guides_task = Task(
    description="Categorize article url {article_url} into a guide. Guides are: {guides}",
    expected_output="A list of all the external dependencies for the {tool_name} tool.",
    agent=technical_writer_agent,
)

generate_code_blocks_task = Task(
    description=(
        """Given the steps in your context for the article {article_url}, generate the code blocks for the guide.
                 Assume that the developer has no prior setup and running all the code blocks in sequence as you output will be how they are going to run the whole guide. So make sure if there are any missing pieces to rectify them by adding the previous steps as code blocks.

                 Guidelines for code blocks:
                 1. The code blocks should be complete and correct.
                 2. Extract code blocks from the article {article_url} as much as you can. Dont Modify the existing code blocks, just use them as is.
                 3. The code block should be either a bash script or the main program language [typescript, python, javascript, rust, go, etc].
                 4. Each code block should have rich comments to explain the code.
                 5. Format the block as ```<language> <action_type> <filepath> ...
                 6. Your output should be a list of code blocks one per step
                 7. Languages should be typescript, python, javascript, rust, go, bash.
                 8. Action types should be execute, edit, create, browser. If they are line(s) of code, then it should be edit.
                 9. File paths should be relative to the root of the repository and is optional. If the file path is not mentioned in the article, then choose a sensible filename. For example, main.py for python, index.ts for typescript, etc.
                 10. Code blocks will be given to a program to run it in a cloud container, its not for humans to look at, so format it however you want to make it easy for the program to execute.

                 Only output code blocks, no yapping, no explanation, no commentary, just code blocks.
                """
    ),
    expected_output="A list of all the code blocks for the guide.",
    agent=superintelligent_ai_code_assistant,
    context=[extract_high_level_steps_task],
)

# Create a crew with the tasks
crew = Crew(
    agents=[
        technical_writer_agent,
        senior_ai_engineer,
        superintelligent_ai_code_assistant,
    ],
    tasks=[
        goal_definition_task,
        summarize_article_task,
        find_dependencies_task,
        extract_high_level_steps_task,
        generate_code_blocks_task,
    ],
    process=Process.sequential,
    verbose=True,
    cache=True,
)


steps_prompt = """
Given below is dashed separated list of steps for each article in a guide in the right order. Generate a mutually exclusive but complete list of steps by combining all the steps from the different guides and removing the duplicates and meaningless steps because some steps are just not specific enough.

# Steps

{steps}
---

Just return the final list of steps. No yapping, explanation or commentary.
"""

steps_prompt = ChatPromptTemplate.from_template(steps_prompt)
steps_chain = steps_prompt | LLM_LLAMA_31_70B_MODEL

summary_prompt = """
The summaries of the different steps of the guide are given below. Understand all the different summaries and create a comprehensive summary of the complete guide end to end so that the reader can read the summary and understand what's going on without missing a beat.

# Summaries

{summary}
"""

summary_prompt = ChatPromptTemplate.from_template(summary_prompt)
summary_chain = summary_prompt | LLM_LLAMA_31_70B_MODEL


goal_prompt = """
Here are the goals defined in all the four articles of a guide. Consolidate them into one good quality goal which is concise and the overarching goal. Usually that is in the beginning of the articles. So it should be in the beginning of the list.

# Goals

{goal}
---
Just respond with the one to two liner goal and nothing else no yapping or explanation.
"""

goal_prompt = ChatPromptTemplate.from_template(goal_prompt)
goal_chain = goal_prompt | LLM_LLAMA_31_70B_MODEL


code_blocks_prompt = ChatPromptTemplate.from_template(
    """
Help me create a list of code blocks which will, when combined, deliver the whole sequence of steps to achieve the end result of the guide. Below you have the goal of a guide for a technical product called CoPilotKit. Your goal is to make sure there is a comprehensive list of code blocks which helps you achieve all the different steps. The code blocks should be runable, complete, accurate and should be a mix of different languages. These code blocks are going to be given to a program which can understand the language and execute the operation in the code block. In general there should be either shell scripts which are executable or file edits. Review all of them thoroughly remove the duplicates and make sure that you have complete correct exhaustive court blocks to achieve success.

Guidelines:
1. Do not generate new code, only use the code given in context to you. New code generation is bad.
2. The code blocks should be complete and correctly ordered.
3. The code block should be either a bash script or the languages of the article.
4. Each code block should have rich comments to explain the code.
5. Format the block as ```<language> <action_type> <filepath> ...
6. Ensure that the code blocks are not duplicate and are in the correct order.
7. Action types should be execute, edit, create, browser. If they are line(s) of code, then it should be edit.
8. File paths should be relative to the root of the repository and is optional. If the file path is not mentioned in the article, then choose a sensible filename. For example, main.py for python, index.ts for typescript, etc.
9. Ensure code block exists for each and every step.

## Goal:

{goal}

---

## Steps

{steps}

---

## Code Blocks

{code_blocks}
---

Only output code blocks which look like the ones above. Do not output any other text. No yapping, no explanation
"""
)


code_blocks_chain = code_blocks_prompt | LLM_LLAMA_31_70B_MODEL


def generate_code_recipe(input_links: List[WebLinkInput]) -> CodeRecipeLLMOutput:
    crew = Crew(
        agents=[
            technical_writer_agent,
            senior_ai_engineer,
            superintelligent_ai_code_assistant,
        ],
        tasks=[
            goal_definition_task,
            summarize_article_task,
            find_dependencies_task,
            extract_high_level_steps_task,
            generate_code_blocks_task,
        ],
        process=Process.sequential,
        verbose=True,
        cache=True,
    )

    results = []

    for input in input_links:
        result = crew.kickoff(inputs=input.__dict__)
        results.append(
            CodeRecipeLLMOutput(
                input=input,
                goal=goal_definition_task.output.raw,
                summary=summarize_article_task.output.pydantic,
                dependencies=find_dependencies_task.output.pydantic,
                high_level_steps=extract_high_level_steps_task.output.pydantic,
                code_blocks=result,
            )
        )
    return results


def refining_code_recipes(
    results: List[CodeRecipeLLMOutput],
) -> RefinedCodeRecipeLLMOutput:
    steps_output_str = ""
    for result in results:
        steps_output_str += f"## Steps for {result.input.article_url}\n\n"
        for step in result.high_level_steps.steps:
            steps_output_str += f"- {step}\n"
        steps_output_str += "\n" + "-" * 50 + "\n"

    steps_output = steps_chain.invoke({"steps": steps_output_str})

    summary_output_str = ""
    for result in results:
        summary_output_str += f"## Summary for {result.input.article_url}\n\n"
        summary_output_str += f"{result.summary.summary}\n"
        summary_output_str += "\n" + "-" * 50 + "\n"
    summary_output = summary_chain.invoke({"summary": summary_output_str})

    goal_output_str = ""
    for result in results:
        goal_output_str += f"## Goal for {result.input.article_url}\n\n"
        goal_output_str += f"{result.goal}\n"
        goal_output_str += "\n" + "-" * 50 + "\n"

    goal_output = goal_chain.invoke({"goal": goal_output_str})

    combined_code_blocks = "\n".join([result.code_blocks.raw for result in results])

    code_blocks_output = code_blocks_chain.invoke(
        {
            "goal": goal_output.content,
            "steps": steps_output.content,
            "code_blocks": combined_code_blocks,
        }
    )

    logger.info(f"code blocks output: {code_blocks_output.content}")
    logger.info(f"goal output: {goal_output.content}")
    logger.info(f"summary output: {summary_output.content}")
    logger.info(f"steps output: {steps_output.content}")
    logger.info(f"language: {results[0].summary.language}")

    return RefinedCodeRecipeLLMOutput(
        crew_results=results,
        goal=goal_output.content,
        summary=summary_output.content,
        steps=steps_output.content,
        code_blocks=code_blocks_output.content,
    )


def post_processing_code_recipes(input: RefinedCodeRecipeLLMOutput):
    pass


if __name__ == "__main__":
    tool_name = "Ibis"
    tool_description = (
        "An open source dataframe library that works with any data system"
    )

    inputs = [
        {
            "article_url": "https://docs.copilotkit.ai/tutorials/ai-todo-app/overview",
            "tool_name": tool_name,
            "tool_description": tool_description,
        },
        {
            "article_url": "https://docs.copilotkit.ai/tutorials/ai-todo-app/step-1-checkout-repo",
            "tool_name": tool_name,
            "tool_description": tool_description,
        },
        {
            "article_url": "https://docs.copilotkit.ai/tutorials/ai-todo-app/step-2-setup-copilotkit",
            "tool_name": tool_name,
            "tool_description": tool_description,
        },
        {
            "article_url": "https://docs.copilotkit.ai/tutorials/ai-todo-app/step-3-copilot-readable-state",
            "tool_name": tool_name,
            "tool_description": tool_description,
        },
        {
            "article_url": "https://docs.copilotkit.ai/tutorials/ai-todo-app/step-4-copilot-actions",
            "tool_name": tool_name,
            "tool_description": tool_description,
        },
    ]

    results = generate_code_recipe(inputs)
