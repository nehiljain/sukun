import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import Loader from "@/components/shared/loader";
import { IReportV2, IReport } from "@/types/blogChecker";
import { DataTable } from "@/components/ui/data-table";

type IReportList = IReportV2 | IReport;

export default function Reports() {
  const [reports, setReports] = useState<IReportList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/reports/");
        if (!response.ok) {
          throw new Error("Failed to fetch reports");
        }
        const data = await response.json();
        setReports(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch reports",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader />
      </div>
    );
  if (error)
    return (
      <div className="flex justify-center items-center min-h-screen text-red-500">
        Error: {error}
      </div>
    );

  return (
    <div className="flex container mx-auto py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Reports</CardTitle>
          <CardDescription>View your generated reports.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader />
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  accessorKey: "report_name",
                  header: "Report Name",
                },
                {
                  accessorKey: "payload.metadata",
                  header: "Collection Name",
                  cell: ({ row }) =>
                    "collection_name" in row.original.payload.metadata
                      ? row.original.payload.metadata.collection_name
                      : row.original.payload.metadata.company_name,
                },
                {
                  accessorKey: "created_at",
                  header: "Created At",
                  cell: ({ row }) =>
                    format(
                      new Date(row.original.created_at),
                      "MMM d, yyyy HH:mm",
                    ),
                },
                {
                  id: "actions",
                  cell: ({ row }) => (
                    <Button
                      variant="outline"
                      onClick={() =>
                        navigate(
                          "version" in row.original.payload &&
                            row.original.payload.version === "2.0.0"
                            ? `/reports-v2/${row.original.report_name}`
                            : `/reports/${row.original.report_name}`,
                        )
                      }
                    >
                      View Report
                    </Button>
                  ),
                },
              ]}
              data={reports}
              sortableColumns={["report_name", "created_at"]}
              filterableColumns={["report_name"]}
              initialSorting={[{ id: "created_at", desc: true }]}
            />
          )}
          {!loading && reports.length === 0 && (
            <p className="text-center mt-4">No reports found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
