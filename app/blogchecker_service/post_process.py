from blogchecker.models import CheckerOutput
from blogchecker.models import Report
from releases.models import AppUser
from blogchecker.models import Collections
from blogchecker_service.schemas import CheckOutput
import logging

logger = logging.getLogger(__name__)


def persist_collection(url, user_id, company_name=None) -> bool:
    try:
        if not company_name:
            company_name = " - ".join(url.replace("https://", "").split(".")[:2])
        collection = Collections.objects.get(url=url)
    except Collections.DoesNotExist:
        appUser = AppUser.objects.get(id=user_id)
        collection = Collections.objects.create(
            url=url, name=company_name, user=appUser, org=appUser.active_org
        )
    return collection


def persist_report(report_name, user_id, collection_id, payload) -> bool:
    report, created = Report.objects.update_or_create(
        report_name=report_name,
        defaults={
            "user": AppUser.objects.get(id=user_id),
            "collection": Collections.objects.get(id=collection_id),
            "payload": payload,
        },
    )
    return report


def persist_checker_output(
    results: list[CheckOutput], report_name, user_id, run_id
) -> bool:
    """Persist the results to the database.

    Logic for processing output on the view side.

    import importlib
    module = importlib.import_module("blogchecker_service.checkers")
    output_format_cls = getattr(module, result.output_format)
    output_parser = output_format_cls()
    output_parser.process_output(result.output)

    """
    try:
        for result in results:
            # logger.info("saving result : run_id ", run_id, " checker_name ", result.checker_name)
            CheckerOutput.objects.create(
                run_id=run_id,
                report=Report.objects.get(report_name=report_name),
                user=AppUser.objects.get(id=user_id),
                friendly_name=result.friendly_name,
                output=result.output,
                link=result.link,
                success=result.success,
                checker_name=result.checker_name,
                output_format=result.output_format,
            )
    except Exception:
        logger.exception(f"Error persisting checker output for {result.checker_name}")
        return False
    return True
