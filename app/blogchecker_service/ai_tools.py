from crewai_tools import BaseTool
from firecrawl import FirecrawlApp
import os


class MyWebScrapeTool(BaseTool):
    name: str = "Web Scrape Tool"
    description: str = (
        "Use this tool to get a markdown of the page contents of a given URL. "
    )

    def _run(self, url: str) -> str:
        # Implementation goes here

        app = FirecrawlApp(api_key=os.getenv("FIRECRAWL_API_KEY"))

        # Scrape a website:
        scrape_result = app.scrape_url(url, params={"formats": ["markdown"]})
        return scrape_result
