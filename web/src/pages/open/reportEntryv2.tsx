import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle, Lightbulb } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import {
  IReportV2,
  ICheckerOutput,
  BasicUrlCheckerOutput,
  LLMReadyOutput,
  BrokenLinkCheckerOutput,
  EnhancedValeCheckerOutput,
  CodeSnippetCheckerOutput,
} from "@/types/blogChecker";

interface StatusComponentProps {
  status: boolean;
  successText?: string;
  failureText?: string;
  successClasses?: string;
  failureClasses?: string;
}

const StatusComponent = ({
  status,
  successText = "Valid",
  failureText = "Invalid",
  successClasses = "bg-green-100 text-green-800",
  failureClasses = "bg-red-100 text-red-800",
}: StatusComponentProps) => (
  <span
    className={`inline-block px-2 py-0.5 rounded-full text-xs ${
      status ? successClasses : failureClasses
    }`}
  >
    {status ? successText : failureText}
  </span>
);

export default function ReportsV2() {
  const { report_id } = useParams();
  const [report, setReport] = useState<IReportV2 | null>(null);
  const [checkerOutputs, setCheckerOutputs] = useState<ICheckerOutput[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("BrokenLinkChecker");
  const [showAllMessages, setShowAllMessages] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [selectedErrors, setSelectedErrors] = useState<any[]>([]);
  const [showStackTrace, setShowStackTrace] = useState(false);
  const [selectedStackTrace, setSelectedStackTrace] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch report data
        const reportResponse = await fetch(`/api/reports/${report_id}/`);
        const reportData = await reportResponse.json();
        setReport(reportData);

        // Fetch checker outputs
        const outputsResponse = await fetch(
          `/api/reports/${report_id}/checker-outputs`,
        );
        const outputsData = await outputsResponse.json();
        setCheckerOutputs(outputsData["checker_outputs"]);
        setRunId(outputsData["run_id"]);

        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setLoading(false);
      }
    };

    if (report_id) {
      fetchData();
    }
  }, [report_id]);

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

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-heading tracking-tight mb-4">
            {report.payload.metadata.collection_name} Docs Quality Report
          </h1>
          <div className="text-sm text-muted-foreground flex flex-col md:flex-row md:space-x-4 space-y-1 md:space-y-0 items-start md:items-center justify-center">
            <p>
              URL:{" "}
              <a
                href={report.payload.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {report.payload.url}
              </a>
            </p>
            <p>Report Name: {report.report_name}</p>
            <p>
              Generated At:{" "}
              {format(new Date(report.created_at), "MMMM d, yyyy HH:mm:ss")}
            </p>
          </div>
        </div>

        {/* Recommendations Card */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Highlights</CardTitle>
            <CardDescription>
              Key suggestions for {report.payload.metadata.company_name}{" "}
              documentation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {report.payload.recommendations.map((rec, index) => (
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
        {/* Overview Card */}
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>Checker Results Summary</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {checkerOutputs.map((checker, index) => {
                let displayContent;

                switch (checker.checker_name) {
                  case "BasicUrlChecker": {
                    const output = JSON.parse(
                      checker.output,
                    ) as BasicUrlCheckerOutput;
                    displayContent = (
                      <>
                        <div className="text-sm text-muted-foreground">
                          Status: {output.status_code} {output.status_text}
                        </div>
                        <div className="text-sm">
                          Response Time: {output.response_time.toFixed(2)}s
                        </div>
                      </>
                    );
                    break;
                  }

                  case "LLMReadyChecker": {
                    const output =
                      typeof checker.output === "string"
                        ? (JSON.parse(checker.output) as LLMReadyOutput)
                        : (checker.output as LLMReadyOutput);
                    displayContent = (
                      <>
                        <div className="text-md text-muted-foreground">
                          Files Missing:{" "}
                          <span
                            className={
                              output.files_missing > 0 ? "text-red-500" : ""
                            }
                          >
                            {output.files_missing}
                          </span>
                        </div>
                      </>
                    );
                    break;
                  }

                  case "BrokenLinkChecker": {
                    const output =
                      typeof checker.output === "string"
                        ? (JSON.parse(
                            checker.output,
                          ) as BrokenLinkCheckerOutput)
                        : (checker.output as BrokenLinkCheckerOutput);

                    displayContent = (
                      <>
                        <div className="text-md text-muted-foreground">
                          Total Issues:{" "}
                          <span
                            className={
                              output.total_broken > 0 ? "text-red-500" : ""
                            }
                          >
                            {output.total_broken}
                          </span>
                        </div>
                      </>
                    );
                    break;
                  }

                  case "EnhancedValeChecker": {
                    const output =
                      typeof checker.output === "string"
                        ? (JSON.parse(
                            checker.output,
                          ) as EnhancedValeCheckerOutput)
                        : (checker.output as EnhancedValeCheckerOutput);
                    displayContent = (
                      <>
                        <div className="text-md text-muted-foreground">
                          Total Issues:{" "}
                          <span
                            className={
                              output.total_issues > 0 ? "text-red-500" : ""
                            }
                          >
                            {output.total_issues}
                          </span>
                        </div>
                      </>
                    );
                    break;
                  }

                  case "CodeSnippetChecker": {
                    const output =
                      typeof checker.output === "string"
                        ? (JSON.parse(
                            checker.output,
                          ) as CodeSnippetCheckerOutput[])
                        : (checker.output as CodeSnippetCheckerOutput[]);
                    displayContent = (
                      <>
                        <div className="text-md text-muted-foreground">
                          {/* Status: {output.status} */}
                          Issues:{" "}
                          <span
                            className={output.length > 0 ? "text-red-500" : ""}
                          >
                            {output.length}
                          </span>
                        </div>
                      </>
                    );
                    break;
                  }

                  default:
                    displayContent = (
                      <>
                        <div className="text-sm text-muted-foreground">
                          {checker.output_format}
                        </div>
                      </>
                    );
                }

                return (
                  <div
                    key={index}
                    className={`p-4 border rounded-lg space-y-2 cursor-pointer hover:bg-muted ${activeTab === checker.checker_name ? "bg-muted" : ""}`}
                    onClick={() => setActiveTab(checker.checker_name)}
                  >
                    <div className="text-lg font-medium">
                      {checker.friendly_name}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      Completed:{" "}
                      {checker.success ? (
                        <CheckCircle className="text-green-500 h-4 w-4" />
                      ) : (
                        <AlertTriangle className="text-yellow-500 h-4 w-4" />
                      )}
                    </div>
                    {displayContent}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto">
            <TabsList className="min-w-max mb-4 hidden">
              {/* <TabsTrigger value="overview">Overview</TabsTrigger> */}
              {checkerOutputs.map((checker) => (
                <TabsTrigger
                  key={checker.checker_name}
                  value={checker.checker_name}
                >
                  {checker.checker_name}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* <TabsContent value="overview">
          </TabsContent> */}

          {checkerOutputs.map((checker) => {
            let detailedContent;

            switch (checker.checker_name) {
              case "BrokenLinkChecker": {
                const output = JSON.parse(
                  checker.output,
                ) as BrokenLinkCheckerOutput;
                detailedContent = (
                  <div className="space-y-4">
                    <Card className="border-l-4 border-l-yellow-500/20">
                      <CardContent className="p-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>URL</TableHead>
                              <TableHead>Broken Link</TableHead>
                              <TableHead>Result</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {output.broken_links.map((link, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{link.parentname}</TableCell>
                                <TableCell className="font-medium">
                                  {link.urlname.length > 128
                                    ? link.urlname.substring(0, 128) + "..."
                                    : link.urlname}
                                </TableCell>
                                <TableCell>{link.result}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                );
                break;
              }

              case "LLMReadyChecker": {
                const output =
                  typeof checker.output === "string"
                    ? (JSON.parse(checker.output) as LLMReadyOutput)
                    : (checker.output as LLMReadyOutput);
                detailedContent = (
                  <div className="space-y-4">
                    <Card className="border-l-4 border-l-yellow-500/20">
                      <CardContent className="p-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>URL</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Status Code</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(output.file_results).map(
                              ([file, result], idx) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">
                                    {result.url}
                                  </TableCell>
                                  <TableCell>
                                    <StatusComponent
                                      status={result.exists}
                                      successText="Present"
                                      failureText="Missing"
                                    />
                                  </TableCell>
                                  <TableCell>{result.status_code}</TableCell>
                                </TableRow>
                              ),
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                );
                break;
              }

              case "BasicUrlChecker": {
                const output = JSON.parse(
                  checker.output,
                ) as BasicUrlCheckerOutput;
                detailedContent = (
                  <div className="space-y-4">
                    <Card className="border-l-4 border-l-yellow-500/20">
                      <CardContent className="p-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>URL</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Response Time</TableHead>
                              <TableHead>Content Type</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium">
                                {checker.link}
                              </TableCell>
                              <TableCell>
                                <StatusComponent
                                  status={output.status_code === 200}
                                  successText={`${output.status_code} ${output.status_text}`}
                                  failureText={`${output.status_code} ${output.status_text}`}
                                />
                              </TableCell>
                              <TableCell>
                                {output.response_time.toFixed(2)}s
                              </TableCell>
                              <TableCell>{output.content_type}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                );
                break;
              }

              case "CodeSnippetChecker": {
                const output =
                  typeof checker.output === "string"
                    ? (JSON.parse(checker.output) as CodeSnippetCheckerOutput[])
                    : (checker.output as CodeSnippetCheckerOutput[]);
                detailedContent = (
                  <div className="space-y-4">
                    <Card className="border-l-4 border-l-yellow-500/20">
                      <CardContent className="p-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Guide</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Issue</TableHead>
                              <TableHead>Fix</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {output.map((snippet, index) =>
                              !snippet.issue_details?.length ? (
                                <TableRow>
                                  <TableCell className="font-medium">
                                    <a
                                      href={snippet.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      {snippet.name}
                                    </a>
                                  </TableCell>
                                  <TableCell>
                                    <StatusComponent
                                      status={snippet.status === "success"}
                                      successText={snippet.status}
                                      failureText={snippet.status}
                                    />
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    No issues found
                                  </TableCell>
                                  <TableCell>-</TableCell>
                                  <TableCell>-</TableCell>
                                </TableRow>
                              ) : (
                                snippet.issue_details?.map((detail, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="font-medium">
                                      <a
                                        href={snippet.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        {snippet.name}
                                      </a>
                                    </TableCell>
                                    <TableCell>
                                      <StatusComponent
                                        status={snippet.status === "success"}
                                        successText={snippet.status}
                                        failureText={snippet.status}
                                      />
                                    </TableCell>
                                    <TableCell className="font-medium">
                                      {detail.issue}
                                    </TableCell>
                                    <TableCell>{detail.fix}</TableCell>
                                    <TableCell>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedStackTrace(
                                            detail.stack_trace,
                                          );
                                          setShowStackTrace(true);
                                        }}
                                      >
                                        Stack Trace
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))
                              ),
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    <Dialog
                      open={showStackTrace}
                      onOpenChange={setShowStackTrace}
                    >
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Stack Trace</DialogTitle>
                        </DialogHeader>
                        <pre className="text-xs whitespace-pre-wrap bg-muted p-4 rounded-md">
                          {selectedStackTrace}
                        </pre>
                      </DialogContent>
                    </Dialog>
                  </div>
                );
                break;
              }

              case "EnhancedValeChecker": {
                const output =
                  typeof checker.output === "string"
                    ? (JSON.parse(checker.output) as EnhancedValeCheckerOutput)
                    : (checker.output as EnhancedValeCheckerOutput);
                console.log(output);

                // Group errors by URL
                const groupedErrors = output.errors.reduce(
                  (acc, error) => {
                    if (!acc[error.filename]) {
                      acc[error.filename] = [];
                    }
                    acc[error.filename].push(error);
                    return acc;
                  },
                  {} as Record<string, typeof output.errors>,
                );

                // Sort URLs by total number of warnings + suggestions
                const sortedUrls = Object.entries(groupedErrors).sort(
                  ([urlA, errorsA], [urlB, errorsB]) => {
                    const countA = errorsA.filter(
                      (e) =>
                        e.severity === "warning" || e.severity === "suggestion",
                    ).length;
                    const countB = errorsB.filter(
                      (e) =>
                        e.severity === "warning" || e.severity === "suggestion",
                    ).length;
                    return countB - countA;
                  },
                );

                detailedContent = (
                  <div className="space-y-4">
                    <Card className="border-l-4 border-l-yellow-500/20">
                      <CardContent className="p-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>URL</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Top Message</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sortedUrls.map(([url, errors]) => {
                              // Count by severity
                              const severityCounts = errors.reduce(
                                (acc, error) => {
                                  acc[error.severity] =
                                    (acc[error.severity] || 0) + 1;
                                  return acc;
                                },
                                {} as Record<string, number>,
                              );

                              const topError = errors[0];

                              return (
                                <TableRow key={url}>
                                  <TableCell className="font-medium">
                                    {url}
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      {Object.entries(severityCounts).map(
                                        ([severity, count]) => (
                                          <StatusComponent
                                            key={severity}
                                            status={severity === "suggestion"}
                                            successText={`${count} ${severity}s`}
                                            failureText={`${count} ${severity}s`}
                                            successClasses="bg-blue-100 text-blue-800"
                                            failureClasses="bg-yellow-100 text-yellow-800"
                                          />
                                        ),
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      <strong>
                                        Line {topError.line}, Col{" "}
                                        {topError.span[0]}:
                                      </strong>{" "}
                                      {topError.check}: {topError.message}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedUrl(url);
                                        setSelectedErrors(errors);
                                        setShowAllMessages(true);
                                      }}
                                    >
                                      Show All
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    <Dialog
                      open={showAllMessages}
                      onOpenChange={setShowAllMessages}
                    >
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>
                            All Messages for {selectedUrl}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          {selectedErrors.map((error, idx) => (
                            <div key={idx} className="p-4 border rounded">
                              <div className="flex items-center gap-2 mb-2">
                                <StatusComponent
                                  status={error.severity === "suggestion"}
                                  successText={error.severity}
                                  failureText={error.severity}
                                  successClasses="bg-blue-100 text-blue-800"
                                  failureClasses="bg-yellow-100 text-yellow-800"
                                />
                                <span className="text-sm text-muted-foreground">
                                  Line {error.line}, Col {error.span[0]}
                                </span>
                              </div>
                              <div className="text-sm">
                                <strong>{error.check}:</strong> {error.message}
                              </div>
                            </div>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                );
                break;
              }

              default:
                detailedContent = (
                  <Card className="border-l-4 border-l-yellow-500/20">
                    <CardContent className="p-4">
                      <pre className="text-sm whitespace-pre-wrap">
                        {checker.output}
                      </pre>
                    </CardContent>
                  </Card>
                );
            }

            return (
              <TabsContent
                key={checker.checker_name}
                value={checker.checker_name}
              >
                {detailedContent}
              </TabsContent>
            );
          })}
        </Tabs>

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
