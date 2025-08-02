import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Column,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Row,
} from "@react-email/components";
import * as React from "react";

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "";

export const CodepenChallengersEmail = () => (
  <Html>
    <Head />
    <Preview>DemoDrive AI: Weekly Developer Updates</Preview>
    <Body style={main}>
      <Section style={header}>
        <Img
          style={imgHeader}
          src={`${baseUrl}/static/codepen-challengers.png`}
          width={600}
          alt="codepen"
        />
      </Section>
      <Container style={container}>
        <Text style={challengeLink}>
          <Link style={link}>Try DemoDrive AI Today</Link>
        </Text>

        <Heading style={heading}>
          <strong>This week:</strong> Introducing{" "}
          <Text style={cubeText}>AI-Powered Documentation</Text>
        </Heading>

        <Section style={section}>
          <Text style={text}>Welcome to the future of DevRel!</Text>

          <Text style={text}>
            We're thrilled to announce our latest feature: AI-powered
            documentation generation that's revolutionizing how DevRel teams
            work.
          </Text>

          <Text style={text}>
            This week, we're focusing on API documentation 🚀
          </Text>

          <Text style={text}>
            Creating comprehensive API documentation has always been
            time-consuming. Our AI assistant now analyzes your codebase and
            generates detailed, accurate documentation with real-world examples.
          </Text>

          <Text style={text}>
            Early users are reporting 50% time savings on documentation tasks,
            allowing them to focus more on community engagement and strategic
            initiatives.
          </Text>

          <Text style={yourChallenge}>
            💪 <strong>Try it now:</strong>{" "}
            <Link style={blueLink}>
              Generate your first AI-powered documentation
            </Link>
          </Text>

          <Img
            style={imgCube}
            src={`${baseUrl}/static/codepen-cube.png`}
            width={600}
            alt="codepen"
          />

          <Section style={sectionPro}>
            <Text>
              DemoDrive Pro combines powerful features that help DevRel teams at
              any scale automate their workflow and engage with developers more
              effectively.
            </Text>

            <Button style={button}>
              <strong>Start Free Trial</strong>
            </Button>
          </Section>
        </Section>

        <Text style={yellowSection}>
          <strong>What's New:</strong> • Automated API documentation • Code
          example generation • Multi-platform content distribution • Community
          engagement automation
        </Text>

        <Section style={section}>
          <Row>
            <Column style={ideas}>
              <Text style={ideasTitle}>USE CASES</Text>

              <Section style={yellowCard}>
                🌟
                <Text style={textCard}>
                  Transform your API documentation workflow. Our AI understands
                  your codebase and generates comprehensive docs with examples,
                  best practices, and common use cases.
                </Text>
              </Section>

              <Section style={yellowCard}>
                🌟
                <Text style={textCard}>
                  Automate social media content creation. Turn feature releases
                  and updates into engaging posts for Twitter, LinkedIn, and
                  Discord.
                </Text>
              </Section>

              <Section style={yellowCard}>
                🌟
                <Text style={textCard}>
                  Generate interactive tutorials and video content. Help
                  developers understand your product faster with AI-generated
                  learning materials.
                </Text>
              </Section>
            </Column>
            <Column style={resources}>
              <Text style={resourcesTitle}>SUCCESS STORIES</Text>

              <Section style={blueCard}>
                📖
                <Text style={textCard}>
                  "DemoDrive helped us reduce documentation time by 50% while
                  improving quality" - WhiteRabbit.ai
                </Text>
              </Section>

              <Section style={blueCard}>
                📖
                <Text style={textCard}>
                  "Our developer engagement increased 3x after implementing
                  DemoDrive's content automation" - E2B.dev
                </Text>
              </Section>

              <Section style={blueCard}>
                📖
                <Text style={textCard}>
                  "The AI-generated tutorials have significantly reduced our
                  onboarding time for new users" - FireworksAI
                </Text>
              </Section>
            </Column>
          </Row>
        </Section>

        <Section style={goToChallenge}>
          <Button style={footerButton}>Go to Challenge Page</Button>
        </Section>

        <Section style={footer}>
          <Text style={footerText}>
            You can adjust your{" "}
            <Link style={footerLink}>email preferences</Link> any time, or{" "}
            <Link style={footerLink}>instantly opt out</Link> of emails of this
            kind. Need help with anything? Hit up{" "}
            <Link style={footerLink}>support</Link>.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default CodepenChallengersEmail;

const main = {
  fontFamily: '"Google Sans",Roboto,RobotoDraft,Helvetica,Arial,sans-serif',
  backgroundColor: "#505050",
  margin: "0",
};

const imgHeader = {
  margin: "auto",
  maxWidth: "100%",
};

const imgCube = {
  maxWidth: "100%",
};

const header = {
  width: "100%",
  backgroundColor: "#191919",
  margin: "0 auto",
  paddingBottom: "30px",
  zIndex: "999",
};

const container = {
  margin: "0 auto",
  width: "648px",
  maxWidth: "100%",
  position: "relative" as const,
};

const challengeLink = {
  backgroundColor: "#505050",
  textAlign: "center" as const,
  padding: "10px 0",
  fontSize: "13px",
  position: "absolute" as const,
  width: "648px",
  maxWidth: "100%",
  top: "-28px",
  margin: "0 0 16px 0",
};

const link = {
  color: "#fff",
  cursor: "pointer",
};

const blueLink = {
  color: "#15c",
  cursor: "pointer",
};

const heading = {
  background: "#f0d361",
  padding: "30px",
  color: "#191919",
  fontWeight: "400",
  marginBottom: "0",
};

const section = {
  margin: "0",
  background: "#fff",
  padding: "0 24px",
};

const yellowSection = {
  background: "#f5d247",
  padding: "30px",
  fontSize: "18px",
  lineHeight: "1.5",
};

const text = {
  fontSize: "16px",
};

const cubeText = { fontSize: "32px", margin: "4px 0 0 0" };

const yourChallenge = {
  fontSize: "16px",
  border: "6px solid #ebd473",
  padding: "20px",
  margin: "0 0 40px 0",
};

const sectionPro = {
  marginTop: "40px",
  marginBottom: "24px",
  textAlign: "center" as const,
  background: "#0b112a",
  color: "#fff",
  padding: "35px 20px 30px 20px",
  border: "6px solid #2138c6",
};

const imagePro = { margin: "0 auto 30px auto" };

const button = {
  background: "#2138c6",
  color: "#fff",
  border: "0",
  fontSize: "15px",
  lineHeight: "18px",
  cursor: "pointer",
  borderRadius: "4px",
  padding: "12px",
};

const resourcesTitle = {
  fontWeight: "900",
  lineHeight: "1.1",
  marginTop: "-40px",
  fontSize: "18px",
};

const ideasTitle = {
  fontWeight: "900",
  lineHeight: "1.1",
  fontSize: "18px",
};

const ideas = {
  width: "50%",
  paddingRight: "10px",
};

const resources = {
  width: "50%",
  paddingLeft: "10px",
};

const card = {
  padding: "20px",
  margin: "0 0 20px 0",
  borderRadius: "10px",
  fontSize: "36px",
  textAlign: "center" as const,
};

const yellowCard = {
  ...card,
  background: "#fff4c8",
  border: "1px solid #f4d247",
};

const blueCard = {
  ...card,
  background: "#d9f6ff",
  border: "1px solid #92bfd0",
};

const textCard = {
  fontSize: "13px",
  textAlign: "left" as const,
};

const goToChallenge = {
  margin: "40px 0 120px 0",
  textAlign: "center" as const,
};

const footerButton = {
  fontSize: "26px",
  color: "#15c",
  background: "#222",
  borderRadius: "4px",
  fontWeight: "bold",
  cursor: "pointer",
  padding: "15px 30px",
};

const footer = {
  background: "#fff",
  color: "#505050",
  padding: "0 24px",
  marginBottom: "48px",
};

const footerText = {
  fontSize: "13px",
};

const footerLink = {
  textDecoration: "underline",
  color: "#505050",
  cursor: "pointer",
};
