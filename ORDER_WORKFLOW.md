# AtlaasGo Order Workflow Implementation

## Overview
The complete order workflow connects customers, restaurants, and drivers through a real-time system with integrated messaging.

## Order States Flow

```
Customer Orders
    ↓
    ↓ (order status: 'ordered')
    ↓
Restaurant Receives Order
    ↓ (can chat with customer)
    ↓ Marks items as ready
    ↓ (order status: 'preparing')
    ↓
Admin/System Assigns Driver
    ↓ (order status: 'enRoute')
    ↓
Driver Accepts Assignment
    ↓ (can chat with customer & restaurant)
    ↓ Picks up from restaurant
    ↓ (order status: 'outForDelivery')
    ↓
Driver En Route to Customer
    ↓
Driver Arriving
    ↓ (order status: 'arriving')
    ↓ (chat continues with customer)
    ↓
Driver Confirms Delivery
    ↓ (order status: 'delivered')
    ↓
Chat Closes
Customer Reviews (Optional)
```

## Implementation Components

### 1. Frontend Pages

#### `/order` - Restaurant Browsing
- Customer browses and selects restaurants
- Location: `src/pages/Order.tsx`

#### `/r/:slug` - Restaurant Menu
- Customer selects items and adds to cart
- Location: `src/pages/Restaurant.tsx`

#### `/cart` - Checkout
- Customer reviews order, applies promos, confirms delivery location
- Location: `src/pages/Cart.tsx` (requires implementation)

#### `/track/:id` - Order Tracking
- **Customer View**: Real-time order status with timeline
- **Driver Info**: Dynamically fetches assigned rider details
  - Vehicle type, plate number, rating, trip count
  - Updates when driver is assigned
- **Chat Access**: Order chat is always available during order lifecycle
- Location: `src/pages/Track.tsx`

#### `/merchant` - Restaurant Dashboard
- **Kitchen Display System (KDS)**: Shows live orders with auto-expansion
- **New Features**: 
  - Each order card shows items, delivery location, customer notes
  - **Integrated Chat**: Chat with customer for each order
  - **Mark Ready Button**: Moves order to 'preparing' status
  - Real-time updates via Supabase subscriptions
- Location: `src/pages/Merchant.tsx`

#### `/rider` - Driver Dashboard
- **Active Tab**: Shows assigned orders
- **New Features**:
  - Expandable order cards with full details
  - **Integrated Chat**: Chat with customer & restaurant for each order
  - Action buttons for each delivery stage:
    - Accept order
    - Picked up (from restaurant)
    - Arriving now
    - Confirm delivery
  - Delivery location, special instructions, coordinates
- Location: `src/pages/Rider.tsx`

#### `/admin` - Admin Panel
- **Orders Tab**: Shows all orders with status
- **New Features**:
  - "Assign" button for preparing orders
  - Dropdown showing online riders with ratings/trips
  - Instantly assigns and bumps order to 'enRoute' status
- Location: `src/pages/Admin.tsx`

### 2. New Components

#### `MerchantOrderCard` (`src/components/MerchantOrderCard.tsx`)
Expandable order card for restaurants showing:
- Order ID and status
- Delivery location
- Items with quantities
- Customer contact via chat
- "Mark Ready" button for accepting orders

#### `RiderOrderCard` (`src/components/RiderOrderCard.tsx`)
Expandable order card for drivers showing:
- Order ID and status
- Delivery location with coordinates
- Items and total
- Special delivery instructions
- Customer chat
- Action buttons (accept → pickup → arriving → delivered)

#### `OrderChat` Enhancement (`src/components/OrderChat.tsx`)
Updated to:
- Dynamically fetch actual rider/merchant/customer names
- Show real vehicle info (vehicle + plate) for riders
- Support multi-party chat (customer ↔ merchant, customer ↔ driver)
- Mark messages as read automatically
- Quick replies and emoji support
- Location sharing

### 3. New Libraries

#### `orderAssignment.ts` (`src/lib/orderAssignment.ts`)
Fetches active assignment and rider profile for an order:
```typescript
useOrderAssignment(orderId)
  → { assignment, rider, loading, error }
```

Real-time updates when rider is assigned or assignment changes.

