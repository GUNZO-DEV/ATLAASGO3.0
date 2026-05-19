# AtlaasGo Order Workflow - Quick Start Guide

## 🚀 30-Second Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Open http://localhost:5173
```

## 🎯 Main User Journeys

### 👤 Customer
1. `/order` - Browse restaurants
2. `/r/:slug` - Select restaurant, add items
3. `/cart` - Checkout (location + notes)
4. `/track/:id` - Real-time tracking & chat

### 🍽️ Restaurant Staff
1. `/merchant` 
2. Click "Kitchen" tab
3. Expand order cards → See items, address, chat
4. Click "Mark ready" to move to next stage

### 🚴 Driver
1. `/rider`
2. Toggle "Online"
3. Accept available orders
4. Progress through: Pickup → Arriving → Delivered
5. Chat with customer throughout

### 🛡️ Admin
1. `/admin`
2. Click "Orders" tab
3. Find `preparing` orders
4. Click "Assign" → Select rider → Auto-assigns

## 📁 Key Files

| Purpose | File | What It Does |
|---------|------|-------------|
| Restaurant dashboard | `src/pages/Merchant.tsx` | Shows live orders |
| Restaurant order card | `src/components/MerchantOrderCard.tsx` | Expandable order with chat |
| Driver dashboard | `src/pages/Rider.tsx` | Shows active trips |
| Driver order card | `src/components/RiderOrderCard.tsx` | Expandable order with actions |
| Order tracking | `src/pages/Track.tsx` | Customer view + timeline |
| Admin panel | `src/pages/Admin.tsx` | Order & driver management |
| Chat | `src/components/OrderChat.tsx` | Multi-party messaging |
| Order actions | `src/lib/orderActions.ts` | Status transitions |
| Order fetching | `src/lib/orders.ts` | Subscription to order updates |
| Chat fetching | `src/lib/chat.ts` | Subscription to messages |
| Assignment fetching | `src/lib/orderAssignment.ts` | Rider profile + assignment |
| Admin utils | `src/lib/admin.ts` | Available riders & applications |

## 🔄 Order Status Flow

```
ordered
  ↓ (restaurant accepts)
preparing
  ↓ (admin assigns driver)
enRoute
  ↓ (driver picks up)
outForDelivery
  ↓ (driver arriving)
arriving
  ↓ (driver delivers)
delivered
```

## 💬 Chat Features

- **Quick replies** - Pre-set messages for customers
- **Location sharing** - Send coordinates
- **Message receipts** - Double-check marks show read status
- **Name detection** - Shows "Your driver", restaurant name, etc.
- **Emoji picker** - Send emoji reactions
- **Auto-scroll** - Always shows latest messages
- **Read tracking** - Mark messages as read on view

## 🎨 Styling

New CSS classes added to `src/styles/global.css`:

```css
.merchant-order-card     /* Restaurant order display */
.rider-order-card        /* Driver order display */
.status-badge            /* Color-coded status */
.chat-pro-*              /* Chat components */
```

## 🔌 Supabase Integrations

### Tables Used
- `orders` - Main order records
- `order_messages` - Chat messages  
- `order_assignments` - Driver assignments
- `riders` - Driver profiles
- `profiles` - User profiles
- `user_roles` - Role assignments

### Real-Time Subscriptions
All components subscribe to their relevant data:

```typescript
// Order updates
supabase
  .channel(`order:${orderId}`)
  .on('postgres_changes', ...)
  .subscribe()

// Chat messages
supabase
  .channel(`order_messages:${orderId}`)
  .on('postgres_changes', ...)
  .subscribe()

// Assignment changes
supabase
  .channel(`order_assignment:${orderId}`)
  .on('postgres_changes', ...)
  .subscribe()
```

## 📊 Debug Tips

### View Order Status
```bash
# In browser console
localStorage.setItem('debug', '1')  # Enable debug mode
```

### Test User Roles
Create users with these roles in `user_roles` table:
- `customer` - Default, can order
- `merchant` - Can manage restaurant
- `rider` - Can accept deliveries
- `admin` - Can assign riders

### Check Real-Time Connection
1. Open DevTools → Network → WebSocket
2. Look for `websocket` connection to Supabase
3. Should show "connected" in frames

## 🚨 Common Issues & Solutions

| Problem | Solution |
|---------|----------|
| Chat not showing | Check user is authenticated & has role |
| Driver info blank | Ensure `riders` table has entry for user_id |
| Orders not in list | Verify user has correct role in `user_roles` |
| Assignments not working | Check admin role assigned in `user_roles` |
| Chat stuck | Try refreshing page, check subscription logs |
| Status not updating | Verify Supabase RLS policies allow updates |

## 🧪 Testing Checklist

Quick test for each component:

### Cart → Order
- [ ] Add items to cart
- [ ] Enter location
- [ ] Click order → redirects to `/track`

### Restaurant Dashboard
- [ ] `/merchant` shows live orders
- [ ] Expand order → see items & chat
- [ ] Send chat message from merchant
- [ ] Mark ready → status changes

### Driver Dashboard
- [ ] `/rider` online status toggles
- [ ] "Available" tab shows orders
- [ ] Click accept → moves to "Active"
- [ ] Expand order → see full details
- [ ] Send chat message from driver
- [ ] Progress through statuses

### Admin Assignment
- [ ] `/admin` shows orders list
- [ ] Find "preparing" order
- [ ] Click "Assign" → dropdown appears
- [ ] Select rider → assigns instantly

### Customer Tracking
- [ ] `/track/:id` loads order
- [ ] Status updates in real-time
- [ ] Driver info appears when assigned
- [ ] Chat works with all parties
- [ ] Timeline progresses through stages

## 📚 Full Documentation

- `ORDER_WORKFLOW.md` - Detailed workflow explanation
- `IMPLEMENTATION_SUMMARY.md` - Complete feature list
- `QUICK_START.md` - This file

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

Output goes to `dist/` - ready for Cloudflare Pages

### Test Production Build Locally
```bash
npm run preview
```

## 🤝 Contributing

When adding features:

1. Keep order workflow state machine intact
2. Use Supabase subscriptions for real-time updates
3. Follow component expansion pattern (header + expanded body)
4. Add styling to `global.css`, not inline
5. Test across all three user roles
6. Verify chat works end-to-end

## ⚡ Performance Tips

- Components lazy-load maps (Leaflet loaded on demand)
- Subscriptions automatically clean up on unmount
- Items stored as snapshots to prevent stale data
- Chat pagination limits to 200 messages
- Order queries indexed by status for fast filters

## 📞 Support

- Check `ORDER_WORKFLOW.md` for architecture details
- Review `IMPLEMENTATION_SUMMARY.md` for feature list
- Look at similar components for code patterns
- Verify Supabase connection & RLS policies

---

**Quick Links:**
- Development: `npm run dev` → http://localhost:5173
- Production: `npm run build` → `dist/`
- Components: `src/pages/`, `src/components/`
- Styles: `src/styles/global.css`
- Supabase Setup: Check `.env.local`
