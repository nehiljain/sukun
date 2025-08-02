import {
  Body,
  Button,
  Container,
  Column,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface DemodriveReportEmailProps {
  username?: string;
  userImage?: string;
  invitedByUsername?: string;
  invitedByEmail?: string;
  teamName?: string;
  teamImage?: string;
  inviteLink?: string;
  inviteFromIp?: string;
  inviteFromLocation?: string;
}

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "";

export const DemodriveReportEmail = ({
  username,
  userImage,
  invitedByUsername,
  invitedByEmail,
  teamName,
  teamImage,
  inviteLink,
  inviteFromIp,
  inviteFromLocation,
}: DemodriveReportEmailProps) => {
  const previewText = `Join ${invitedByUsername} on DemoDrive`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logoText}>
              <Img
                src={`${baseUrl}/static/logo.svg`}
                width="40"
                height="37"
                alt="DemoDrive"
                style={logoImg}
              />{" "}
              DemoDrive
            </Text>
          </Section>
          <Heading style={heading}>
            <strong>{teamName}'s</strong> weekly report
          </Heading>
          <Text style={text}>Hello {username},</Text>
          <Text style={text}>
            Here is your first documentation quality report.{" "}
          </Text>
          <Text style={text}>
            We found numerous places to improve the documentation. We did not
            cover the guides in Agentic Copilots yet because the other section
            had some bugs which could affect the results.
          </Text>
          <Text style={text}>
            Would love your feedback on this! Hopefully, this will help you
            build an awesome documentation site.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={inviteLink}>
              View report
            </Button>
          </Section>
          <Text style={text}>
            or copy and paste this URL into your browser:{" "}
            <Link href={inviteLink} style={link}>
              {inviteLink}
            </Link>
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            Stay tuned for the report next week. As always, we're excited to
            continue building and improving DemoDrive with your support and
            feedback. If you have thoughts on these new features, encounter any
            issues, or have feature requests, please don't hesitate to reach out
            to us at founders@demodrive.tech.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: "hsl(0, 0%, 100%)",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
  padding: "0 12px",
};

const container = {
  backgroundColor: "hsl(240, 10%, 3.9%)",
  border: "1px solid hsl(240, 3.7%, 15.9%)",
  borderRadius: "8px",
  margin: "40px auto",
  padding: "20px",
  maxWidth: "465px",
};

const logoSection = {
  marginTop: "32px",
};

const logoText = {
  color: "hsl(0, 0%, 98%)",
  fontSize: "24px",
  fontWeight: "600",
  textAlign: "center" as const,
  margin: "0",
};

const logoImg = {
  display: "inline-block",
  verticalAlign: "middle",
  marginRight: "8px",
};

const heading = {
  color: "hsl(0, 0%, 98%)",
  fontSize: "24px",
  fontWeight: "normal",
  textAlign: "center" as const,
  margin: "30px 0",
};

const text = {
  color: "hsl(0, 0%, 98%)",
  fontSize: "14px",
  lineHeight: "24px",
};

const link = {
  color: "hsl(68, 100%, 40%)",
  textDecoration: "none",
};

const avatar = {
  borderRadius: "50%",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
  ":hover": {
    backgroundColor: "hsla(68, 100%, 40%, 0.9)",
    border: "1px solid hsl(0, 0%, 98%)",
  },
};

const button = {
  backgroundColor: "hsl(68, 100%, 40%)",
  borderRadius: "9999px",
  color: "hsl(0, 0%, 5%)",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "16px 24px",
  border: "1px solid transparent",
  transition: "all 0.2s ease",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  whiteSpace: "nowrap",
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
};

const hr = {
  border: "none",
  borderTop: "1px solid hsl(240, 5.9%, 90%)",
  margin: "26px 0",
  width: "100%",
};

const footer = {
  color: "hsl(240, 5%, 64.9%)",
  fontSize: "12px",
  lineHeight: "24px",
};

const footerBold = {
  color: "hsl(0, 0%, 98%)",
  fontWeight: "600",
};

DemodriveReportEmail.PreviewProps = {
  username: "Atai",
  teamName: "CopilotKit AI",
  inviteLink:
    "https://app.demodrive.tech/reports/copilotkit-ai-12-02-1733459087",
} as DemodriveReportEmailProps;

export default DemodriveReportEmail;