#### Enhanced Admin Functions (`src/lib/admin.ts`)
Added `useAvailableRiders()` to fetch online riders with:
- Vehicle info
- Current rating
- Total trips
- Sorted by rating (best first)

### 4. Order Actions

All actions in `src/lib/orderActions.ts`:

```typescript
// Restaurant
markPreparing(orderId)           // 'ordered' → 'preparing'

// Admin
assignRider(orderId, riderId)    // 'preparing' → 'enRoute' + creates assignment

// Driver
acceptAssignment(orderId, riderId)
markPickedUp(orderId, riderId)   // 'preparing' → 'outForDelivery'
markArriving(orderId)             // 'outForDelivery' → 'arriving'
markDelivered(orderId, riderId)   // 'arriving' → 'delivered'
rejectAssignment(orderId, riderId, reason)

// Customer
cancelOrder(orderId)              // 'ordered' → 'cancelled'
```

### 5. Styling

Added comprehensive CSS in `src/styles/global.css`:
- `.merchant-order-card` - Restaurant order display
- `.rider-order-card` - Driver order display
- `.status-badge` - Status indicators with color coding
- `.chat-pro-*` - Chat styling (existing, enhanced)

## Real-Time Features

All components use Supabase real-time subscriptions:

1. **Orders Table** - Status changes broadcast to all parties
2. **Order Messages** - Chat updates instantly for all participants
3. **Order Assignments** - Driver assignment notified to customer via Track page
4. **Riders Table** - Vehicle/rating updates reflected in chat headers
5. **Admin Dashboard** - Live order queue updates

## Chat Workflow

### Participants
- **Customer** - Always can chat
- **Merchant/Restaurant** - Access when order is 'ordered' or 'preparing'
- **Rider/Driver** - Access when assigned ('enRoute' onward)

### Features
- **Quick Replies** - Pre-set messages for customers
- **Location Sharing** - Both customer and driver can share location
- **Message Receipts** - Double-check marks show read status
- **Name Resolution** - Auto-detects partner by message sender role
- **Unread Tracking** - Messages marked as read when viewed

## Testing Checklist

- [ ] Customer can browse restaurants and add items to cart
- [ ] Customer can checkout and place order
- [ ] Restaurant receives order notification (appears in Merchant dashboard)
- [ ] Restaurant can view order items and delivery location
- [ ] Restaurant can chat with customer
- [ ] Restaurant marks order ready → status changes to 'preparing'
- [ ] Admin can see preparing orders with "Assign" button
- [ ] Admin can assign driver from online riders list
- [ ] Driver receives assignment notification
- [ ] Driver can see order in Active tab
- [ ] Driver can expand order to see full details
- [ ] Driver can chat with customer
- [ ] Customer can see driver info on Track page (vehicle, rating, trips)
- [ ] Driver can accept → pickup → arriving → delivered with chat throughout
- [ ] Chat persists from order placement until delivery confirmed
- [ ] Customer can review after delivery
- [ ] Admin panel shows all orders with real-time status updates

## Performance Optimizations

1. **Lazy Loading**
   - TrackMap component lazy-loads Leaflet (~80KB)
   - Fallback skeleton while loading

2. **Real-Time Subscriptions**
   - Scoped to specific order IDs
   - Automatic cleanup on unmount
   - Minimal bandwidth usage

3. **Order Snapshots**
   - Items stored as snapshots (prevents stale menu data)
   - Restaurant info cached at order time

4. **Rider Profiles**
   - Only fetched when assigned
   - Cached in component state
   - Updated via subscription

## Next Steps / Future Enhancements

1. **Notifications**
   - Push notifications for status changes
   - SMS alerts for critical updates
   - Email receipt after delivery

2. **Logistics**
   - Automatic rider assignment (ML-based matching)
   - Multi-stop optimized routing
   - Real-time map with traffic data

3. **Analytics**
   - Order completion metrics
   - Driver performance tracking
   - Restaurant operational insights
   - Customer satisfaction scores

4. **Features**
   - Order scheduling (future deliveries)
   - Group orders (multiple restaurants)
   - Rider tips through app
   - Contactless delivery options
   - Order modifications before pickup
