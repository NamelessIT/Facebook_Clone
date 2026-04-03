# Facebook Clone - PHASE 5: UI Refinement & Advanced Features

**Phase:** 5  
**Date Created:** April 3, 2026  
**Status:** 🔴 READY FOR EXECUTION  
**Build:** Backend ✅ | Frontend ✅ | Both: 0 errors  

---

## Overview

| Group | Feature | Priority | Status | Subtasks | Time |
|-------|---------|----------|--------|----------|------|
| **GROUP-0** | Dark Mode UI Refinement | 🔴 HIGH | ⏳ READY | 6 subtasks | 2-3h |
| **GROUP-1** | Saved Items Sidebar | 🟡 MEDIUM | ⏳ READY | 8 subtasks | 3-4h |
| **GROUP-2** | Post Delete with Undo | 🔴 HIGH | ⏳ READY | 9 subtasks | 3-4h |
| **TOTAL** | | | ⏳ READY FOR EXECUTION | **23 subtasks** | **8-11h** |

**File Status:** 🔴 READY FOR EXECUTION

---

# GROUP-0: DARK MODE UI REFINEMENT 🌙

**Feature:** Improve dark mode colors & contrast for better UX  
**Priority:** 🔴 HIGH  
**Estimated Time:** 2-3 hours  
**Components Affected:** Navbar, Sidebar, Cards, Forms, Modals, Post Items  

---

## Group-0 Subtasks

### 0.1. Analyze Current Dark Mode Issues
- **Task:** Review current dark mode colors and identify contrast/readability issues
- **Deliverable:** Screenshot + list of color fixes needed
- **Notes:** Check WCAG AA compliance (4.5:1 contrast ratio)
- **Result:** 🔴 PENDING

### 0.2. Define Dark Mode Color Palette
- **Task:** Create comprehensive dark mode color system
  - Primary colors: Background, card, hover, active
  - Text colors: Primary, secondary, tertiary
  - Accent colors: Link, success, warning, danger
  - Borders, shadows for dark background
- **Deliverable:** Complete color mapping in `index.css`
- **File:** `frontend/Facebook_Frontend/src/index.css`
- **Result:** 🔴 PENDING

### 0.3. Update CSS Variables
- **Task:** Update all CSS variables in root `:root[data-theme="dark"]`
  - Increase contrast for text on dark backgrounds
  - Adjust shadow colors for visibility
  - Fine-tune hover/active states
- **File:** `frontend/Facebook_Frontend/src/index.css`
- **Colors Reference:**
  ```
  Light Background: #f0f2f5 → Dark: #18191a
  Card Background: #fff → Dark: #262626  
  Secondary Card: Lighter grays → Dark: #3d3d3d
  Text Primary: #050505 → Dark: #e4e6eb
  Text Secondary: #65676b → Dark: #b0b3b9
  Border: #ced0d4 → Dark: #3d3d3d or #4a4a4a
  ```
- **Result:** 🔴 PENDING

### 0.4. Update Navbar Dark Mode
- **Task:** Refine navbar colors for dark mode
  - Search input contrast
  - Icon colors
  - Tab hover/active states
  - Brand colors consistency
- **Files:** 
  - `MainLayout.css`
  - `UserDropdown.css` (if exists)
