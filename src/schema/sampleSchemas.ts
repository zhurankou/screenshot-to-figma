import type { UISchema } from "../types/schema";

/**
 * Small, hand-written schemas used to demo the importer without an AI round
 * trip. The UI exposes these via "Insert example", and the tests validate them.
 */

export const dashboardSample: UISchema = {
  name: "Analytics Dashboard",
  width: 1440,
  height: 900,
  background: "#F9FAFB",
  nodes: [
    {
      type: "frame",
      name: "Sidebar",
      x: 0,
      y: 0,
      width: 280,
      height: 900,
      fill: "#111827",
      children: [
        {
          type: "text",
          name: "Brand",
          x: 24,
          y: 28,
          width: 200,
          height: 28,
          text: "Acme Analytics",
          fontSize: 18,
          fontWeight: 700,
          color: "#FFFFFF"
        },
        {
          type: "text",
          name: "Nav / Overview",
          x: 24,
          y: 96,
          width: 200,
          height: 20,
          text: "Overview",
          fontSize: 14,
          fontWeight: 500,
          color: "#E5E7EB"
        },
        {
          type: "text",
          name: "Nav / Reports",
          x: 24,
          y: 132,
          width: 200,
          height: 20,
          text: "Reports",
          fontSize: 14,
          fontWeight: 400,
          color: "#9CA3AF"
        }
      ]
    },
    {
      type: "text",
      name: "Page title",
      x: 320,
      y: 48,
      width: 400,
      height: 40,
      text: "Overview",
      fontSize: 32,
      fontWeight: 700,
      color: "#111827"
    },
    {
      type: "rectangle",
      name: "Metric card",
      x: 320,
      y: 120,
      width: 360,
      height: 160,
      fill: "#FFFFFF",
      stroke: "#E5E7EB",
      strokeWidth: 1,
      cornerRadius: 16
    },
    {
      type: "text",
      name: "Metric label",
      x: 344,
      y: 144,
      width: 200,
      height: 20,
      text: "Active users",
      fontSize: 14,
      fontWeight: 500,
      color: "#6B7280"
    },
    {
      type: "text",
      name: "Metric value",
      x: 344,
      y: 176,
      width: 240,
      height: 48,
      text: "12,480",
      fontSize: 40,
      fontWeight: 700,
      color: "#111827"
    },
    {
      type: "imagePlaceholder",
      name: "Chart",
      x: 712,
      y: 120,
      width: 688,
      height: 320,
      cornerRadius: 16
    }
  ]
};

export const loginSample: UISchema = {
  name: "Login Screen",
  width: 480,
  height: 640,
  background: "#FFFFFF",
  nodes: [
    {
      type: "iconPlaceholder",
      name: "Logo",
      x: 208,
      y: 64,
      width: 64,
      height: 64,
      cornerRadius: 16
    },
    {
      type: "text",
      name: "Heading",
      x: 64,
      y: 152,
      width: 352,
      height: 36,
      text: "Welcome back",
      fontSize: 28,
      fontWeight: 700,
      color: "#111827",
      textAlign: "center"
    },
    {
      type: "rectangle",
      name: "Email field",
      x: 64,
      y: 232,
      width: 352,
      height: 48,
      fill: "#FFFFFF",
      stroke: "#D1D5DB",
      strokeWidth: 1,
      cornerRadius: 8
    },
    {
      type: "rectangle",
      name: "Password field",
      x: 64,
      y: 296,
      width: 352,
      height: 48,
      fill: "#FFFFFF",
      stroke: "#D1D5DB",
      strokeWidth: 1,
      cornerRadius: 8
    },
    {
      type: "rectangle",
      name: "Sign in button",
      x: 64,
      y: 372,
      width: 352,
      height: 48,
      fill: "#2563EB",
      cornerRadius: 8
    },
    {
      type: "text",
      name: "Sign in label",
      x: 64,
      y: 386,
      width: 352,
      height: 20,
      text: "Sign in",
      fontSize: 15,
      fontWeight: 600,
      color: "#FFFFFF",
      textAlign: "center"
    },
    {
      type: "divider",
      name: "Separator",
      x: 64,
      y: 452,
      width: 352,
      height: 1,
      fill: "#E5E7EB"
    }
  ]
};

export const sampleSchemas: Record<string, UISchema> = {
  dashboard: dashboardSample,
  login: loginSample
};
