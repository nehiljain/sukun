from langchain_core.prompts import ChatPromptTemplate


extract_is_blog_post_technical_prompt = ChatPromptTemplate.from_template(
    """
You are a software engineer. Given a guide, you are going to answer the following questions:

1. Is this guide technical?
2. Does this blog post have a code recipe/how-to guide you can follow to use some tool or achieve some outcome?

## Guide:

{guide}
"""
)


extract_all_code_recipes_prompt = ChatPromptTemplate.from_template(
    """
You are a software engineer. Given a guide, you are going to answer the following questions:

What are all the code recipes/how-to guides in this guide?

## Guidelines:

1. All variations of doing something is considered a different recipe.
2. If there is no code related details of the recipe then ignore it.
3. Each recipe description should have end to end meaning. Prefer complete meaningful recipes over things that could be part of a bigger recipe.
4. If same recipe is show in different languages then its a different recipe for every language.


## Guide:

{guide}
"""
)


extract_code_metadata_prompt = ChatPromptTemplate.from_template(
    """
You are a software engineer. Given the following guide, you are going to extract the details of the code project from the guide.

Look at the description of the code recipe you need to extract below.

## Code Recipe Description:

{code_recipe_description}

## Guidelines for good code recipe:

1. The code should be self-contained and run end to end in the same file. You may have to intelligently piece things together here.
3. The code file should not have anything but code. No commands like pip install, npm install, etc.
4. .env files should have all the important keys in it. Sometimes the keys are implicit in the code and not mentioned explicitly. If you think it will be helpful to have a env variable then add it. better safe than sorry.
5. For all python recipes it should have requirements.txt, .env for environment variables, main.py for all the self-contained code and command to run the project. Carefully make sure the requirements.txt and .env are complete. Somethings this can be tricky.
6. If it is a javascript/typescript project then it should have package.json, .env for environment variables, index.js for all the self-contained code and command to run the project.
7. Review all the code files in the recipes to make sure nothing is missing wholistically.
8. Expect the shell environment to contain the necessary API Keys. Dont hardcode any keys in the code.
9. Make sure all necessary python built-in libraries are imported at the top of the file.

# Guide:

{guide}
"""
)

group_weblinks_into_guide_prompt = ChatPromptTemplate.from_template(
    """
You are an AI assistant tasked with organizing a list of URLs of a documentation website into potential tutorials or guides. Your goal is to group related pages that could form a cohesive learning path or tutorial.

Given the following list of URLs:

{weblinks}

Please analyze the structure and content of the URLs, and group them into potential tutorials or guides. Follow these guidelines:

1. Take all weblinks into account, dont truncate.
2. Look for sequential or related topics that could form a logical learning progression. For example, tutorial/step-1, tutorial/step-2, tutorial/step-3.
3. Group pages that share common themes, technologies, or concepts.
4. Consider the hierarchy and structure of the URLs when grouping.
5. Aim for groups of 3-7 pages per tutorial, but be flexible based on the content.
6. If a page doesn't fit into any group, list it separately as a standalone topic.

Ensure that your groupings are logical and would provide value to a learner following the tutorial path.
"""
)

get_weblinks_title_prompt = ChatPromptTemplate.from_template(
    """
You are an AI assistant tasked with extracting the title of a web page from a URL. Your goal is to extract the title from a group of URLs. The title should be short description of the group. Keep it under 255 characters.

Given the following URLs:

{urls}

"""
)