- **Note:** Ensure Facebook blue (#1877f2) is visible
- **Result:** 🔴 PENDING

### 0.5. Update Card & Container Styling
- **Task:** Adjust all cards, containers, modals for dark mode
  - Form inputs: text color, background, focus states
  - Buttons: background, text, hover/active
  - Lists: item backgrounds, hover states
  - Input/textarea: ensure text readability
- **Files:**
  - `HomePage.css`
  - `PostItem.css`
  - `CreatePostModal.css`
  - `EditPostModal.css`
  - `ProfileSidebar.css`
- **Result:** 🔴 PENDING

### 0.6. Test Dark Mode Across All Pages
- **Task:** Manual testing on all major pages
  - HomePage: Feed, create post, posts, reels
  - ProfilePage: Header, bio, friends, posts
  - ChatPage: Conversations, messages, input
  - SettingsPage: All setting sections
  - ReelsPage: Video player, controls, info
- **Acceptance Criteria:**
  - All text readable (4.5:1 contrast minimum)
  - No white-on-white or black-on-black
  - No broken colors
  - Icons visible
  - Buttons clearly distinguishable
- **Result:** 🔴 PENDING

---

# GROUP-1: SAVED ITEMS IN SIDEBAR 📌

**Feature:** Add "Saved" menu item to sidebar, show saved posts/reels  
**Priority:** 🟡 MEDIUM  
**Estimated Time:** 3-4 hours  
**Components:** Sidebar, SavedItemsPage, Navigation  

---

## Group-1 Subtasks

### 1.1. Add "Saved" Menu Item to Sidebar
- **Task:** Add "Saved" item to sidebar menu navigation
  - Icon: Bookmark icon (from lucide-react)
  - Position: After "Memories" or suitable location
  - Link: Navigate to `/saved` route
  - Highlight when active
- **File:** `frontend/Facebook_Frontend/src/components/Layout/Sidebar.jsx`
- **Code Pattern:**
  ```jsx
  <Link to="/saved" className={isActive ? 'menu-item active' : 'menu-item'}>
    <Bookmark size={24} />
    <span>Đã lưu</span>
  </Link>
  ```
- **Result:** 🔴 PENDING

### 1.2. Create SavedItemsPage Component
- **Task:** Create new page component for viewing saved items
- **File:** `frontend/Facebook_Frontend/src/pages/SavedItems/SavedItemsPage.jsx`
- **Structure:**
  - Header: "Đã lưu" title
  - Tabs: Posts / Reels (toggle between types)
  - Content area: Grid/list of saved items
  - Empty state: "Chưa có bài viết nào được lưu"
- **Props/Hooks:** Use `useAuth()` for userId
- **Result:** 🔴 PENDING

### 1.3. Create SavedItemsService (API)
- **Task:** Create API service to fetch saved items
- **File:** `frontend/Facebook_Frontend/src/services/savedItemsService.js`
- **Methods:**
  - `getSavedPosts(userId, page, limit)` → Returns { items, pagination }
  - `getSavedReels(userId, page, limit)` → Returns { items, pagination }
  - `removeSavedPost(postId)` → Remove from saved
  - `removeSavedReel(reelId)` → Remove from saved
- **API Endpoint:** Call backend `/api/v1/posts/saved` (already created)
- **Result:** 🔴 PENDING

### 1.4. Implement SavedItemsPage UI - Posts Tab
- **Task:** Build posts section in SavedItemsPage
- **Features:**
  - Display saved posts in feed layout
  - Use existing PostItem component
  - Pagination support (load more / infinite scroll)
  - Remove button or unsave on interaction
- **Component:** `PostItem.jsx` (reuse existing)
- **Result:** 🔴 PENDING

### 1.5. Implement SavedItemsPage UI - Reels Tab
- **Task:** Build reels section in SavedItemsPage
- **Features:**
  - Display saved reels in grid/carousel
  - Thumbnail preview with play icon
  - Click to play reel detail
  - Remove from saved button
- **Note:** Create new `SavedReelItem.jsx` if needed
- **Result:** 🔴 PENDING

### 1.6. Add Tab Switching Logic
- **Task:** Implement Posts/Reels tab toggle with state management
  - Tab state in SavedItemsPage
  - Fetch data based on active tab
  - Loading states for each tab
  - Error handling
- **Result:** 🔴 PENDING

### 1.7. Add Route to App Router
- **Task:** Register `/saved` route in App.jsx
- **File:** `frontend/Facebook_Frontend/src/App.jsx`
- **Route:**
  ```jsx
  <Route path="/saved" element={<SavedItemsPage />} />
  ```
- **Protection:** Must be logged in (check in component)
- **Result:** 🔴 PENDING

### 1.8. Test Saved Items Navigation
- **Task:** Manual testing
  - Click "Đã lưu" in sidebar → navigate to page
  - Posts tab shows saved posts
  - Reels tab shows saved reels
  - Pagination works
  - Remove saved works correctly
  - Empty state shows when no items
- **Result:** 🔴 PENDING

---

# GROUP-2: POST DELETE WITH UNDO 🔄

**Feature:** Show undo toast when deleting post, allow undo within 10 seconds  
**Priority:** 🔴 HIGH  
**Estimated Time:** 3-4 hours  
**Components:** PostItem, DeleteUndoUI, Toast  

---

## Group-2 Subtasks

### 2.1. Create DeleteUndoUI Component
- **Task:** Build UI component for showing deletion confirmation with undo option
- **File:** `frontend/Facebook_Frontend/src/components/post/DeleteUndoUI.jsx`
- **Features:**
  - Message: "Bài viết đã được ẩn"
  - Show: "Báo cáo" button, "Hoàn tác" button, close button
  - Auto-hide after 10 seconds
  - Inline replacement for the deleted post
- **Styling:** Use `DeleteUndoUI.css`
- **Props:**
  - `postId`: string
  - `onUndo`: callback function
  - `onReport`: callback function
  - `onDismiss`: callback function
- **Result:** 🔴 PENDING

### 2.2. Create DeleteUndoUI Styling
- **Task:** Style the undo UI component
- **File:** `frontend/Facebook_Frontend/src/components/post/DeleteUndoUI.css`
- **Design:**
  - Gray background (#f0f2f5 light / #3d3d3d dark)
  - Clear message text
  - Action buttons: "Báo cáo" (red), "Hoàn tác" (blue), X (close)
  - Add dark mode support
  - Padding: 16px, min-height: 80px
- **Result:** 🔴 PENDING

### 2.3. Modify PostItem Delete Handler
- **Task:** Update post delete logic to support undo
  - On "Xóa bài viết" click from owner menu:
    - Mark post as "pending_deletion" in local state
    - Show DeleteUndoUI instead of post
    - Start 10-second timer
    - Call backend delete API when timer expires or user confirms
- **File:** `frontend/Facebook_Frontend/src/components/post/PostItem.jsx`
- **State Variables:**
  - `isDeletionPending`: boolean
  - `deletionTimeRemaining`: number (0-10)
  - `deletionTimer`: setInterval reference
- **Result:** 🔴 PENDING

### 2.4. Implement Undo Logic
- **Task:** Handle undo action when user clicks "Hoàn tác"
  - Cancel deletion timer
  - Remove DeleteUndoUI
  - Restore post to normal view
  - No backend call needed
- **File:** `frontend/Facebook_Frontend/src/components/post/PostItem.jsx`
- **Code:**
  ```jsx
  const handleUndoDelete = () => {
    clearInterval(deletionTimer);
    setIsDeletionPending(false);
    setDeletionTimeRemaining(10);
    toast.success('Bài viết đã được khôi phục');
  };
  ```
- **Result:** 🔴 PENDING

### 2.5. Implement Report Action from Undo UI
- **Task:** When user clicks "Báo cáo" from DeleteUndoUI
  - Open ReportPostModal (already exists)
  - Cancel deletion timer (post stays visible during report)
  - Submit report, then proceed with deletion or cancel
- **File:** `frontend/Facebook_Frontend/src/components/post/PostItem.jsx`
- **Integration:** Use existing `ReportPostModal.jsx`
- **Result:** 🔴 PENDING

### 2.6. Implement Deletion Timer
- **Task:** Countdown timer that triggers actual deletion after 10 seconds
  - Display timer in UI: "Hoàn tác trong X giây"
  - Update every 1 second
  - When timer reaches 0:
    - Call `postService.deletePost(postId)`
    - Show success toast
    - Remove post from feed via `onPostUpdated()` callback
    - Clean up timer
- **File:** `frontend/Facebook_Frontend/src/components/post/PostItem.jsx`
- **Code Pattern:**
  ```jsx
  useEffect(() => {
    if (isDeletionPending && deletionTimeRemaining > 0) {
      const timer = setTimeout(() => {
        setDeletionTimeRemaining(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
    if (deletionTimeRemaining === 0 && isDeletionPending) {
      // Call delete API
      confirmDelete();
    }
  }, [isDeletionPending, deletionTimeRemaining]);
  ```
- **Result:** 🔴 PENDING

### 2.7. Handle Close Button in DeleteUndoUI
- **Task:** When user clicks X button to dismiss DeleteUndoUI
  - Cancel deletion timer
  - Permanently delete post (call API immediately)
  - Show success toast
  - Remove from feed
- **Note:** Different from undo - this confirms deletion
- **File:** `frontend/Facebook_Frontend/src/components/post/PostItem.jsx`
- **Result:** 🔴 PENDING

### 2.8. Add Dark Mode to DeleteUndoUI
- **Task:** Ensure DeleteUndoUI looks good in dark mode
  - Background, text colors
  - Button colors/hover states
  - Icons visibility
- **File:** `frontend/Facebook_Frontend/src/components/post/DeleteUndoUI.css`
- **Result:** 🔴 PENDING

### 2.9. Test Delete with Undo Flow
- **Task:** Manual testing all scenarios
  - **Scenario 1:** Delete → Undo (post should restore)
  - **Scenario 2:** Delete → Wait 10s (post should delete automatically)
  - **Scenario 3:** Delete → Report (report UI appears, post stays)
  - **Scenario 4:** Delete → X (dismiss, post deletes immediately)
  - **Scenario 5:** Delete → Close tab before undo expires (post deletes on next session)
- **Acceptance Criteria:**
  - Timer + button text clearly visible
  - All actions work as expected
  - Dark mode displays correctly
  - No bugs or race conditions
- **Result:** 🔴 PENDING

---

# PHASE 5 EXECUTION PLAN

## 📋 SESSION-1 EXECUTION PROMPT

Copy-paste this prompt to start SESSION-1:

```
# SESSION 1: Dark Mode Refinement + Saved Items Sidebar

## Tasks to Complete (Estimated: 4-5 hours)

You are implementing PHASE 5 of Facebook Clone with focus on UI/UX improvements.

### GROUP-0: Dark Mode UI Refinement (Tasks 0.1-0.6)
1. ✅ Analyze current dark mode colors and identify issues
2. ✅ Create comprehensive dark mode color palette
3. ✅ Update CSS variables in root[data-theme="dark"]
4. ✅ Refine navbar dark mode styling
5. ✅ Adjust cards, containers, forms for dark mode
6. ✅ Test dark mode across all pages

**Key Files to Update:**
- src/index.css (CSS variables)
- src/components/Layout/MainLayout.css
- src/pages/Home/HomePage.css
- src/components/post/PostItem.css
- src/components/post/CreatePostModal.css
- src/components/post/EditPostModal.css
- src/components/profile/ProfileSidebar.css
- All other component CSS files

**Color Reference:**
- Background: #f0f2f5 → #18191a
- Card: #fff → #262626
- Secondary: #f0f2f5 → #3d3d3d
- Text Primary: #050505 → #e4e6eb
- Text Secondary: #65676b → #b0b3b9
- Border: #ced0d4 → #3d3d3d

**Acceptance Criteria:**
- All text readable (4.5:1 contrast minimum)
- Dark mode consistent across all pages
- No white-on-white or black-on-black
- Buttons clearly distinguishable
- Build succeeds with 0 errors

### GROUP-1: Saved Items Sidebar (Tasks 1.1-1.8)
1. ✅ Add "Saved" menu item to sidebar
2. ✅ Create SavedItemsPage component
3. ✅ Create savedItemsService API client
4. ✅ Implement posts tab UI with PostItem
5. ✅ Implement reels tab UI
6. ✅ Add tab switching logic
7. ✅ Register /saved route in App.jsx
8. ✅ Test saved items navigation

**Key Files to Create:**
- src/pages/SavedItems/SavedItemsPage.jsx
- src/pages/SavedItems/SavedItemsPage.css
- src/services/savedItemsService.js

**Key Files to Modify:**
- src/components/Layout/Sidebar.jsx (add menu item)
- src/App.jsx (add route)

**Acceptance Criteria:**
- "Đã lưu" menu item appears in sidebar
- Click navigates to /saved route
- SavedItemsPage displays saved posts on Posts tab
- SavedItemsPage displays saved reels on Reels tab
- Pagination works correctly
- Empty state shows when no saved items
- Dark mode fully supported
- Build succeeds with 0 errors

**Testing Checklist:**
- [ ] Saved menu item visible in sidebar
- [ ] Navigation to /saved works
- [ ] Posts tab loads saved posts correctly
- [ ] Reels tab loads saved reels correctly
- [ ] Tab switching works smoothly
- [ ] Pagination/load more works
- [ ] Remove saved button works
- [ ] Empty state displays properly
- [ ] Dark mode applied everywhere
- [ ] No console errors

**When Complete:**
1. Run: npm run build (verify 0 errors)
2. Test all 3 major flows
3. Commit: git add -A && git commit -m "feat: SESSION-1 - Dark mode refinement + Saved items sidebar (14/23 ✅)"
4. Push: git push origin main
```

---

## 📋 SESSION-2 EXECUTION PROMPT

Copy-paste this prompt to start SESSION-2:

```
# SESSION 2: Post Delete with Undo

## Tasks to Complete (Estimated: 3-4 hours)

You are implementing the final part of PHASE 5: Post deletion with undo functionality.

### GROUP-2: Post Delete with Undo (Tasks 2.1-2.9)
1. ✅ Create DeleteUndoUI component
2. ✅ Create DeleteUndoUI CSS styling
3. ✅ Modify PostItem delete handler for undo support
4. ✅ Implement undo logic
5. ✅ Implement report action from undo UI
6. ✅ Implement 10-second deletion timer
7. ✅ Handle dismiss (X button) - immediate delete
8. ✅ Add dark mode support to DeleteUndoUI
9. ✅ Test all delete/undo scenarios

**Key Files to Create:**
- src/components/post/DeleteUndoUI.jsx
- src/components/post/DeleteUndoUI.css

**Key Files to Modify:**
- src/components/post/PostItem.jsx (integrate delete undo)

**Flow Documentation:**

1. **User clicks "Xóa bài viết" from post menu:**
   - PostItem state: isDeletionPending = true
   - Display DeleteUndoUI instead of PostItem
   - Start 10-second countdown timer
   - Show: "Bài viết đã được ẩn. Báo cáo | Hoàn tác | X"

2. **User clicks "Hoàn tác" (within 10s):**
   - Cancel countdown timer
   - Set isDeletionPending = false
   - Remove DeleteUndoUI
   - Post restores to normal view
   - Toast: "Bài viết đã được khôi phục"
   - No API call

3. **User clicks "Báo cáo" (within 10s):**
   - Open ReportPostModal (existing component)
   - Cancel deletion timer
   - After report submit: resume timer or immediate delete
   - Post marked as reported

4. **User clicks "X" (dismiss) (within 10s):**
   - Confirm deletion immediately
   - Call DELETE /api/v1/posts/{postId}
   - Call onPostUpdated() callback
   - Post removed from feed
   - Toast: "Bài viết đã được xóa"

5. **Timer reaches 0 (after 10s):**
   - Call DELETE /api/v1/posts/{postId} automatically
   - Remove post from feed
   - DeleteUndoUI disappears
   - Post permanently deleted

**State Management:**
\`\`\`jsx
const [isDeletionPending, setIsDeletionPending] = useState(false);
const [deletionTimeRemaining, setDeletionTimeRemaining] = useState(10);
const deletionTimerRef = useRef(null);
\`\`\`

**Acceptance Criteria:**
- DeleteUndoUI displays when post is "deleted"
- Timer countdown shows remaining seconds
- Undo button restores post (no API call)
- Report button opens modal without deleting post
- X button confirms deletion immediately
- After 10s, post auto-deletes
- All actions work correctly
- Dark mode fully supported
- No console errors
- Component unmounts cleanly (cleanup timers)

**Testing Checklist:**
- [ ] Delete post → UI shows undo message + timer
- [ ] Undo button → Post restores, timer cancelled
- [ ] Report button → Modal opens, post visible during report
- [ ] X button → Post deletes immediately, removed from feed
- [ ] Wait 10s → Post auto-deletes, removes from feed
- [ ] Dark mode → DeleteUndoUI looks good
- [ ] Rapid clicks → No race conditions
- [ ] Tab switch → Timer continues (optional: pause on blur)
- [ ] Delete fails → Error toast, retry option
- [ ] Multiple posts → Independent timers for each

**Performance Notes:**
- Use useRef for timer to avoid re-renders
- Cleanup timers in useEffect return
- Optimize DeleteUndoUI re-renders (React.memo if needed)

**When Complete:**
1. Run: npm run build (verify 0 errors)
2. Test all 4 delete scenarios (undo, report, dismiss, timeout)
3. Commit: git add -A && git commit -m "feat: SESSION-2 - Post delete with undo (23/23 ✅ - PHASE 5 COMPLETE)"
4. Push: git push origin main
5. Update agent_workspace.md with all subtasks marked ✅
```

---

## 📌 OVERALL PROGRESS

| Session | Groups | Subtasks | Hours | Status |
|---------|--------|----------|-------|--------|
| SESSION-1 | GROUP-0, GROUP-1 | 0.1-1.8 (14 tasks) | 5h | ⏳ Next |
| SESSION-2 | GROUP-2 | 2.1-2.9 (9 tasks) | 4h | ⏳ Next |
| **TOTAL** | 3 groups | **23 tasks** | **9h** | **PHASE 5 READY** |

---

## 🚀 Quick Start

**To begin PHASE 5:**

1. Copy **SESSION-1 EXECUTION PROMPT** above
2. Paste in new chat message
3. Follow step-by-step for Group-0 and Group-1
4. When complete, move to SESSION-2
5. Copy **SESSION-2 EXECUTION PROMPT** for Group-2

**Key Success Factors:**
- ✅ Test each feature immediately after implementation
- ✅ Check dark mode on every component before moving on
- ✅ Use existing components (PostItem, ReportPostModal) when possible
- ✅ Build succeeds with 0 errors before moving to next group
- ✅ Update agent_workspace.md with ✅ marks as you complete subtasks

---

**Created:** April 3, 2026  
**Last Updated:** April 3, 2026  
**Total Estimated Duration:** 8-11 hours  
**Status:** 🔴 READY FOR EXECUTION
