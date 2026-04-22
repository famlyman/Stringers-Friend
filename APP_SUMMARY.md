# Stringers Friend - Application Summary

## Overview
**Stringers Friend** is a comprehensive, multi-tenant racquet stringing management PWA designed for shop owners and their customers. It streamlines the entire stringing workflow, from customer intake and racquet specification lookup to job tracking and inventory management.

## Core Purpose
The application serves as a digital assistant for racquet stringers, providing tools to manage multiple shops, track customer equipment via QR codes, and maintain a real-time inventory of strings and accessories.

## Key Features

### 1. Shop & Tenant Management
*   **Multi-Tenancy:** Each shop owner can manage their own isolated environment.
*   **Shop Profiles:** Customizable shop details including name, address, phone, and a unique URL slug.
*   **Public Portals:** Each shop has a public-facing page where customers can view services and send inquiries.

### 2. Customer Management
*   **Customer Database:** Shops maintain a detailed list of customers with contact info and job history.
*   **Customer Portals:** Customers can log in to view their racquets, track active jobs, and receive notifications.
*   **Lead Generation:** Public inquiry forms allow potential customers to reach out, creating "lead" records in the shop's database.

### 3. Racquet Tracking & AI Specs
*   **Equipment Records:** Detailed tracking of racquets, including brand, model, serial numbers, and current stringing setups.
*   **AI-Powered Specs:** Integration with the **Gemini API** allows stringers to instantly look up technical specifications (head size, pattern, tension range, stringing instructions) for almost any racquet model.
*   **Spec Caching:** A dedicated Supabase table caches AI-generated specs to ensure fast performance and reduce API costs.
*   **QR Code Integration:** Each racquet can be assigned a unique QR code for instant identification and history lookup via a mobile camera.

### 4. Job Workflow & Management
*   **Status Tracking:** Jobs move through a clear lifecycle: `pending` -> `in_progress` -> `completed` -> `delivered`.
*   **Detailed Job Records:** Tracks string types (mains/crosses), tensions, service types (full bed, hybrid, etc.), pricing, and payment status.
*   **Real-time Updates:** Uses Supabase Realtime subscriptions to provide instant UI updates when job statuses change.

### 5. Inventory Control
*   **Smart Inventory:** Tracks strings (by reel or individual set), grips, dampeners, and other accessories.
*   **Reel Management:** Specifically tracks the remaining length on string reels, automatically alerting when stock is low.
*   **Low Stock Alerts:** Visual indicators for items falling below a defined threshold.

### 6. Communication & Notifications
*   **Messaging System:** Integrated chat/messaging between the shop and the customer.
*   **Automated Notifications:** Customers receive alerts for job completions, new messages, and payment confirmations.
*   **Push Notifications:** Support for browser push notifications to keep users informed even when the app is in the background.

## Technical Architecture (PWA)

### Frontend
*   **Framework:** React 19 with TypeScript.
*   **Build Tool:** Vite 6.
*   **Routing:** React Router v7.
*   **Styling:** Tailwind CSS v4.
*   **Icons:** Lucide-React.
*   **PWA:** Vite PWA Plugin with Workbox.

### Backend (Supabase)
*   **Authentication:** Supabase Auth.
*   **Database:** Supabase PostgreSQL with a multi-tenant schema (Shops, Customers, Jobs).
*   **Security:** Row Level Security (RLS) policies ensuring shop-level data isolation.
*   **Real-time:** Supabase Realtime for instant job and inventory updates.
*   **Edge Functions:** Supabase Edge Functions for notifications.

### Integrations
*   **AI:** Google Gemini API (gemini-1.5-flash) for technical racquet data.
*   **QR Codes:** react-qr-code for generating scannable codes.
*   **Notifications:** Supabase Edge Functions + Push Subscriptions.

---

*Status: In Active Development (PWA Live)*
*Last Updated: 2026-04-22*