export interface Guide {
  id: string;
  name: string;
  is_valid: boolean;
  is_public: boolean;
  is_analyzed: boolean;
  last_check_timestamp: string | null;
  created_at: string;
  updated_at: string;
  guide_code_recipes: GuideCodeRecipe[];
}

export interface GuideCodeRecipe {
  id: string;
  title: string;
  description: string;
  published_at: string;
  language: string;
  actions: Action[];
  guide: number;
}

export interface Action {
  code_content: CodeFile[];
  entrypoint: string;
  is_long_running: boolean;
  latest_run_output: ActionRunOutput;
}

export interface CodeFile {
  filepath: string;
  content: string;
}

export interface ActionRunOutput {
  id: number;
  run_id: number;
  stdout: string;
  stderr: string;
  code_interpreter_hostname: string;
  exit_code: number;
  error: boolean;
  created_at: string;
  updated_at: string;
}

// Update the interface to match the API response
export interface IReport {
  report_name: string;
  created_at: string;
  updated_at: string;
  payload: {
    metadata: {
      company_name: string;
      docs_url: string;
      recommendations: string[];
    };
    guide_testing_results: Array<{
      name: string;
      status: "success" | "needs_attention";
      url: string;
      video?: string;
      issue_summary: string;
      issue_details: Array<{
        issue: string;
        fix: string;
        stack_trace: string;
      }>;
    }>;
  };
  is_public: boolean;
}

export interface IReportV2 extends Omit<IReport, "payload"> {
  url: string;
  payload: {
    metadata: {
      collection_name: string;
    };
    recommendations: string[];
    version: string;
  };
  is_public: boolean;
}

export interface BasicUrlCheckerOutput {
  status_code: number;
  status_text: string;
  content_type: string;
  response_time: number;
  content_length: number;
}

export interface LLMReadyOutput {
  file_results: Record<
    string,
    {
      url: string;
      exists: boolean;
      status_code: number;
    }
  >;
  is_llm_ready: boolean;
  files_checked: number;
  files_missing: number;
  files_present: number;
}

export interface BrokenLinkCheckerOutput {
  total_broken: number;
  errors: number;
  warnings: number;
  redirects: number;
  broken_links: Array<{
    urlname: string;
    parentname: string;
    result: string;
    valid: boolean;
  }>;
}

export interface EnhancedValeCheckerOutput {
  summary: string;
  total_issues: number;
  error_summary: Record<string, number>;
  errors: Array<Record<string, string>>;
  summary_df: Array<unknown>;
  detailed_df: Array<unknown>;
}

export interface CodeSnippetIssueDetail {
  fix: string;
  issue: string;
  stack_trace: string;
}

export interface CodeSnippetCheckerOutput {
  url: string;
  name: string;
  status: "success" | "needs_attention";
  issue_details: CodeSnippetIssueDetail[];
  issue_summary: string;
}

export interface ICheckerOutput {
  link: string;
  success: boolean;
  friendly_name: string;
  output: string;
  checker_name: string;
  output_format: string;
  created_at: string;
}
