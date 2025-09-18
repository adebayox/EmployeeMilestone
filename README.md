# UGiftMe Monday.com Integration 

##  Project Overview
This project creates **three Monday.com integrations** that connect with **UGiftMe's gift card platform** to automate employee recognition and reward management.  
Each integration leverages Monday.com's native strengths while adding strategic automation.

---

## Setup

### Technical Requirements
- Node.js (v18+) and npm  
- Monday.com developer account  
- UGiftMe API Key  

### UGiftMe API Setup
1. Obtain an **API Key** from UGiftMe platform.  

---

##  Integration 1: Automated Employee Milestone Rewards

### Concept
Automatically celebrate **employee milestones** with gift cards, reducing HR administrative burden while ensuring no milestone is missed.

##  Servers
- **http://localhost:3000** → Local development server 
- **https://ugm-monday-b5763a8d8eee.herokuapp.com/** → production development server 
- **http://localhost:3000/api-docs** → local swagger docs 
- **https://ugm-monday-b5763a8d8eee.herokuapp.com/api-docs** → production swagger docs 
---

##  Endpoints

### Milestones – Employee Milestone Management
- **POST** `/api/milestones/scan` → Manually trigger a milestone scan.  
- **GET** `/api/milestones/employees` → Get employee data from Monday.com.  
- **GET** `/api/milestones/employees/{itemId}/milestone` → Calculate next milestone for an employee.  
- **GET** `/api/milestones/today` → Get today’s milestones.  
- **GET** `/api/milestones/cron/status` → Get cron job status.  
- **POST** `/api/milestones/cron/run-now` → Run milestone scan immediately.  
- **POST** `/api/milestones/cron/schedule-test` → Schedule a test milestone scan.  

---

### 📋 Monday – Monday.com API Interaction
- **GET** `/api/monday/boards` → Get all boards.  
- **GET** `/api/monday/boards/{boardId}/items` → Get board items.  
- **POST** `/api/monday/boards/{boardId}/items` → Create a new item.  
- **PATCH** `/api/monday/items/{itemId}` → Update item column values.  
- **GET** `/api/monday/oauth/callback` → OAuth callback handler.  

---

### 🎁 UGiftMe – Gift Card API
- **GET** `/ugiftme/products/search` → Search products.  
- **GET** `/ugiftme/orders` → Get all orders.  
- **POST** `/ugiftme/orders` → Create a new order.  
- **GET** `/ugiftme/orders/{orderId}` → Get specific order details.  
- **POST** `/ugiftme/orders/{orderId}/activate` → Activate an order.  
- **GET** `/ugiftme/orders/search` → Search orders with filters.  
- **GET** `/ugiftme/wallet` → Get wallet information.  

---

### 🎯 Performance Rewards – Reward Management & Analytics
- **POST** `/api/performance-rewards/create` → Create a new performance reward entry.  
- **GET** `/api/performance-rewards` → Get all performance rewards with filters.  
- **POST** `/api/performance-rewards/tiers/configure` → Update reward tier configuration.  
- **GET** `/api/performance-rewards/tiers` → Get reward tier configuration.  
- **POST** `/api/performance-rewards/{itemId}/approve` → Process manager approval.  
- **GET** `/api/performance-rewards/approvals/pending` → Get pending approvals for a manager.  
- **POST** `/api/performance-rewards/redemption/check` → Check redemption status for all active gift cards.  
- **GET** `/api/performance-rewards/{itemId}/redemption` → Get redemption status for a specific reward.  
- **GET** `/api/performance-rewards/analytics/dashboard` → Get performance analytics dashboard.  
- **GET** `/api/performance-rewards/analytics/report` → Generate performance report.  
- **GET** `/api/performance-rewards/expiring` → Get expiring gift cards.  

---


### 🔔 Webhooks – Monday.com & Debugging
- **POST** `/webhooks/monday` → Handle Monday.com webhook events.  
- **POST** `/webhooks/test` → Test Monday webhook handler.  

---

###  Health
- **GET** `/health` → Health check endpoint.  

---

