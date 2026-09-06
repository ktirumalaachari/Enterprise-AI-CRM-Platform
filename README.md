# 🚀 Enterprise AI CRM & Sales Management Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.5-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Groq LLaMA-3](https://img.shields.io/badge/Groq_AI-LLaMA--3.3-F34B21?style=for-the-badge&logo=openai&logoColor=white)](https://groq.com/)
[![Razorpay](https://img.shields.io/badge/Razorpay-Payment_Gateway-0C2340?style=for-the-badge&logo=razorpay&logoColor=white)](https://razorpay.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

> An **Industry-Level, Multi-Tenant AI CRM & Sales Intelligence Platform** built with **React 18, Vite, TypeScript, TailwindCSS, Express.js, MongoDB, and Groq LLaMA-3 AI**. Designed for enterprise scalability, high-speed lead qualification, automated outreach, team collaboration, and automated subscription monetization.

---

## 📑 Table of Contents

- [🚀 Enterprise AI CRM \& Sales Management Platform](#-enterprise-ai-crm--sales-management-platform)
  - [📑 Table of Contents](#-table-of-contents)
  - [✨ Key Features](#-key-features)
    - [🏢 Multi-Tenant Enterprise Workspace](#-multi-tenant-enterprise-workspace)
    - [🏢 Company Join Code Onboarding System](#-company-join-code-onboarding-system)
    - [📊 Lead \& Pipeline Kanban Management](#-lead--pipeline-kanban-management)
    - [🔒 Enterprise Authentication \& Security](#-enterprise-authentication--security)
  - [🤖 AI Copilot \& Sales Intelligence](#-ai-copilot--sales-intelligence)
  - [🛡️ Role-Based Access Control (RBAC)](#️-role-based-access-control-rbac)
  - [💳 Subscription \& SaaS Monetization](#-subscription--saas-monetization)
  - [🛠️ Tech Stack](#️-tech-stack)
    - [Frontend](#frontend)
    - [Backend](#backend)
  - [📂 Project Directory Structure](#-project-directory-structure)
  - [⚡ Getting Started](#-getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation Step-by-Step](#installation-step-by-step)
  - [🚀 Deployment Guide](#-deployment-guide)
    - [Deploying to Vercel](#deploying-to-vercel)
  - [📄 License](#-license)

---

## ✨ Key Features

### 🏢 Multi-Tenant Enterprise Workspace

- **Complete Tenant Isolation**: Logical isolation of customer data, leads, deals, activities, and audit logs by `companyId`.
- **Company Lifecycle Management**: Companies transition seamlessly through `PENDING`, `ACTIVE`, `SUSPENDED`, and `REJECTED` states.
- **Multi-Company Context Switching**: Users associated with multiple organizations can switch workspace contexts without re-authenticating.

### 🏢 Company Join Code Onboarding System

- **Unique Company Join Codes**: Each company receives a unique 6-digit join code.
- **Employee Onboarding Flow**: New employees register, enter their company join code, and enter a `PENDING_APPROVAL` queue.
- **Admin Approval Queue**: Company Owners & Super Admins receive real-time join requests with single-click approve or reject capabilities.

### 📊 Lead & Pipeline Kanban Management

- **Visual Deal Pipeline**: Interactive drag-and-drop Kanban board for deals (`Lead`, `Contacted`, `Proposal`, `Negotiation`, `Closed-Won`, `Closed-Lost`).
- **Lead Scoring & Qualification**: BANT framework qualification checklist and AI lead velocity metrics.
- **Activity & Task Tracking**: Seamless scheduling of sales calls, meetings, follow-ups, and executive reports.

### 🔒 Enterprise Authentication & Security

- **JWT Authentication**: Short-lived Access Tokens + Secure HTTP-Only Cookie Refresh Tokens.
- **Google OAuth 2.0**: Single Sign-On (SSO) with direct account creation and automatic profile syncing.
- **OTP Verification & Password Recovery**: Secure 6-digit email OTP verification via Nodemailer / Resend.
- **Security Hardening**: Protected by `helmet`, `express-rate-limit`, `express-mongo-sanitize`, and `bcryptjs` password hashing.

---

## 🤖 AI Copilot & Sales Intelligence

Powered by **Groq LLaMA-3.3 High-Speed AI Engine**:

1. **Interactive AI Sales Strategist (Copilot)**:
   - Real-time Q&A for handling price objections, cold call scripts, and deal closing techniques.
   - Support for file attachments (`.txt`, `.pdf`, `.csv`, `.md`, `.json`) for context-aware analysis.
   - Persistent local chat history sync with single-click history reset.
2. **AI Email Campaign Writer**:
   - Generates personalized sales emails for _Cold Outreach_, _Follow-up_, _Proposal Intro_, and _Objection Handling_.
   - Dynamic parameter adjustments for recipient name, company, deal size, and custom tone instructions.
3. **Meeting Summarizer**:
   - Transforms raw, unstructured call notes into executive summaries with key takeaways and actionable next steps.

---

## 🛡️ Role-Based Access Control (RBAC)

The system enforces a strict 4-tier authorization hierarchy:

| Role                                                 | Access Scope & Permissions                                                                                                                                         |
| :--------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 👑 **Super Admin** (`SUPER_ADMIN`)                   | **Master Platform Control**: Approves/suspends companies, manages system-wide users, lifetime unlimited access to all premium AI features, full read/write access. |
| 🏢 **Company Owner** (`COMPANY_OWNER`)               | **Workspace Admin**: Manages company settings, team members, approves join requests, custom RBAC configurations, and views audit logs.                             |
| 👔 **Sales Manager** (`SALES_MANAGER`)               | **Team Oversight**: Monitors team pipeline, assigns leads/deals, reviews team performance metrics, and accesses executive analytics reports.                       |
| 💼 **Sales Representative** (`SALES_REPRESENTATIVE`) | **Individual Sales**: Manages assigned leads/deals, executes tasks, logs call activities, and utilizes AI Copilot tools.                                           |

---

## 💳 Subscription & SaaS Monetization

Integrated with **Razorpay Payment Gateway**:

- **Tiered SaaS Plans**:
  - `14-Day Free Trial`: 100 AI Credits / month, 7 Total Users.
  - `Basic / Plus` (₹200 / ₹999/mo): 500 AI Credits, 13 Users, 2,500 Leads.
  - `Medium / Pro` (₹400 / ₹2,499/mo): 2,500 AI Credits, 50 Users, 15,000 Leads, AI Meeting Summarizer.
  - `Premium / Ultra` (₹800 / ₹4,999/mo): 10,000 AI Credits, 250 Users, 100,000 Leads, Dedicated VIP Support.
- **Automated Signature Verification**: Cryptographic validation of Razorpay order signatures (`razorpay_signature`).
- **Super Admin Privilege**: Super Admin accounts are automatically provisioned with lifetime unlimited Premium access.

---

## 🛠️ Tech Stack

### Frontend

- **Framework**: [React 18](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- **Styling**: [TailwindCSS](https://tailwindcss.com/) + Custom Design Tokens + Glassmorphism Dark/Light Theme System
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Data Fetching**: [Axios](https://axios-http.com/) + [@tanstack/react-query](https://tanstack.com/query)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Charts & Visualizations**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)

### Backend

- **Runtime**: [Node.js](https://nodejs.org/) + [Express.js](https://expressjs.com/) + [TypeScript](https://www.typescriptlang.org/)
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose ORM](https://mongoosejs.com/)
- **AI Integration**: [Groq Cloud API](https://groq.com/) (LLaMA-3.3-70b)
- **Payments**: [Razorpay Node SDK](https://razorpay.com/)
- **Email Service**: [Nodemailer](https://nodemailer.com/) / [Resend](https://resend.com/)
- **Security & Validation**: Zod, BcryptJS, JSON Web Tokens (JWT), Helmet, Rate Limiter

---

## 📂 Project Directory Structure

```
AI_CRM_Industry_Level_Project_Roadmap/
├── client/                     # Frontend Vite + React + TypeScript App
│   ├── public/                 # Static assets (favicon.svg, favicon.ico, logo.svg)
│   ├── src/
│   │   ├── components/         # Reusable UI components, Modals, Tables, Toast
│   │   ├── layouts/            # DashboardLayout, Sidebar, Responsive Drawer
│   │   ├── pages/              # Dashboard, Leads, Deals, AiAssistant, SuperAdmin, etc.
│   │   ├── routes/             # AppRoutes with RoleGuard & ProtectedRoute
│   │   ├── services/           # Axios API client & interceptors
│   │   ├── store/              # Zustand Auth & Theme Stores
│   │   └── main.tsx            # Application Entry Point
│   ├── package.json
│   └── vite.config.ts
├── server/                     # Backend Express + TypeScript Server
│   ├── src/
│   │   ├── config/             # DB connection, Seed scripts, Admin password fixes
│   │   ├── controllers/        # Auth, Company, Lead, Deal, AI, Payment controllers
│   │   ├── middleware/         # Auth, Tenant, RBAC, Rate Limiter, Subscription
│   │   ├── models/             # Mongoose Schemas (User, Company, Lead, Deal, Task, etc.)
│   │   ├── routes/             # Express Route definitions
│   │   ├── services/           # Token, Email, OTP, AI, Subscription services
│   │   └── app.ts              # Express App setup & middleware pipeline
│   ├── package.json
│   └── tsconfig.json
├── vercel.json                 # Vercel Deployment Configuration
└── README.md                   # Project Documentation
```

---

## ⚡ Getting Started

### Prerequisites

- **Node.js**: `v18.x` or higher
- **npm** or **yarn**
- **MongoDB**: Local instance or MongoDB Atlas Connection URI

### Installation Step-by-Step

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/AbhayMParmar/Enterprise-AI-CRM-Platform-.git
   cd Enterprise-AI-CRM-Platform-
   ```

2. **Install Dependencies**:

   ```bash
   # Install root dependencies
   npm install

   # Install client dependencies
   cd client && npm install

   # Install server dependencies
   cd ../server && npm install
   ```

3. **Seed Database (Optional)**:

   ```bash
   cd server
   npm run seed
   ```

4. **Run the Development Server**:
   ```bash
   # Run frontend and backend concurrently from the root folder:
   npm run dev
   ```

   - **Client Application**: Runs at `http://localhost:5173`
   - **Backend API**: Runs at `http://localhost:5000`

---

## 🚀 Deployment Guide

### Deploying to Vercel

1. **Client Deployment**:
   - Push your repository to GitHub.
   - Import the project into **Vercel**.
   - Set the Root Directory to `client`.
     ACME2026

2. **Server Deployment**:
   - Deploy backend to Vercel or custom server provider.

---

## 📄 License

This project is licensed under the **MIT License**. Feel free to use, modify, and distribute for personal or commercial projects.

---

<p center>
Built with ❤️ by <strong>K Tirumala Achari</strong> · <i>Empowering Sales Teams with Artificial Intelligence</i>
</p>
