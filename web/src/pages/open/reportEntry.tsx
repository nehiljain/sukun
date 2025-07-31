import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  AlertCircle,
  Video,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { IReport } from "@/types/blogChecker";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function Reports() {
  const { report_id } = useParams();
  const [report, setReport] = useState<IReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/reports/${report_id}/`);
        console.log(response);
        if (!response.ok) {
          throw new Error("Failed to fetch report");
        }
        const data = await response.json();

        // Add validation to ensure data matches expected shape
        if (!data?.payload?.metadata?.company_name) {
          throw new Error("Invalid report data received");
        }
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch report");
      } finally {
        setLoading(false);
      }
    };

    if (report_id) {
      fetchReport();
    }
  }, [report_id]);

  // Update the statistics calculations to use the new data structure
  const calculateStats = (data: IReport) => {
    if (!data?.payload?.guide_testing_results) {
      return {
        totalGuides: 0,
        successGuides: 0,
        attentionGuides: 0,
        successRate: 0,
      };
    }

    const totalGuides = data.payload.guide_testing_results.length;
    const successGuides = data.payload.guide_testing_results.filter(
      (guide) => guide.status === "success",
    ).length;
    const attentionGuides = data.payload.guide_testing_results.filter(
      (guide) => guide.status === "needs_attention",
    ).length;
    const successRate =
      totalGuides > 0 ? (successGuides / totalGuides) * 100 : 0;

    return {
      totalGuides,
      successGuides,
      attentionGuides,
      successRate,
    };
  };

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading...
      </div>
    );
  if (error)
    return (
      <div className="flex justify-center items-center min-h-screen text-red-500">
        Error: {error}
      </div>
    );
  if (!report)
    return (
      <div className="flex justify-center items-center min-h-screen">
        Report not found
      </div>
    );

  // Calculate statistics only after we confirm report exists
  const { totalGuides, successGuides, attentionGuides, successRate } =
    calculateStats(report);

  const selectedGuideData = report.payload.guide_testing_results.find(
    (guide) => guide.name === selectedGuide,
  );

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-heading tracking-tight mb-4">
            {report.payload.metadata.company_name} Docs Quality Report
          </h1>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              URL:{" "}
              <a
                href={report.payload.metadata.docs_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {report.payload.metadata.docs_url}
              </a>
            </p>
            <p>Report Name: {report.report_name}</p>
            <p>
              Generated At: {format(report.created_at, "MMMM d, yyyy HH:mm:ss")}
            </p>
          </div>
        </div>

        {/* Overview Card */}
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Summary of guides quality.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <CheckCircle className="text-green-500" />
                <span>{successGuides} passed</span>
              </div>
              <div className="flex items-center space-x-3">
                <AlertTriangle className="text-yellow-500" />
                <span>{attentionGuides} need attention</span>
              </div>
            </div>
            <Progress value={successRate} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">
              {successRate.toFixed(1)}% Success Rate
            </p>
          </CardContent>
        </Card>

        {/* Recommendations Card */}
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>
              Key suggestions for {report.payload.metadata.company_name}{" "}
              documentation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {report.payload.metadata.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <Lightbulb
                    className="text-blue-500 flex-shrink-0 mt-1"
                    size={20}
                  />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Results</CardTitle>
            <CardDescription>
              Guide-by-guide breakdown for{" "}
              {report.payload.metadata.company_name} documentation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guide</TableHead>
                  <TableHead className="w-[200px]">Status</TableHead>
                  <TableHead>Issues</TableHead>
                  <TableHead className="flex items-center gap-1">
                    ScreenCast
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertCircle size={18} />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>ScreenCast is only available for Tutorials.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead>Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.payload.guide_testing_results.map((guide) => (
                  <TableRow key={guide.name}>
                    <TableCell className="font-medium">{guide.name}</TableCell>
                    <TableCell className="w-[200px]">
                      {guide.status === "success" ? (
                        <span className="text-green-500 flex items-center">
                          <CheckCircle className="mr-2" size={16} />
                          Success
                        </span>
                      ) : (
                        <span className="text-yellow-500 flex items-center">
                          <AlertTriangle className="mr-2" size={16} />
                          Needs attention
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {guide.status === "success"
                        ? "-"
                        : guide.issue_details[0]?.issue || "-"}
                    </TableCell>
                    <TableCell>
                      {guide.video && (
                        <Button variant="secondary" asChild size="sm">
                          <a
                            href={guide.video}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Video className="mr-2" size={16} />
                            Watch
                          </a>
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="flex items-center gap-2">
                      <Button variant="secondary" size="sm">
                        <a
                          href={guide.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Link
                        </a>
                      </Button>
                      {guide.status !== "success" && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setSelectedGuide(guide.name)}
                        >
                          <AlertCircle className="mr-2" size={16} />
                          Issue
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Issue Details Modal */}
        <Dialog
          open={selectedGuide !== null}
          onOpenChange={() => setSelectedGuide(null)}
        >
          {selectedGuideData && (
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="text-yellow-500 h-5 w-5" />
                  {selectedGuideData.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selectedGuideData.issue_details.map((detail, index) => (
                  <Card
                    key={index}
                    className="border-l-4 border-l-yellow-500/20"
                  >
                    <CardContent className="p-4">
                      <div className="grid gap-3">
                        <div>
                          <h3 className="text-sm font-semibold mb-1">
                            Issue Details
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {detail.issue}
                          </p>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold mb-1">
                            Recommended Fix
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {detail.fix}
                          </p>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold mb-1">
                            Stack Trace
                          </h3>
                          <pre className="bg-muted p-2 rounded-md w-full overflow-x-auto max-h-[150px] overflow-y-auto text-xs">
                            <code className="whitespace-pre-wrap break-all">
                              {detail.stack_trace}
                            </code>
                          </pre>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </DialogContent>
          )}
        </Dialog>

        {/* FAQ Section */}
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
            <CardDescription>
              Common questions about the documentation quality report
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">
                  What does "Needs attention" mean?
                </h3>
                <p className="text-sm text-muted-foreground">
                  A "Needs attention" status indicates that our automated
                  testing found potential issues with the guide that may affect
                  user experience or comprehension. Click the "Issue" button to
                  see specific details.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">
                  Are all pages covered by the report?
                </h3>
                <p className="text-sm text-muted-foreground">
                  At the moment, DemoDrive only cover pages that have full
                  runnable code. Since doc links are picked up programmatically,
                  its possible that some pages are not covered. Please let us
                  know if you find any gaps.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">What are ScreenCasts?</h3>
                <p className="text-sm text-muted-foreground">
                  ScreenCasts are video recordings available for tutorial-type
                  guides that demonstrate the steps in action. They are
                  automatically generated with AI browser automation. The steps
                  are AI generated with human review. Please let us know if you
                  find any issues.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">
                  How are recommendations generated?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Recommendations are generated based on analysis of common
                  patterns, best practices, and specific issues found during the
                  testing of your documentation.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-lg text-muted-foreground pt-8">
          Generated by{" "}
          <a
            href="https://demodrive.tech"
            target="_blank"
            rel="noopener noreferrer"
          >
            DemoDrive{" "}
            <img
              src="/static/logo.svg"
              alt="DemoDrive Logo"
              className="inline-block h-8 ml-1"
            />
          </a>
        </div>
      </div>
    </div>
  );
}
